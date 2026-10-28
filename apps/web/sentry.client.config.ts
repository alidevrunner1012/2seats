import * as Sentry from '@sentry/nextjs';
import { env } from './src/lib/env';

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  enabled: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
});
