/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../_adapters';

export interface RateLimitOptions { limit: number; windowSec: number }
export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (o: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, o);
const GLOBAL: RateLimitOptions = { limit: Number(process.env.RATE_LIMIT_GLOBAL ?? 300), windowSec: 60 };

/** Redis fixed-window limiter. Register with APP_GUARD for the global limit; add @RateLimit() per route. */
@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService, private readonly reflector: Reflector) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [ctx.getHandler(), ctx.getClass()]) ?? GLOBAL;
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const who = req.user?.id ?? req.ip;
    const route = req.routeOptions?.url ?? req.url;
    const bucket = Math.floor(Date.now() / 1000 / opts.windowSec);
    const key = `rl:${who}:${req.method}:${route}:${bucket}`;
    const n = await this.redis.client.incr(key);
    if (n === 1) await this.redis.client.expire(key, opts.windowSec + 1);
    res.header?.('X-RateLimit-Remaining', String(Math.max(0, opts.limit - n)));
    if (n > opts.limit) throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
