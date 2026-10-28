import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { MAIL_QUEUE } from './mail.types';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => {
        const redis = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: redis.hostname,
            port: Number(redis.port || 6379),
            username: redis.username
              ? decodeURIComponent(redis.username)
              : undefined,
            password: redis.password
              ? decodeURIComponent(redis.password)
              : undefined,
            db: redis.pathname.length > 1 ? Number(redis.pathname.slice(1)) : 0,
            ...(redis.protocol === 'rediss:' ? { tls: {} } : {}),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  providers: [MailProcessor, MailService],
  exports: [MailService, BullModule],
})
export class MailModule {}
