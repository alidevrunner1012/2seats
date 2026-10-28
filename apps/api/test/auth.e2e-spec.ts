import { execFileSync } from 'node:child_process';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookie from '@fastify/cookie';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { REFRESH_COOKIE } from '../src/auth/auth.constants';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

describe('authentication (e2e)', () => {
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
    process.env.GOOGLE_CLIENT_ID = '';
    process.env.GOOGLE_CLIENT_SECRET = '';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.MAIL_FROM = 'hello@2seats.local';
    process.env.RESEND_API_KEY = '';
    process.env.SMTP_HOST = '';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASSWORD = '';
    process.env.LIVEKIT_URL = 'http://localhost:7880';
    process.env.LIVEKIT_API_KEY = 'test-livekit-key';
    process.env.LIVEKIT_API_SECRET =
      'test-livekit-secret-of-at-least-32-characters';
    process.env.TURN_DOMAIN = 'turn.localhost';
    process.env.TURN_PUBLIC_IP = '127.0.0.1';

    execFileSync('corepack', ['pnpm', 'exec', 'prisma', 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(app.get(HttpExceptionFilter));
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 120_000);

  afterAll(async () => {
    if (app !== undefined) await app.close();
    if (redis !== undefined) await redis.stop();
    if (postgres !== undefined) await postgres.stop();
  });

  it('signs up, logs in, rotates a refresh token, and logs out', async () => {
    const server = app.getHttpAdapter().getInstance();
    const signup = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'movie-night@example.com',
        password: 'WarmMovieNight!2026',
        displayName: 'Sam',
      },
    });
    expect(signup.statusCode).toBe(201);
    expect(signup.json()).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(signup.body).toContain('"accessToken":"');
    expect(signup.body).not.toContain('"refreshToken"');

    const login = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'MOVIE-NIGHT@example.com',
        password: 'WarmMovieNight!2026',
      },
    });
    expect(login.statusCode).toBe(200);
    const loginCookie = cookieHeaders(login.headers['set-cookie']);
    const loginCookieHeader = loginCookie.find((value) =>
      value.startsWith(`${REFRESH_COOKIE}=`),
    );
    if (loginCookieHeader === undefined) {
      throw new Error('Refresh cookie was not set');
    }
    expect(loginCookieHeader).toContain('HttpOnly');
    expect(loginCookieHeader).toContain('Secure');
    expect(loginCookieHeader).toContain('SameSite=Strict');
    const loginToken = readRefreshToken(loginCookie);

    const refresh = await server.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `${REFRESH_COOKIE}=${loginToken}` },
    });
    expect(refresh.statusCode).toBe(200);
    const rotatedToken = readRefreshToken(refresh.headers['set-cookie']);
    expect(rotatedToken).not.toBe(loginToken);

    const logout = await server.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: `${REFRESH_COOKIE}=${rotatedToken}` },
    });
    expect(logout.statusCode).toBe(204);

    const afterLogout = await server.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `${REFRESH_COOKIE}=${rotatedToken}` },
    });
    expect(afterLogout.statusCode).toBe(401);

    const reused = await server.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `${REFRESH_COOKIE}=${loginToken}` },
    });
    expect(reused.statusCode).toBe(401);
  }, 30_000);

  it('locks sign-in after five incorrect passwords', async () => {
    const server = app.getHttpAdapter().getInstance();
    await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'lockout@example.com',
        password: 'WarmMovieNight!2026',
        displayName: 'Riley',
      },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'lockout@example.com',
          password: 'incorrect-password',
        },
      });
      expect(response.statusCode).toBe(401);
    }
    const locked = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'lockout@example.com',
        password: 'WarmMovieNight!2026',
      },
    });
    expect(locked.statusCode).toBe(429);
  }, 30_000);

  it('updates, exports, and erases a user account', async () => {
    const server = app.getHttpAdapter().getInstance();
    const signup = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'privacy@example.com',
        password: 'WarmMovieNight!2026',
        displayName: 'Jordan',
      },
    });
    const accessToken = signup.body.match(/"accessToken":"([^"]+)"/u)?.[1];
    if (accessToken === undefined) {
      throw new Error('Signup response did not include an access token');
    }
    const authorization = { authorization: `Bearer ${accessToken}` };

    const update = await server.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: authorization,
      payload: { displayName: 'Jordan Rose', avatarUrl: null },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json()).toMatchObject({ displayName: 'Jordan Rose' });

    const exportResponse = await server.inject({
      method: 'GET',
      url: '/users/me/export',
      headers: authorization,
    });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json()).toMatchObject({
      user: { email: 'privacy@example.com', displayName: 'Jordan Rose' },
    });

    const deletion = await server.inject({
      method: 'DELETE',
      url: '/users/me',
      headers: authorization,
    });
    expect(deletion.statusCode).toBe(204);

    const afterDeletion = await server.inject({
      method: 'GET',
      url: '/auth/me',
      headers: authorization,
    });
    expect(afterDeletion.statusCode).toBe(401);
  }, 30_000);
});

function readRefreshToken(
  setCookieHeader: string | string[] | undefined,
): string {
  const values = cookieHeaders(setCookieHeader);
  const cookie = values.find((value) => value.startsWith(`${REFRESH_COOKIE}=`));
  const token = cookie?.match(new RegExp(`^${REFRESH_COOKIE}=([^;]+)`))?.[1];
  if (token === undefined) throw new Error('Refresh cookie was not set');
  return token;
}

function cookieHeaders(
  setCookieHeader: string | string[] | undefined,
): string[] {
  if (setCookieHeader === undefined) {
    throw new Error('Refresh cookie was not set');
  }
  return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
}
