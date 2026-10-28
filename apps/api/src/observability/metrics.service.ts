import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds', help: 'HTTP latency', labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2.5], registers: [this.registry],
  });
  readonly socketEventDuration = new Histogram({
    name: 'socket_event_duration_seconds', help: 'Socket handler latency', labelNames: ['event', 'ok'],
    buckets: [0.001, 0.005, 0.02, 0.05, 0.1, 0.15, 0.3, 1], registers: [this.registry],
  });
  readonly socketConnections = new Gauge({ name: 'socket_connections', help: 'Open sockets', registers: [this.registry] });
  readonly activeRooms = new Gauge({ name: 'active_rooms', help: 'Rooms with >=1 member online', registers: [this.registry] });
  readonly socketErrors = new Counter({ name: 'socket_errors_total', help: 'Rejected socket events', labelNames: ['event', 'reason'], registers: [this.registry] });

  constructor() { collectDefaultMetrics({ register: this.registry }); }

  /** Wrap a socket handler: `return this.metrics.timeEvent('chat:send', () => ...)` */
  async timeEvent<T>(event: string, fn: () => Promise<T>): Promise<T> {
    const end = this.socketEventDuration.startTimer({ event });
    try { const r = await fn(); end({ ok: 'true' }); return r; }
    catch (e) { end({ ok: 'false' }); throw e; }
  }
}
