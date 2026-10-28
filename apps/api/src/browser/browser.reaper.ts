import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../_adapters';
import { BROWSER_RUNTIME, BrowserRuntime } from './browser.runtime';
import { BrowserSessionService } from './browser-session.service';

const GRACE_MS = 2 * 60_000;

@Injectable()
export class BrowserReaper {
  private readonly log = new Logger(BrowserReaper.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: BrowserSessionService,
    @Inject(BROWSER_RUNTIME) private readonly runtime: BrowserRuntime,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reap() {
    const expired = await this.prisma.browserSession.findMany({
      where: { status: { in: ['STARTING', 'RUNNING'] }, expiresAt: { lt: new Date() } },
    });
    for (const s of expired) await this.sessions.stop(s.id, 'EXPIRED');

    const active = await this.prisma.browserSession.findMany({
      where: { status: { in: ['STARTING', 'RUNNING'] } }, select: { id: true },
    });
    const known = new Set(active.map((a: { id: string }) => a.id));
    for (const m of await this.runtime.listManaged()) {
      if (!known.has(m.sessionId) && Date.now() - m.createdAt > GRACE_MS) {
        this.log.warn(`Killing orphan browser ${m.handle}`);
        await this.runtime.stop(m.handle).catch(() => undefined);
      }
    }
  }
}
