/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { BrowserSessionService } from './browser-session.service';

type Row = { id: string; roomId: string; userId: string; status: string; slot: number; httpPort: number; expiresAt: Date; createdAt: Date; handle?: string; startedAt?: Date };
function make(opts: { cap: number; perUser: number }) {
  process.env.BROWSER_GLOBAL_CAP = String(opts.cap);
  process.env.BROWSER_PER_USER_CAP = String(opts.perUser);
  process.env.BROWSER_TOKEN_SECRET = 'x';
  const rows: Row[] = [];
  const kv = new Map<string, string>(); const list: string[] = [];
  const match = (r: Row, w: any) =>
    (!w.roomId || r.roomId === w.roomId) && (!w.userId || r.userId === w.userId) && (!w.status?.in || w.status.in.includes(r.status));
  const prisma: any = { browserSession: {
    findFirst: async ({ where }: any) => rows.find((r) => match(r, where)) ?? null,
    findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
    count: async ({ where }: any) => rows.filter((r) => match(r, where)).length,
    create: async ({ data }: any) => { const r = { ...data, createdAt: new Date() }; rows.push(r); return r; },
    update: async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id)!, data),
  } };
  const redis: any = { client: {
    set: async (k: string, v: string, ..._a: any[]) => { if (_a.includes('NX') && kv.has(k)) return null; kv.set(k, v); return 'OK'; },
    get: async (k: string) => kv.get(k) ?? null, del: async (...ks: string[]) => ks.forEach((k) => kv.delete(k)),
    lpos: async (_k: string, v: string) => { const i = list.indexOf(v); return i < 0 ? null : i; },
    rpush: async (_k: string, v: string) => list.push(v), llen: async () => list.length, lpop: async () => list.shift() ?? null,
    lrem: async () => 0, lrange: async () => [...list],
  } };
  const runtime: any = { start: async () => ({ handle: 'h' }), isHealthy: async () => true, stop: async () => undefined, listManaged: async () => [] };
  return { svc: new BrowserSessionService(prisma, redis, runtime), rows, list };
}

describe('BrowserSessionService limits', () => {
  it('starts a session and returns a signed URL', async () => {
    const { svc } = make({ cap: 2, perUser: 1 });
    const v: any = await svc.start('u1', 'r1', 'Aman');
    expect(v.status).toBe('running'); expect(v.sessionUrl).toContain('usr=Aman'); expect(v.controlToken).toBeTruthy();
  });
  it('returns the same session for the same room', async () => {
    const { svc } = make({ cap: 2, perUser: 1 });
    const a: any = await svc.start('u1', 'r1'); const b: any = await svc.start('u2', 'r1');
    expect(b.sessionId).toBe(a.sessionId);
  });
  it('enforces per-user quota', async () => {
    const { svc } = make({ cap: 5, perUser: 1 });
    await svc.start('u1', 'r1');
    await expect(svc.start('u1', 'r2')).rejects.toThrow(/already have/);
  });
  it('queues when the global cap is reached, with stable positions', async () => {
    const { svc } = make({ cap: 1, perUser: 1 });
    await svc.start('u1', 'r1');
    const q1: any = await svc.start('u2', 'r2'); const q2: any = await svc.start('u3', 'r3'); const q1b: any = await svc.start('u2', 'r2');
    expect([q1.position, q2.position, q1b.position]).toEqual([1, 2, 1]);
  });
  it('starts the next queued room after a stop', async () => {
    const { svc, rows } = make({ cap: 1, perUser: 1 });
    const a: any = await svc.start('u1', 'r1'); await svc.start('u2', 'r2');
    await svc.stop(a.sessionId, 'STOPPED');
    expect(rows.find((r) => r.roomId === 'r2' && r.status === 'RUNNING')).toBeTruthy();
  });
});
