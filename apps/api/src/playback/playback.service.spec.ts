import { applyAtomicMutation, PlaybackService } from './playback.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import type { PlaybackState } from './playback.types';

const state: PlaybackState = {
  mode: 'player',
  source: { type: 'url', url: 'https://cdn.example.test/movie.mp4', title: 'A Film' },
  status: 'paused',
  position: 10,
  rate: 1,
  updatedAt: 100,
  version: 3,
};

describe('playback atomic mutation', () => {
  it('increments the version for a valid play mutation', () => {
    expect(applyAtomicMutation(state, 3, { status: 'playing' }, 200)).toMatchObject({
      status: 'playing',
      version: 4,
      updatedAt: 200,
    });

  });

  it('rejects concurrent mutations based on the stale version', () => {
    expect(applyAtomicMutation(state, 2, { position: 20 }, 200)).toBeNull();
    expect(applyAtomicMutation(state, 3, { position: 20 }, 200)?.position).toBe(20);
  });

  it('preserves independent state while changing seek and rate', () => {
    const sought = applyAtomicMutation(state, 3, { position: 120 }, 300);
    expect(sought).toMatchObject({ position: 120, rate: 1, version: 4 });
    const rerated = applyAtomicMutation(sought as PlaybackState, 4, { rate: 1.5 }, 400);
    expect(rerated).toMatchObject({ position: 120, rate: 1.5, version: 5 });
  });
});

describe('playback watch history', () => {
  it('writes one completed movie with active participants', async () => {
    const stored = JSON.stringify({ ...state, startedAt: Date.now() - 600_000 });
    const prisma = {
      watchHistory: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'history-1' }),
      },
      roomMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]) },
    } as unknown as PrismaService;
    const redis = {
      client: {
        set: jest.fn(),
        get: jest.fn().mockResolvedValue(stored),
      },
    } as unknown as RedisService;
    const service = new PlaybackService(redis, prisma);

    await expect(service.recordEnded('room-1')).resolves.toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.watchHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({ roomId: 'room-1', title: 'A Film', participants: ['user-1', 'user-2'] }),
    }));
  });
});
