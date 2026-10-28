import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

describe('health endpoints (e2e)', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    redis = await new RedisContainer('redis:7-alpine').start();

    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = redis.getConnectionUrl();
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    process.env.MINIO_ENDPOINT = 'http://localhost:9000';
    process.env.MINIO_ACCESS_KEY = 'test-access';
    process.env.MINIO_SECRET_KEY = 'test-secret';
    process.env.MINIO_BUCKET = 'test-uploads';
    process.env.JWT_ACCESS_SECRET =
      'test-only-access-signing-secret-of-at-least-32-characters';
    process.env.LIVEKIT_URL = 'http://localhost:7880';
    process.env.LIVEKIT_API_KEY = 'test-livekit-key';
    process.env.LIVEKIT_API_SECRET =
      'test-livekit-secret-of-at-least-32-characters';
    process.env.TURN_DOMAIN = 'turn.localhost';
    process.env.TURN_PUBLIC_IP = '127.0.0.1';

    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 120_000);

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
    if (redis !== undefined) {
      await redis.stop();
    }
    if (postgres !== undefined) {
      await postgres.stop();
    }
  });

  it('returns healthy from /health', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('returns ready when PostgreSQL and Redis are reachable', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
  });
});
