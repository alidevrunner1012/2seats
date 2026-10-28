import { Injectable } from '@nestjs/common';
import { RedisService } from '../_adapters';

export interface ControlState { controllerId: string | null; pendingFrom: string | null }
const TTL = 4 * 60 * 60;

/** Who "holds the mouse" in the shared browser. Tracked in Redis so it survives API restarts. */
@Injectable()
export class BrowserControlService {
  constructor(private readonly redis: RedisService) {}
  private k = (roomId: string) => `browser:control:${roomId}`;
  private p = (roomId: string) => `browser:control-pending:${roomId}`;

  async state(roomId: string): Promise<ControlState> {
    const [c, p] = await Promise.all([this.redis.client.get(this.k(roomId)), this.redis.client.get(this.p(roomId))]);
    return { controllerId: c, pendingFrom: p };
  }
  /** Free mouse: granted immediately. Held by someone else: becomes a pending request. */
  async request(roomId: string, userId: string): Promise<ControlState> {
    const ok = await this.redis.client.set(this.k(roomId), userId, 'EX', TTL, 'NX');
    const st = await this.state(roomId);
    if (ok || st.controllerId === userId) { await this.redis.client.del(this.p(roomId)); return { controllerId: userId, pendingFrom: null }; }
    await this.redis.client.set(this.p(roomId), userId, 'EX', 60);
    return { ...st, pendingFrom: userId };
  }
  async release(roomId: string, userId: string): Promise<ControlState> {
    const st = await this.state(roomId);
    if (st.controllerId === userId) await this.redis.client.del(this.k(roomId));
    return this.state(roomId);
  }
  /** Holder hands the mouse to the pending user (or a named user). */
  async grant(roomId: string, holderId: string, toUserId: string): Promise<ControlState> {
    const st = await this.state(roomId);
    if (st.controllerId !== holderId) return st;
    await this.redis.client.set(this.k(roomId), toUserId, 'EX', TTL);
    await this.redis.client.del(this.p(roomId));
    return { controllerId: toUserId, pendingFrom: null };
  }
}
