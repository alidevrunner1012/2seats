import { createHmac, timingSafeEqual } from 'node:crypto';

/** Short-lived signed token: `${sessionId}.${expiresAtMs}.${hmac}` */
export function signControlToken(sessionId: string, expiresAtMs: number, secret: string): string {
  if (!secret) throw new Error('BROWSER_TOKEN_SECRET is not set');
  const body = `${sessionId}.${expiresAtMs}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function verifyControlToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [sessionId, exp, sig] = parts;
  if (sessionId === undefined || exp === undefined || sig === undefined) return null;
  const expected = createHmac('sha256', secret).update(`${sessionId}.${exp}`).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(exp) > now ? sessionId : null;
}
export const buildSessionUrl = (template: string, slot: number, port: number) =>
  template.replace('{port}', String(port)).replace('{slot}', String(slot));
