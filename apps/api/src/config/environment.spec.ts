import { validateEnvironment } from './environment';

const completeEnvironment = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGINS: 'http://localhost:3000,https://2seats.example',
  MINIO_ENDPOINT: 'http://localhost:9000',
  MINIO_ACCESS_KEY: 'access',
  MINIO_SECRET_KEY: 'secret',
  MINIO_BUCKET: 'uploads',
  JWT_ACCESS_SECRET: 'test-only-access-signing-secret-at-least-32',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  APP_URL: 'http://localhost:3000',
  MAIL_FROM: 'hello@2seats.local',
  RESEND_API_KEY: '',
  SMTP_HOST: '',
  SMTP_PORT: '587',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  LIVEKIT_URL: 'http://localhost:7880',
  LIVEKIT_API_KEY: 'devkey',
  LIVEKIT_API_SECRET: 'devsecret',
  TURN_DOMAIN: 'turn.localhost',
  TURN_PUBLIC_IP: '127.0.0.1',
};

describe('validateEnvironment', () => {
  it('parses and normalizes valid environment variables', () => {
    expect(validateEnvironment(completeEnvironment)).toEqual({
      ...completeEnvironment,
      PORT: 3001,
      SMTP_PORT: 587,
      CORS_ORIGINS: ['http://localhost:3000', 'https://2seats.example'],
    });
  });

  it('fails fast when required environment variables are missing', () => {
    expect(() => validateEnvironment({})).toThrow();
  });

  it('rejects malformed URLs and ports', () => {
    expect(() =>
      validateEnvironment({
        ...completeEnvironment,
        DATABASE_URL: 'not-a-url',
        PORT: '70000',
      }),
    ).toThrow();
  });

  it('requires a configured mail provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...completeEnvironment,
        NODE_ENV: 'production',
      }),
    ).toThrow();
  });

  it('rejects the example access-token key in production', () => {
    expect(() =>
      validateEnvironment({
        ...completeEnvironment,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'dev-only-change-this-access-signing-key-2seats',
        RESEND_API_KEY: 'resend-test-key',
      }),
    ).toThrow();
  });

  it('requires both Google OAuth credentials together', () => {
    expect(() =>
      validateEnvironment({
        ...completeEnvironment,
        GOOGLE_CLIENT_ID: 'client-id',
      }),
    ).toThrow();
  });
});
