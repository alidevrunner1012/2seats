import { z } from 'zod';

const EnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(3001),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().url()).min(1)),
    MINIO_ENDPOINT: z.string().url(),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    MINIO_BUCKET: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    APP_URL: z.string().url().default('http://localhost:3000'),
    MAIL_FROM: z.string().email().default('hello@2seats.local'),
    RESEND_API_KEY: z.string().default(''),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
    LIVEKIT_URL: z.string().url(),
    LIVEKIT_API_KEY: z.string().min(1),
    LIVEKIT_API_SECRET: z.string().min(1),
    TURN_DOMAIN: z.string().min(1),
    TURN_PUBLIC_IP: z.string().min(1),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === 'production' &&
      environment.RESEND_API_KEY.length === 0 &&
      environment.SMTP_HOST.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Configure Resend or SMTP for production email delivery',
      });
    }
    if (
      environment.NODE_ENV === 'production' &&
      environment.JWT_ACCESS_SECRET ===
        'dev-only-change-this-access-signing-key-2seats'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'Replace the example signing key before production',
      });
    }
    if (
      (environment.GOOGLE_CLIENT_ID.length === 0) !==
      (environment.GOOGLE_CLIENT_SECRET.length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'Configure both Google OAuth credentials or neither',
      });
    }
    if (
      (environment.SMTP_USER.length === 0) !==
      (environment.SMTP_PASSWORD.length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_PASSWORD'],
        message: 'Configure both SMTP credentials or neither',
      });
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Environment {
  return EnvironmentSchema.parse(environment);
}
