/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { Counter, Gauge } from 'prom-client';
import { PrismaService, RedisService } from '../_adapters';
import { browserConfig } from './browser.config';
import { BROWSER_RUNTIME, BrowserRuntime } from './browser.runtime';
import { buildSessionUrl, signControlToken } from './browser.token';

export type SessionView =
  | { status: 'idle' }
  | { status: 'queued'; position: number }
  | { status: 'starting' | 'running'; sessionId: string; expiresAt: string; sessionUrl?: string; controlToken?: string };

const ACTIVE = ['STARTING', 'RUNNING'] as const;
const sessionSeconds = new Counter({ name: 'browser_session_seconds_total', help: 'Total cloud-browser seconds (cost proxy)' });
const activeGauge = new Gauge({ name: 'browser_sessions_active', help: 'Active cloud-browser sessions' });

@Injectable()
export class BrowserSessionService {
  private readonly log = new Logger(BrowserSessionService.name);
  private readonly cfg = browserConfig();
  private readonly queueKey = 'browser:queue';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(BROWSER_RUNTIME) private readonly runtime: BrowserRuntime,
  ) {}
  private get r() { return this.redis.client; }

  async start(userId: string, roomId: string, displayName = 'Guest'): Promise<SessionView> {
    const existing = await this.prisma.browserSession.findFirst({ where: { roomId, status: { in: [...ACTIVE] } } });
    if (existing) return this.view(existing, displayName);

    const mine = await this.prisma.browserSession.count({ where: { userId, status: { in: [...ACTIVE] } } });
    if (mine >= this.cfg.perUserCap) throw new ForbiddenException('You already have an active shared browser');

    const total = await this.prisma.browserSession.count({ where: { status: { in: [...ACTIVE] } } });
    if (total >= this.cfg.globalCap) return { status: 'queued', position: await this.enqueue(roomId, userId) };

    return this.launch(userId, roomId, displayName);
  }

  async status(userId: string, roomId: string, displayName = 'Guest'): Promise<SessionView> {
    const s = await this.prisma.browserSession.findFirst({ where: { roomId, status: { in: [...ACTIVE] } } });
    if (s) return this.view(s, displayName);
    const pos = await this.r.lpos(this.queueKey, `${roomId}:${userId}`);
    return pos === null ? { status: 'idle' } : { status: 'queued', position: pos + 1 };
  }

  async extend(roomId: string, minutes = 15): Promise<{ expiresAt: string }> {
    const s = await this.prisma.browserSession.findFirst({ where: { roomId, status: { in: [...ACTIVE] } } });
    if (!s) throw new NotFoundException('No active session');
    const hardStop = s.createdAt.getTime() + this.cfg.maxMinutes * 60_000;
    const next = Math.min(s.expiresAt.getTime() + minutes * 60_000, hardStop);
    if (next <= s.expiresAt.getTime()) throw new ForbiddenException('Maximum session length reached');
    const updated = await this.prisma.browserSession.update({ where: { id: s.id }, data: { expiresAt: new Date(next) } });
    return { expiresAt: updated.expiresAt.toISOString() };
  }

  async stopForRoom(roomId: string) {
    const s = await this.prisma.browserSession.findFirst({ where: { roomId, status: { in: [...ACTIVE] } } });
    for (const e of await this.r.lrange(this.queueKey, 0, -1)) {
      if (e.startsWith(`${roomId}:`)) await this.r.lrem(this.queueKey, 0, e);
    }
    if (s) await this.stop(s.id, 'STOPPED');
  }

  async stop(sessionId: string, final: 'STOPPED' | 'EXPIRED' | 'FAILED') {
    const s = await this.prisma.browserSession.findUnique({ where: { id: sessionId } });
    if (!s || !(ACTIVE as readonly string[]).includes(s.status)) return;
    if (s.handle) await this.runtime.stop(s.handle).catch((e) => this.log.error(`runtime.stop failed: ${e}`));
    await this.prisma.browserSession.update({ where: { id: s.id }, data: { status: final, endedAt: new Date() } });
    await this.r.del(`browser:secret:${s.id}`, `browser:slot:${s.slot}`);
    if (s.startedAt) sessionSeconds.inc((Date.now() - s.startedAt.getTime()) / 1000);
    activeGauge.dec();
    await this.drainQueue();
  }

  /** Called after a session ends: start queued rooms while capacity is free. */
  async drainQueue() {
    for (;;) {
      const total = await this.prisma.browserSession.count({ where: { status: { in: [...ACTIVE] } } });
      if (total >= this.cfg.globalCap) return;
      const next = await this.r.lpop(this.queueKey);
      if (!next) return;
      const [roomId, userId] = next.split(':');
      if (roomId === undefined || userId === undefined) continue;
      try { await this.launch(userId, roomId, 'Guest'); } catch (e) { this.log.warn(`queued launch failed: ${e}`); }
    }
  }

  // ---- internals ----
  private async launch(userId: string, roomId: string, displayName: string): Promise<SessionView> {
    const id = randomUUID();
    const slot = await this.allocateSlot(id);
    const httpPort = this.cfg.httpBase + slot;
    const udpFrom = this.cfg.udpBase + slot * this.cfg.udpPerSession;
    const userPassword = randomBytes(12).toString('base64url');
    const adminPassword = randomBytes(18).toString('base64url');
    const expiresAt = new Date(Date.now() + this.cfg.idleMinutes * 60_000);

    await this.prisma.browserSession.create({
      data: { id, roomId, userId, slot, httpPort, status: 'STARTING', expiresAt },
    });
    activeGauge.inc();
    await this.r.set(`browser:secret:${id}`, JSON.stringify({ userPassword }), 'EX', this.cfg.maxMinutes * 60 + 300);
    try {
      const { handle } = await this.runtime.start({
        sessionId: id, slot, httpPort, udpFrom, udpTo: udpFrom + this.cfg.udpPerSession - 1, userPassword, adminPassword,
      });
      await this.prisma.browserSession.update({ where: { id }, data: { handle } });
      await this.waitHealthy(httpPort);
      const row = await this.prisma.browserSession.update({
        where: { id }, data: { status: 'RUNNING', startedAt: new Date() },
      });
      return this.view(row, displayName);
    } catch (e) {
      this.log.error(`launch failed: ${e}`);
      await this.stop(id, 'FAILED');
      throw new HttpException('Could not start the shared browser', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private async waitHealthy(httpPort: number, timeoutMs = 60_000) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      if (await this.runtime.isHealthy({ httpPort })) return;
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error('health check timed out');
  }

  private async allocateSlot(sessionId: string): Promise<number> {
    for (let i = 0; i < this.cfg.slots; i++) {
      const ok = await this.r.set(`browser:slot:${i}`, sessionId, 'EX', this.cfg.maxMinutes * 60 + 300, 'NX');
      if (ok) return i;
    }
    throw new HttpException('No free browser slots', HttpStatus.SERVICE_UNAVAILABLE);
  }

  private async enqueue(roomId: string, userId: string): Promise<number> {
    const entry = `${roomId}:${userId}`;
    let pos = await this.r.lpos(this.queueKey, entry);
    if (pos === null) { await this.r.rpush(this.queueKey, entry); pos = (await this.r.llen(this.queueKey)) - 1; }
    return pos + 1;
  }

  private async view(
    s: { id: string; status: string; slot: number; httpPort: number; expiresAt: Date },
    displayName: string,
  ): Promise<SessionView> {
    const base = { sessionId: s.id, expiresAt: s.expiresAt.toISOString() };
    if (s.status !== 'RUNNING') return { status: 'starting', ...base };
    const raw = await this.r.get(`browser:secret:${s.id}`);
    const pwd = raw ? (JSON.parse(raw) as { userPassword: string }).userPassword : '';
    const url = buildSessionUrl(this.cfg.urlTemplate, s.slot, s.httpPort);
    return {
      status: 'running', ...base,
      sessionUrl: `${url}/?usr=${encodeURIComponent(displayName)}&pwd=${encodeURIComponent(pwd)}`,
      controlToken: signControlToken(s.id, s.expiresAt.getTime(), process.env.BROWSER_TOKEN_SECRET ?? ''),
    };
  }
}
