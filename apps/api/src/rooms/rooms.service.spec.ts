import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { RoomsService } from './rooms.service';

const user: AuthenticatedUser = {
  id: 'user-1',
  email: 'avery@example.com',
  displayName: 'Avery',
  avatarUrl: null,
  roles: ['user'],
};

function roomRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'room-1',
    name: 'Friday night',
    inviteCode: 'ABCD-EFGH',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    maxParticipants: 2,
    locked: false,
    members: [
      {
        role: 'HOST' as const,
        user: { id: user.id, displayName: user.displayName, avatarUrl: null },
      },
    ],
    watchHistory: [],
    ...overrides,
  };
}

function jwtMock() {
  return { signAsync: jest.fn(), verifyAsync: jest.fn() };
}

function queueMock() {
  return { add: jest.fn() };
}

function configMock() {
  return { get: jest.fn().mockReturnValue('test-secret') };
}

describe('RoomsService', () => {
  it('creates a room with the caller as host', async () => {
    const create = jest.fn().mockResolvedValue(roomRecord());
    const service = new RoomsService(
      { room: { create } } as unknown as PrismaService,
      jwtMock() as never,
      queueMock() as never,
      configMock() as never,
    );

    await expect(service.create(user, { name: ' Friday night ' })).resolves.toMatchObject({
      id: 'room-1',
      name: 'Friday night',
      role: 'HOST',
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('joins a room atomically from an invite code', async () => {
    const room = roomRecord();
    const tx = {
      $queryRaw: jest.fn(),
      room: { findFirst: jest.fn().mockResolvedValue(room) },
      roomMember: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      room: { findFirst: jest.fn().mockResolvedValue({ id: room.id }) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new RoomsService(
      prisma as unknown as PrismaService,
      jwtMock() as never,
      queueMock() as never,
      configMock() as never,
    );

    await expect(service.join(user, { invite: 'ABCD-EFGH' })).resolves.toMatchObject({
      id: 'room-1',
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.roomMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { roomId: 'room-1', userId: user.id, role: 'PARTICIPANT' },
      }),
    );
  });

  it('rejects an expired signed invite', async () => {
    const jwt = jwtMock();
    jwt.verifyAsync.mockRejectedValue(new Error('expired'));
    const service = new RoomsService(
      {} as PrismaService,
      jwt as never,
      queueMock() as never,
      configMock() as never,
    );

    await expect(service.joinByToken(user, 'expired-token')).rejects.toThrow(
      'expired or is invalid',
    );
  });

  it('allows only one concurrent join into the last room slot', async () => {
    const firstUser = { ...user, id: 'user-2', displayName: 'Sam' };
    const secondUser = { ...user, id: 'user-3', displayName: 'Riley' };
    const members: Array<{
      role: 'HOST' | 'PARTICIPANT';
      user: { id: string; displayName: string; avatarUrl: null };
    }> = [
      { role: 'HOST' as const, user: { id: user.id, displayName: user.displayName, avatarUrl: null } },
    ];
    const tx = {
      $queryRaw: jest.fn(),
      room: {
        findFirst: jest.fn().mockImplementation(() => ({
          ...roomRecord(),
          members: [...members],
        })),
      },
      roomMember: {
        upsert: jest.fn().mockImplementation((args: { create: { userId: string } }) => {
          members.push({
            role: 'PARTICIPANT',
            user: { id: args.create.userId, displayName: 'Guest', avatarUrl: null },
          });
        }),
      },
    };
    let transactionLock = Promise.resolve();
    const prisma = {
      room: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1' }) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
        const previous = transactionLock;
        let release!: () => void;
        transactionLock = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await callback(tx);
        } finally {
          release();
        }
      }),
    };
    const service = new RoomsService(
      prisma as unknown as PrismaService,
      jwtMock() as never,
      queueMock() as never,
      configMock() as never,
    );

    const results = await Promise.allSettled([
      service.join(firstUser, { invite: 'ABCD-EFGH' }),
      service.join(secondUser, { invite: 'ABCD-EFGH' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('returns the nearest upcoming date', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'date-2',
      roomId: 'room-2',
      scheduledFor: new Date('2026-11-02T18:00:00.000Z'),
      note: 'Earlier date',
    });
    const service = new RoomsService(
      { scheduledDate: { findFirst } } as unknown as PrismaService,
      jwtMock() as never,
      queueMock() as never,
      configMock() as never,
    );

    await expect(service.nextDate(user)).resolves.toMatchObject({
      id: 'date-2',
      roomId: 'room-2',
    });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { scheduledFor: 'asc' },
    }));
  });
});
