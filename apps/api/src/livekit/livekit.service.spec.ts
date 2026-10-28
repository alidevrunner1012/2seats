import { TokenVerifier } from 'livekit-server-sdk';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import type { ChatService } from '../chat/chat.service';
import type { ChatGateway } from '../chat/chat.gateway';
import { LiveKitService } from './livekit.service';

function setup(screenShareEnabled = true) {
  const values: Record<string, string> = {
    LIVEKIT_URL: 'http://localhost:7880',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
  };
  const config = {
    get: jest.fn((key: string) => values[key] ?? 'test-value'),
  } as unknown as ConfigService<never, true>;
  const prisma = {
    room: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1', screenShareEnabled }) },
    user: { findFirst: jest.fn() },
    roomMember: { findFirst: jest.fn() },
  } as unknown as PrismaService;
  const redis = { client: { hset: jest.fn(), hdel: jest.fn(), expire: jest.fn() } } as unknown as RedisService;
  const chat = { system: jest.fn() } as unknown as ChatService;
  const gateway = { emitParticipants: jest.fn(), broadcast: jest.fn() } as unknown as ChatGateway;
  return { service: new LiveKitService(config, prisma, redis, chat, gateway), prisma };
}

describe('LiveKitService', () => {
  it('issues a ten-minute token with camera, microphone, and optional screenshare grants', async () => {
    const { service } = setup(true);
    const result = await service.token({
      id: 'user-1',
      email: 'avery@example.com',
      displayName: 'Avery',
      avatarUrl: null,
      roles: ['user'],
    }, 'room-1');
    const claims = await new TokenVerifier('test-key', 'test-secret').verify(result.token);
    expect(result.expiresIn).toBe(600);
    expect(claims.video?.room).toBe('room-1');
    expect(claims.video?.canPublishSources).toEqual(expect.arrayContaining(['camera', 'microphone', 'screen_share']));
  });

  it('omits screenshare when the room disables it', async () => {
    const { service } = setup(false);
    const result = await service.token({
      id: 'user-1',
      email: 'avery@example.com',
      displayName: 'Avery',
      avatarUrl: null,
      roles: ['user'],
    }, 'room-1');
    const claims = await new TokenVerifier('test-key', 'test-secret').verify(result.token);
    expect(claims.video?.canPublishSources).toEqual(['camera', 'microphone']);
  });

  it('rejects invalid webhook signatures', async () => {
    const { service } = setup();
    await expect(service.webhook('{}', 'invalid')).rejects.toThrow('Invalid LiveKit webhook signature');
  });
});
