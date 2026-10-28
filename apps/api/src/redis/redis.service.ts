import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Environment } from '../config/environment';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(configService: ConfigService<Environment, true>) {
    this.client = new Redis(configService.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
    } else if (this.client.status !== 'end') {
      this.client.disconnect();
    }
  }
}
