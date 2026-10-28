import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService, RedisService } from '../_adapters';
import { TakedownEntry, urlMatchesTakedown } from './dmca.match';

const CACHE_KEY = 'dmca:entries';

@Injectable()
export class DmcaService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async add(adminId: string, kind: 'domain' | 'url', value: string, note?: string) {
    const row = await this.prisma.dmcaTakedown.upsert({
      where: { value }, update: { note }, create: { kind, value, note, createdBy: adminId },
    });
    await this.redis.client.del(CACHE_KEY);
    return row;
  }
  async remove(id: string) {
    await this.prisma.dmcaTakedown.delete({ where: { id } });
    await this.redis.client.del(CACHE_KEY);
  }
  list() { return this.prisma.dmcaTakedown.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }

  private async entries(): Promise<TakedownEntry[]> {
    const cached = await this.redis.client.get(CACHE_KEY);
    if (cached) return JSON.parse(cached) as TakedownEntry[];
    const rows = await this.prisma.dmcaTakedown.findMany({ select: { kind: true, value: true } });
    const entries = rows.map((r: { kind: string; value: string }) => ({ kind: r.kind as 'domain' | 'url', value: r.value }));
    await this.redis.client.set(CACHE_KEY, JSON.stringify(entries), 'EX', 300);
    return entries;
  }
  async isBlocked(url: string) { return urlMatchesTakedown(url, await this.entries()); }
  /** Call this from the playback service before accepting `player:set-source`. */
  async assertAllowed(url: string) {
    if (await this.isBlocked(url)) throw new ForbiddenException('This source was removed after a takedown request');
  }
}
