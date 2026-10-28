import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import { ChatGateway } from './chat.gateway';
import type { ChatService } from './chat.service';

function setup() {
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const h: Record<string, string> = {};
  const redis = {
    client: {
      hset: jest.fn((_key: string, field: string, value: string) => {
        h[field] = value;
      }),
      hvals: jest.fn(() => Object.values(h)),
      hdel: jest.fn((_key: string, field: string) => {
        delete h[field];
      }),
      expire: jest.fn(),
    },
  };
  const gateway = new ChatGateway(
    { verifyAsync: jest.fn() } as never,
    { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService<never, true>,
    {
      roomMember: { findFirst: jest.fn().mockResolvedValue({ id: 'member' }) },
      room: { findFirst: jest.fn().mockResolvedValue({ chatEnabled: true }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.test', displayName: 'Avery', avatarUrl: null }) },
    } as unknown as PrismaService,
    redis as unknown as RedisService,
    { send: jest.fn().mockResolvedValue({ id: 'message-1' }) } as unknown as ChatService,
    { state: jest.fn().mockResolvedValue({ mode: 'player', source: null, status: 'paused', position: 0, rate: 1, updatedAt: 0, version: 0 }), maybeRecordOnLastLeave: jest.fn().mockResolvedValue(false) } as never,
  );
  gateway.server = {
    to: jest.fn(() => ({ emit: (event: string, payload: unknown) => emitted.push({ event, payload }) })),
  } as never;
  return { gateway, redis, emitted };
}

function socket() {
  return {
    data: {
      user: { id: 'user-1', email: 'a@b.test', displayName: 'Avery', avatarUrl: null },
      roomIds: new Set(['room-1']),
      rateLimits: new Map(),
    },
  } as never;
}

describe('ChatGateway', () => {
  it('limits chat to five messages per second per socket', async () => {
    const { gateway } = setup();
    const current = socket();
    const ack = jest.fn();
    for (let index = 0; index < 6; index += 1) {
      await gateway.send(current, { roomId: 'room-1', content: `hello ${index}` }, ack);
    }
    expect(ack).toHaveBeenLastCalledWith({ ok: false, error: 'Chat rate limit exceeded' });
  });

  it('emits hands joined when two presses are within one second', async () => {
    const { gateway, emitted } = setup();
    const first = socket();
    const second = socket();
    (second as { data: { user: { id: string } } }).data.user.id = 'user-2';
    await gateway.handPress(first, { roomId: 'room-1' });
    await gateway.handPress(second, { roomId: 'room-1' });
    expect(emitted.some((event) => event.event === 'reaction:hands-joined')).toBe(true);
  });

  it('emits heartbeat sync for two hearts inside the one-second window', async () => {
    const { gateway, emitted } = setup();
    const first = socket();
    const second = socket();
    (second as { data: { user: { id: string } } }).data.user.id = 'user-2';
    await gateway.reaction(first, { roomId: 'room-1', reaction: 'heart' });
    await gateway.reaction(second, { roomId: 'room-1', reaction: 'heart' });
    expect(emitted.some((event) => event.event === 'reaction:heartbeat-sync')).toBe(true);
  });
});
