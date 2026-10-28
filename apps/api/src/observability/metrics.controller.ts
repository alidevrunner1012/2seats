import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}
  @Get() @Header('Cache-Control', 'no-store')
  async scrape(@Headers('authorization') auth?: string) {
    const token = process.env.METRICS_TOKEN;
    if (token) { // when set, require `Authorization: Bearer <token>`; also restrict by NetworkPolicy/ingress
      const given = Buffer.from((auth ?? '').replace(/^Bearer /, ''));
      const want = Buffer.from(token);
      if (given.length !== want.length || !timingSafeEqual(given, want)) throw new UnauthorizedException();
    }
    return this.metrics.registry.metrics();
  }
}
