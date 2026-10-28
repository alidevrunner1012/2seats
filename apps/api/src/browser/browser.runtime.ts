export const BROWSER_RUNTIME = Symbol('BROWSER_RUNTIME');

export interface StartOptions {
  sessionId: string;
  slot: number;
  httpPort: number;
  udpFrom: number;
  udpTo: number;
  userPassword: string;
  adminPassword: string;
}
export interface ManagedInstance { handle: string; sessionId: string; createdAt: number }

export interface BrowserRuntime {
  start(opts: StartOptions): Promise<{ handle: string }>;
  isHealthy(opts: Pick<StartOptions, 'httpPort'>): Promise<boolean>;
  stop(handle: string): Promise<void>;
  listManaged(): Promise<ManagedInstance[]>;
}

/** Neko v3 env vars. If you pin a v2 image, use NEKO_PASSWORD / NEKO_PASSWORD_ADMIN / NEKO_EPR / NEKO_NAT1TO1. */
export function nekoEnv(o: StartOptions, publicIp: string): string[] {
  return [
    'NEKO_DESKTOP_SCREEN=1280x720@30',
    'NEKO_MEMBER_PROVIDER=multiuser',
    `NEKO_MEMBER_MULTIUSER_USER_PASSWORD=${o.userPassword}`,
    `NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD=${o.adminPassword}`,
    `NEKO_WEBRTC_EPR=${o.udpFrom}-${o.udpTo}`,
    `NEKO_WEBRTC_NAT1TO1=${publicIp}`,
    'NEKO_WEBRTC_ICELITE=1',
  ];
}
export async function httpHealthy(host: string, port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch { return false; }
}
