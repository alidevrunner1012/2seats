import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import type { OnApplicationShutdown } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Namespace, Socket } from 'socket.io';
import type Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Environment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ChatService } from './chat.service';
import {
  chatSendSchema,
  chatDeleteSchema,
  chatReactSchema,
  chatTypingSchema,
  handPressSchema,
  reactionSendSchema,
  roomJoinSchema,
  settingsUpdateSchema,
  type ParticipantsEvent,
  type SocketAck,
} from '../../../../packages/shared/src/index';
import { RoomRole } from '@prisma/client';
import { PlaybackService } from '../playback/playback.service';

interface SocketUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SocketData {
  user?: SocketUser;
  roomIds: Set<string>;
  rateLimits: Map<string, number[]>;
}

type RoomSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

interface JwtPayload {
  sub: string;
  email: string;
}

@WebSocketGateway({
  namespace: '/socket',
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 64 * 1024,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnApplicationShutdown {
  @WebSocketServer()
  server!: Namespace;
  private publisher?: Redis;
  private subscriber?: Redis;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly chat: ChatService,
    private readonly playback: PlaybackService,
  ) {}

  async afterInit(server: Namespace): Promise<void> {
    this.server = server;
    this.publisher = this.redis.client.duplicate();
    this.subscriber = this.redis.client.duplicate();
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    server.server.adapter(createAdapter(this.publisher, this.subscriber));
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]);
  }

  async handleConnection(socket: RoomSocket): Promise<void> {
    socket.data.roomIds = new Set();
    socket.data.rateLimits = new Map();
    const token = this.tokenFromHandshake(socket);
    if (token === null) {
      socket.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, email: payload.email, deletedAt: null },
        select: { id: true, email: true, displayName: true, avatarUrl: true },
      });
      if (user === null) throw new Error('Account unavailable');
      socket.data.user = user;
    } catch {
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: RoomSocket): Promise<void> {
    const user = socket.data.user;
    if (user === undefined) return;
    for (const roomId of socket.data.roomIds) {
      await this.leavePresence(roomId, user.id);
      if (await this.playback.maybeRecordOnLastLeave(roomId)) {
        this.server.to(this.roomName(roomId)).emit('room:movie-ended', { roomId });
      }
    }
  }

  @SubscribeMessage('room:join')
  async join(
    @ConnectedSocket() socket: RoomSocket,
    @MessageBody() body: unknown,
    ack?: (response: SocketAck) => void,
  ): Promise<void> {
    const payload = roomJoinSchema.safeParse(body);
    if (!payload.success) return this.fail(ack, 'Invalid room join payload');
    const user = socket.data.user;
    if (user === undefined || !(await this.isMember(payload.data.roomId, user.id))) {
      return this.fail(ack, 'Room membership is required');
    }
    await socket.join(this.roomName(payload.data.roomId));
    socket.data.roomIds.add(payload.data.roomId);
    await this.addPresence(payload.data.roomId, user);
    const systemMessage = await this.chat.system(payload.data.roomId, user.id, `${user.displayName} joined the room`);
    this.server.to(this.roomName(payload.data.roomId)).emit('chat:message', systemMessage);
    this.server.to(this.roomName(payload.data.roomId)).emit('player:state', { ...(await this.playback.state(payload.data.roomId)), serverTime: Date.now() });
    this.ok(ack);
  }

  @SubscribeMessage('room:leave')
  async leave(
    @ConnectedSocket() socket: RoomSocket,
    @MessageBody() body: unknown,
    ack?: (response: SocketAck) => void,
  ): Promise<void> {
    const payload = roomJoinSchema.safeParse(body);
    const user = socket.data.user;
    if (!payload.success || user === undefined) return this.fail(ack, 'Invalid room leave payload');
    await socket.leave(this.roomName(payload.data.roomId));
    socket.data.roomIds.delete(payload.data.roomId);
    await this.leavePresence(payload.data.roomId, user.id);
    const movieEnded = await this.playback.maybeRecordOnLastLeave(payload.data.roomId);
    const systemMessage = await this.chat.system(payload.data.roomId, user.id, `${user.displayName} left the room`);
    this.server.to(this.roomName(payload.data.roomId)).emit('chat:message', systemMessage);
    if (movieEnded) this.server.to(this.roomName(payload.data.roomId)).emit('room:movie-ended', { roomId: payload.data.roomId });
    this.ok(ack);
  }

  @SubscribeMessage('presence:heartbeat')
  async heartbeat(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    const payload = roomJoinSchema.safeParse(body);
    const user = socket.data.user;
    if (!payload.success || user === undefined || !socket.data.roomIds.has(payload.data.roomId)) return this.fail(ack, 'Room membership is required');
    await this.addPresence(payload.data.roomId, user);
    this.ok(ack);
  }

  @SubscribeMessage('chat:send')
  async send(
    @ConnectedSocket() socket: RoomSocket,
    @MessageBody() body: unknown,
    ack?: (response: SocketAck) => void,
  ): Promise<void> {
    const payload = chatSendSchema.safeParse(body);
    if (!payload.success) return this.fail(ack, 'Invalid chat payload');
    if (!this.allowed(socket, payload.data.roomId, 'chat', 5)) return this.fail(ack, 'Chat rate limit exceeded');
    const user = socket.data.user;
    if (user === undefined || !(await this.isMember(payload.data.roomId, user.id))) return this.fail(ack, 'Room membership is required');
    const room = await this.prisma.room.findFirst({
      where: { id: payload.data.roomId, deletedAt: null },
      select: { chatEnabled: true },
    });
    if (room?.chatEnabled !== true) return this.fail(ack, 'Chat is disabled in this room');
    const message = await this.chat.send(payload.data.roomId, user.id, payload.data.content);
    this.server.to(this.roomName(payload.data.roomId)).emit('chat:message', message);
    this.ok(ack);
  }

  @SubscribeMessage('chat:typing')
  typing(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): void {
    const payload = chatTypingSchema.safeParse(body);
    if (!payload.success || !socket.data.roomIds.has(payload.data.roomId)) return this.fail(ack, 'Room membership is required');
    socket.to(this.roomName(payload.data.roomId)).emit('chat:typing', { userId: socket.data.user?.id, isTyping: payload.data.isTyping });
    this.ok(ack);
  }

  @SubscribeMessage('chat:delete')
  async deleteMessage(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    const payload = chatDeleteSchema.safeParse(body);
    const user = socket.data.user;
    if (!payload.success || user === undefined || !socket.data.roomIds.has(payload.data.roomId)) return this.fail(ack, 'Room membership is required');
    await this.chat.delete(payload.data.messageId, user.id);
    this.server.to(this.roomName(payload.data.roomId)).emit('chat:message-deleted', {
      roomId: payload.data.roomId,
      messageId: payload.data.messageId,
    });
    this.ok(ack);
  }

  @SubscribeMessage('reaction:send')
  async reaction(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    const payload = reactionSendSchema.safeParse(body);
    if (!payload.success) return this.fail(ack, 'Invalid reaction payload');
    if (!this.allowed(socket, payload.data.roomId, 'reaction', 10)) return this.fail(ack, 'Reaction rate limit exceeded');
    if (!socket.data.roomIds.has(payload.data.roomId)) return this.fail(ack, 'Room membership is required');
    this.server.to(this.roomName(payload.data.roomId)).emit('reaction:fly', { userId: socket.data.user?.id, reaction: payload.data.reaction });
    if (payload.data.reaction === 'heart') await this.windowReaction(payload.data.roomId, 'heartbeat', socket.data.user?.id ?? '');
    this.ok(ack);
  }

  @SubscribeMessage('reaction:react')
  async react(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    const payload = chatReactSchema.safeParse(body);
    const user = socket.data.user;
    if (!payload.success || user === undefined || !socket.data.roomIds.has(payload.data.roomId)) return this.fail(ack, 'Room membership is required');
    if (!this.allowed(socket, payload.data.roomId, 'reaction', 10)) return this.fail(ack, 'Reaction rate limit exceeded');
    await this.chat.react(payload.data.messageId, user.id, payload.data.emoji);
    this.server.to(this.roomName(payload.data.roomId)).emit('reaction:message', {
      messageId: payload.data.messageId,
      userId: user.id,
      emoji: payload.data.emoji,
    });
    this.ok(ack);
  }

  @SubscribeMessage('reaction:hand-press')
  async handPress(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    await this.handEvent(socket, body, true, ack);
  }

  @SubscribeMessage('reaction:hand-release')
  async handRelease(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    await this.handEvent(socket, body, false, ack);
  }

  @SubscribeMessage('host:update-settings')
  async settings(@ConnectedSocket() socket: RoomSocket, @MessageBody() body: unknown, ack?: (response: SocketAck) => void): Promise<void> {
    const payload = settingsUpdateSchema.safeParse(body);
    const user = socket.data.user;
    if (!payload.success || user === undefined) return this.fail(ack, 'Invalid settings payload');
    const member = await this.prisma.roomMember.findFirst({ where: { roomId: payload.data.roomId, userId: user.id, leftAt: null }, select: { role: true } });
    if (member?.role !== RoomRole.HOST) return this.fail(ack, 'Host access is required');
    await this.prisma.room.update({ where: { id: payload.data.roomId }, data: { everyoneCanControl: payload.data.everyoneCanControl, chatEnabled: payload.data.chatEnabled, screenShareEnabled: payload.data.screenShareEnabled } });
    await this.prisma.auditLog.create({ data: { actorId: user.id, action: 'ROOM_SETTINGS_UPDATED', entityType: 'Room', entityId: payload.data.roomId, metadata: { everyoneCanControl: payload.data.everyoneCanControl, chatEnabled: payload.data.chatEnabled, screenShareEnabled: payload.data.screenShareEnabled } } });
    this.server.to(this.roomName(payload.data.roomId)).emit('host:settings-updated', payload.data);
    this.ok(ack);
  }

  private async handEvent(socket: RoomSocket, body: unknown, pressed: boolean, ack?: (response: SocketAck) => void): Promise<void> {
    const payload = handPressSchema.safeParse(body);
    if (!payload.success || !socket.data.roomIds.has(payload.data.roomId)) return this.fail(ack, 'Room membership is required');
    const userId = socket.data.user?.id;
    if (userId === undefined) return this.fail(ack, 'Authentication is required');
    const key = `reaction:hand:${payload.data.roomId}`;
    if (!pressed) {
      await this.redis.client.hdel(key, userId);
      return this.ok(ack);
    }
    await this.redis.client.hset(key, userId, String(Date.now()));
    await this.redis.client.expire(key, 2);
    const values = await this.redis.client.hvals(key);
    if (values.length >= 2 && Math.max(...values.map(Number)) - Math.min(...values.map(Number)) <= 1_000) {
      this.server.to(this.roomName(payload.data.roomId)).emit('reaction:hands-joined', { roomId: payload.data.roomId });
    }
    this.ok(ack);
  }

  private async windowReaction(roomId: string, type: string, userId: string): Promise<void> {
    const key = `reaction:${type}:${roomId}`;
    await this.redis.client.hset(key, userId, String(Date.now()));
    await this.redis.client.expire(key, 2);
    const values = await this.redis.client.hvals(key);
    if (values.length >= 2 && Math.max(...values.map(Number)) - Math.min(...values.map(Number)) <= 1_000) {
      this.server.to(this.roomName(roomId)).emit('reaction:heartbeat-sync', { roomId });
    }
  }

  private async isMember(roomId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.roomMember.findFirst({ where: { roomId, userId, leftAt: null, room: { deletedAt: null } }, select: { id: true } });
    return member !== null;
  }

  private async addPresence(roomId: string, user: SocketUser): Promise<void> {
    const key = `presence:${roomId}`;
    await this.redis.client.hset(key, user.id, JSON.stringify(user));
    await this.redis.client.expire(key, 30);
    await this.emitParticipants(roomId);
  }

  private async leavePresence(roomId: string, userId: string): Promise<void> {
    const key = `presence:${roomId}`;
    await this.redis.client.hdel(key, userId);
    await this.emitParticipants(roomId);
  }

  async emitParticipants(roomId: string): Promise<void> {
    const values = await this.redis.client.hvals(`presence:${roomId}`);
    const participants: ParticipantsEvent['participants'] = [];
    for (const value of values) {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && 'id' in parsed && typeof parsed.id === 'string') {
        const participant = parsed as SocketUser;
        participants.push({ userId: participant.id, displayName: participant.displayName, avatarUrl: participant.avatarUrl });
      }
    }
    this.server.to(this.roomName(roomId)).emit('room:participants', { roomId, participants });
  }

  private allowed(socket: RoomSocket, roomId: string, bucket: string, max: number): boolean {
    if (!socket.data.roomIds.has(roomId)) return false;
    const now = Date.now();
    const timestamps = (socket.data.rateLimits.get(bucket) ?? []).filter((value) => now - value < 1_000);
    if (timestamps.length >= max) return false;
    timestamps.push(now);
    socket.data.rateLimits.set(bucket, timestamps);
    return true;
  }

  private tokenFromHandshake(socket: RoomSocket): string | null {
    const auth = socket.handshake.auth as { token?: unknown };
    if (typeof auth.token === 'string') return auth.token;
    const header = socket.handshake.headers.authorization;
    return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  }

  private roomName(roomId: string): string {
    return `room:${roomId}`;
  }

  private ok(ack?: (response: SocketAck) => void): void {
    ack?.({ ok: true });
  }

  private fail(ack: ((response: SocketAck) => void) | undefined, error: string): void {
    ack?.({ ok: false, error });
  }

  broadcast(roomId: string, event: string, payload: unknown): void {
    this.server.to(this.roomName(roomId)).emit(event, payload);
  }
}
