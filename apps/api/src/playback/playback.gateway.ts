import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { PlaybackService } from './playback.service';
import { playerMutationSchema, playerRateSchema, playerSeekSchema, playerSetSourceSchema, roomModeSchema } from '../../../../packages/shared/src/index';
import type { SocketAck } from '../../../../packages/shared/src/index';
import type { PlaybackState } from './playback.types';
import type { Socket } from 'socket.io';

type PlaybackSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, { user?: { id: string }; roomIds: Set<string> }>;

@WebSocketGateway({ namespace: '/socket', cors: { origin: true, credentials: true } })
export class PlaybackGateway {
  @WebSocketServer()
  server!: Server;
  constructor(private readonly playback: PlaybackService, private readonly prisma: PrismaService) {}

  @SubscribeMessage('time:ping')
  ping(@ConnectedSocket() _socket: PlaybackSocket, ack?: (value: { serverTime: number }) => void): void { ack?.({ serverTime: Date.now() }); }

  @SubscribeMessage('player:set-source')
  async setSource(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = playerSetSourceSchema.safeParse(body);
    if (!parsed.success) return this.fail(ack, 'Invalid source payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, { source: parsed.data.source, status: 'paused', position: 0, startedAt: Date.now() }, ack);
  }

  @SubscribeMessage('player:play')
  async playEvent(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = playerMutationSchema.safeParse(body);
    if (!parsed.success) return this.fail(ack, 'Invalid play payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, { status: 'playing', startedAt: (await this.playback.state(parsed.data.roomId)).startedAt ?? Date.now() }, ack);
  }

  @SubscribeMessage('player:pause')
  async pause(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> { await this.simple(socket, body, { status: 'paused' }, ack); }
  @SubscribeMessage('player:seek')
  async seek(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = playerSeekSchema.safeParse(body); if (!parsed.success) return this.fail(ack, 'Invalid seek payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, { position: parsed.data.position }, ack);
  }
  @SubscribeMessage('player:rate')
  async rate(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = playerRateSchema.safeParse(body); if (!parsed.success) return this.fail(ack, 'Invalid rate payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, { rate: parsed.data.rate }, ack);
  }
  @SubscribeMessage('player:ended')
  async ended(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = playerMutationSchema.safeParse(body); if (!parsed.success) return this.fail(ack, 'Invalid ended payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, { status: 'ended' }, ack);
    if (await this.playback.recordEnded(parsed.data.roomId)) this.server.to(`room:${parsed.data.roomId}`).emit('room:movie-ended', { roomId: parsed.data.roomId });
  }
  @SubscribeMessage('room:set-mode')
  async mode(@ConnectedSocket() socket: PlaybackSocket, @MessageBody() body: unknown, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = roomModeSchema.safeParse(body); if (!parsed.success) return this.fail(ack, 'Invalid mode payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, { mode: parsed.data.mode }, ack);
  }

  async sendState(roomId: string): Promise<void> {
    this.server.to(`room:${roomId}`).emit('player:state', { ...(await this.playback.state(roomId)), serverTime: Date.now() });
  }
  private async simple(socket: PlaybackSocket, body: unknown, patch: Partial<PlaybackState>, ack?: (value: SocketAck) => void): Promise<void> {
    const parsed = playerMutationSchema.safeParse(body); if (!parsed.success) return this.fail(ack, 'Invalid player payload');
    await this.play(socket, parsed.data.roomId, parsed.data.baseVersion, patch, ack);
  }
  private async play(socket: PlaybackSocket, roomId: string, baseVersion: number, patch: Partial<PlaybackState>, ack?: (value: SocketAck) => void): Promise<void> {
    if (socket.data.user === undefined || !socket.data.roomIds.has(roomId)) return this.fail(ack, 'Room membership is required');
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { everyoneCanControl: true } });
    if (room === null) return this.fail(ack, 'Room not found');
    try {
      if (patch.source !== undefined && patch.source !== null) await this.playback.validateSource(patch.source);
      const state = await this.playback.mutate(roomId, socket.data.user.id, baseVersion, patch, room.everyoneCanControl);
      this.server.to(`room:${roomId}`).emit('player:state', { ...state, serverTime: Date.now() });
      ack?.({ ok: true });
    } catch (error) {
      this.fail(ack, error instanceof Error ? error.message : 'Playback mutation failed');
    }
  }
  private fail(ack: ((value: SocketAck) => void) | undefined, error: string): void { ack?.({ ok: false, error }); }
}
