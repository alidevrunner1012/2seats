import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, TrackSource, WebhookReceiver } from 'livekit-server-sdk';
import type { Environment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import type { AuthenticatedUser } from '../auth/authenticated-user';

@Injectable()
export class LiveKitService {
  private readonly client: RoomServiceClient;
  private readonly receiver: WebhookReceiver;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly chat: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {
    const url = this.config.get('LIVEKIT_URL', { infer: true });
    this.apiKey = this.config.get('LIVEKIT_API_KEY', { infer: true });
    this.apiSecret = this.config.get('LIVEKIT_API_SECRET', { infer: true });
    this.client = new RoomServiceClient(url, this.apiKey, this.apiSecret);
    this.receiver = new WebhookReceiver(this.apiKey, this.apiSecret);
  }

  async token(user: AuthenticatedUser, roomId: string): Promise<{ token: string; url: string; expiresIn: number }> {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null, members: { some: { userId: user.id, leftAt: null } } },
      select: { id: true, screenShareEnabled: true },
    });
    if (room === null) throw new ForbiddenException('An active room membership is required.');

    const sources = [TrackSource.CAMERA, TrackSource.MICROPHONE];
    if (room.screenShareEnabled) sources.push(TrackSource.SCREEN_SHARE);
    const accessToken = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user.id,
      name: user.displayName,
      metadata: JSON.stringify({ displayName: user.displayName, avatarUrl: user.avatarUrl }),
      ttl: '10m',
    });
    accessToken.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishSources: sources,
    });
    return {
      token: await accessToken.toJwt(),
      url: this.config.get('LIVEKIT_URL', { infer: true }),
      expiresIn: 600,
    };
  }

  async webhook(body: string, authorization: string | undefined): Promise<void> {
    if (authorization === undefined) throw new UnauthorizedException('LiveKit webhook authorization is required.');
    let event;
    try {
      event = await this.receiver.receive(body, authorization);
    } catch {
      throw new UnauthorizedException('Invalid LiveKit webhook signature.');
    }
    const roomId = event.room?.name;
    const participant = event.participant;
    if (roomId === undefined || participant === undefined) return;
    const user = await this.prisma.user.findFirst({
      where: { id: participant.identity, deletedAt: null },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    if (user === null) return;
    const membership = await this.prisma.roomMember.findFirst({
      where: { roomId, userId: user.id, leftAt: null },
      select: { id: true },
    });
    if (membership === null) return;
    if (event.event === 'participant_joined') {
      await this.redis.client.hset(`presence:${roomId}`, user.id, JSON.stringify(user));
      await this.redis.client.expire(`presence:${roomId}`, 30);
      await this.chatGateway.emitParticipants(roomId);
      await this.emitSystem(roomId, user.id, `${user.displayName} joined the video room`);
    } else if (event.event === 'participant_left' || event.event === 'participant_connection_aborted') {
      await this.redis.client.hdel(`presence:${roomId}`, user.id);
      await this.chatGateway.emitParticipants(roomId);
      await this.emitSystem(roomId, user.id, `${user.displayName} left the video room`);
    } else if (event.event === 'track_published') {
      const trackName = event.track?.name || 'a media track';
      await this.emitSystem(roomId, user.id, `${user.displayName} shared ${trackName}`);
    }
  }

  async muteParticipant(roomId: string, identity: string, trackSid: string, muted: boolean): Promise<void> {
    await this.client.mutePublishedTrack(roomId, identity, trackSid, muted);
  }

  async removeParticipant(roomId: string, identity: string): Promise<void> {
    await this.client.removeParticipant(roomId, identity);
  }

  private async emitSystem(roomId: string, senderId: string, content: string): Promise<void> {
    const message = await this.chat.system(roomId, senderId, content);
    this.chatGateway.broadcast(roomId, 'chat:message', message);
  }
}
