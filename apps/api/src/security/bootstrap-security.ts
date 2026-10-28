import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

/** Call right after NestFactory.create. Also construct the adapter with `new FastifyAdapter({ bodyLimit: 1_048_576, trustProxy: true })`. */
export async function bootstrapSecurity(app: NestFastifyApplication) {
  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  const origins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'], maxAge: 600 });
  app.enableShutdownHooks();
}
