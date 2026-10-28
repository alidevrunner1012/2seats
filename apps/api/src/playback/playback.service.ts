import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { RoomRole } from '@prisma/client';
import { lookup } from 'node:dns/promises';
import type { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { PlaybackSource, PlaybackState } from './playback.types';

const TTL_SECONDS = 86_400;
const DEFAULT_STATE: PlaybackState = {
  mode: 'player',
  source: null,
  status: 'paused',
  position: 0,
  rate: 1,
  updatedAt: 0,
  version: 0,
};
const MUTATION_LUA = `
local current = redis.call('GET', KEYS[1])
local state = cjson.decode(current)
if tonumber(state.version) ~= tonumber(ARGV[1]) then return {0, current} end
local next = cjson.decode(ARGV[2])
next.version = tonumber(state.version) + 1
next.updatedAt = tonumber(ARGV[3])
redis.call('SET', KEYS[1], cjson.encode(next), 'EX', ARGV[4])
return {1, cjson.encode(next)}
`;

export function applyAtomicMutation(current: PlaybackState, baseVersion: number, patch: Partial<PlaybackState>, updatedAt: number): PlaybackState | null {
  if (current.version !== baseVersion) return null;
  return { ...current, ...patch, version: current.version + 1, updatedAt };
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  const parts = host.split('.').map(Number);
  const [first, second] = parts;
  return parts.length === 4 && parts.every(Number.isInteger) && first !== undefined && second !== undefined && (
    first === 10 || first === 127 || (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
  );
}

@Injectable()
export class PlaybackService {
  constructor(private readonly redis: RedisService, private readonly prisma: PrismaService) {}

  key(roomId: string): string { return `playback:${roomId}`; }

  async state(roomId: string): Promise<PlaybackState> {
    await this.redis.client.set(this.key(roomId), JSON.stringify(DEFAULT_STATE), 'EX', TTL_SECONDS, 'NX');
    const raw = await this.redis.client.get(this.key(roomId));
    const state = raw === null ? DEFAULT_STATE : JSON.parse(raw) as PlaybackState;
    return this.project(state, Date.now());
  }

  async validateSource(source: PlaybackSource): Promise<void> {
    let parsed: URL;
    try { parsed = new URL(source.url); } catch { throw new BadRequestException('Invalid playback source URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
      throw new BadRequestException('Playback source must use a public HTTP(S) URL');
    }
    const addresses = await lookup(parsed.hostname, { all: true });
    if (addresses.some(({ address }) => isPrivateHost(address) || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80'))) {
      throw new BadRequestException('Playback source resolves to a private address');
    }
  }

  async mutate(roomId: string, userId: string, baseVersion: number, patch: Partial<PlaybackState>, everyoneCanControl: boolean): Promise<PlaybackState> {
    if (!everyoneCanControl) {
      const member = await this.prisma.roomMember.findFirst({ where: { roomId, userId, leftAt: null }, select: { role: true } });
      if (member?.role !== RoomRole.HOST) throw new ForbiddenException('Host access is required');
    }
    const current = await this.state(roomId);
    const next = { ...current, ...patch, updatedAt: Date.now() };
    const result = await (this.redis.client as Redis & { eval: (script: string, keys: number, ...args: string[]) => Promise<unknown> }).eval(
      MUTATION_LUA, 1, this.key(roomId), String(baseVersion), JSON.stringify(next), String(Date.now()), String(TTL_SECONDS),
    );
    const values = result as [number, string];
    if (values[0] !== 1) throw new ConflictException('Playback state changed; resync and retry.');
    return this.project(JSON.parse(values[1]) as PlaybackState, Date.now());
  }

  async recordEnded(roomId: string, endedAt = Date.now()): Promise<boolean> {
    const state = await this.state(roomId);
    if (state.source === null || state.startedAt === undefined) return false;
    const existing = await this.prisma.watchHistory.findFirst({ where: { roomId, sourceUrl: state.source.url, startedAt: new Date(state.startedAt), endedAt: null }, select: { id: true } });
    if (existing !== null) return false;
    const members = await this.prisma.roomMember.findMany({ where: { roomId, leftAt: null }, select: { userId: true } });
    await this.prisma.watchHistory.create({
      data: { roomId, title: state.source.title, sourceUrl: state.source.url, startedAt: new Date(state.startedAt), endedAt: new Date(endedAt), participants: members.map(({ userId }) => userId) },
    });
    return true;
  }

  async maybeRecordOnLastLeave(roomId: string): Promise<boolean> {
    const state = await this.state(roomId);
    if (state.status === 'ended' || state.startedAt === undefined || Date.now() - state.startedAt < 300_000) return false;
    const count = await this.redis.client.hlen(`presence:${roomId}`);
    return count === 0 && this.recordEnded(roomId);
  }

  private project(state: PlaybackState, now: number): PlaybackState {
    if (state.status !== 'playing' || state.updatedAt === 0) return state;
    return { ...state, position: state.position + ((now - state.updatedAt) / 1_000) * state.rate };
  }
}

export { MUTATION_LUA };
