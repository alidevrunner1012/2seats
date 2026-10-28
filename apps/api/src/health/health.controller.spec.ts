import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  const prisma = {
    $queryRaw: jest.fn<Promise<unknown>, []>(),
  };
  const redis = {
    client: {
      ping: jest.fn<Promise<string>, []>(),
    },
  };
  const controller = new HealthController(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue(1);
    redis.client.ping.mockResolvedValue('PONG');
  });

  it('returns a liveness response without consulting dependencies', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(redis.client.ping).not.toHaveBeenCalled();
  });

  it('reports ready after both dependencies respond', async () => {
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(redis.client.ping).toHaveBeenCalledTimes(1);
  });

  it('returns a service-unavailable error when either dependency fails', async () => {
    redis.client.ping.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
