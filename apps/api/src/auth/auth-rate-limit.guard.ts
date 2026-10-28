import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const route = request.routeOptions.url ?? request.url.split('?')[0];
    const address = request.ip || 'unknown';
    const identity = createHash('sha256')
      .update(`${address}:${route}`)
      .digest('hex');
    const key = `auth:rate:${identity}`;
    const count = await this.redis.client.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60); end; return n",
      1,
      key,
    );
    if (Number(count) > 30) {
      throw new HttpException(
        'Please wait before trying again',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
