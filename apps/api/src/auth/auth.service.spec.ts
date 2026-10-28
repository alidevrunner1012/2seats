import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Prisma, User } from '@prisma/client';
import argon2 from 'argon2';
import type { Environment } from '../config/environment';
import type { MailService } from '../mail/mail.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import type { MinioService } from '../storage/minio.service';
import { AuthService } from './auth.service';

const user: User = {
  id: 'user-1',
  email: 'date@example.com',
  displayName: 'Avery',
  passwordHash: '$argon2id$test',
  avatarUrl: null,
  emailVerifiedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createService(
  overrides: {
    prisma?: Partial<PrismaService>;
    redis?: Partial<RedisService>;
  } = {},
): {
  service: AuthService;
  prisma: PrismaService;
  redis: RedisService;
  transaction: {
    refreshToken: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };
  createdInputs: unknown[];
} {
  const createdInputs: unknown[] = [];
  const transaction = {
    refreshToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn((input: unknown) => {
        createdInputs.push(input);
        return Promise.resolve({});
      }),
    },
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(
      async (
        callback: (client: Prisma.TransactionClient) => Promise<unknown>,
      ) => callback(transaction as unknown as Prisma.TransactionClient),
    ),
    ...overrides.prisma,
  } as unknown as PrismaService;
  const redis = {
    client: {
      exists: jest.fn().mockResolvedValue(0),
      eval: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
    },
    ...overrides.redis,
  } as unknown as RedisService;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-access-token'),
  } as unknown as JwtService;
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-signing-secret';
      if (key === 'GOOGLE_CLIENT_ID') return '';
      if (key === 'GOOGLE_CLIENT_SECRET') return '';
      if (key === 'CORS_ORIGINS') return ['http://localhost:3000'];
      if (key === 'APP_URL') return 'http://localhost:3000';
      return '';
    }),
  } as unknown as ConfigService<Environment, true>;
  const mail = {
    sendAccountEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
  const minio = {
    resolveAvatarUrl: jest.fn((avatarUrl: string | null) =>
      Promise.resolve(avatarUrl),
    ),
  } as unknown as MinioService;
  return {
    service: new AuthService(prisma, redis, jwt, config, mail, minio),
    prisma,
    redis,
    transaction,
    createdInputs,
  };
}

describe('AuthService refresh-token rotation', () => {
  it('revokes the old token and creates a token in the same family', async () => {
    const { service, transaction, createdInputs } = createService();
    transaction.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: user.id,
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user,
    });

    const session = await service.refresh('old-refresh-token');

    expect(transaction.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(createdInputs[0]).toMatchObject({
      data: { userId: user.id, familyId: 'family-1' },
    });
    expect(session.refreshToken).not.toBe('old-refresh-token');
    expect(session.accessToken).toBe('signed-access-token');
  });

  it('revokes the token family and rejects refresh-token reuse', async () => {
    const { service, transaction, createdInputs } = createService();
    transaction.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: user.id,
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      user,
    });

    await expect(
      service.refresh('replayed-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(createdInputs).toHaveLength(0);
  });
});

describe('AuthService login lockout', () => {
  it('locks the email and address after five failed passwords', async () => {
    const { service, redis } = createService();
    let failures = 0;
    const client = redis.client as unknown as {
      exists: jest.Mock;
      eval: jest.Mock;
      set: jest.Mock;
    };
    let locked = false;
    client.exists.mockImplementation(() => Promise.resolve(locked ? 1 : 0));
    client.eval.mockImplementation(() => Promise.resolve(++failures));
    client.set.mockImplementation(() => {
      locked = true;
      return Promise.resolve('OK');
    });
    const verify = jest.spyOn(argon2, 'verify').mockResolvedValue(false);
    const credentials = { email: user.email, password: 'incorrect-password' };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login(credentials, '127.0.0.1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    expect(client.set).toHaveBeenCalledWith(
      expect.stringContaining('auth:login:lock:'),
      '1',
      'EX',
      900,
    );
    await expect(
      service.login(credentials, '127.0.0.1'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(verify).toHaveBeenCalledTimes(5);
    verify.mockRestore();
  });
});
