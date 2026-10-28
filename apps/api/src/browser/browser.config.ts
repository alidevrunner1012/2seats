export const browserConfig = () => ({
  globalCap: Number(process.env.BROWSER_GLOBAL_CAP ?? 10),
  perUserCap: Number(process.env.BROWSER_PER_USER_CAP ?? 1),
  idleMinutes: Number(process.env.BROWSER_IDLE_MIN ?? 30),
  maxMinutes: Number(process.env.BROWSER_MAX_MIN ?? 180),
  slots: Number(process.env.BROWSER_SLOTS ?? 50),
  httpBase: Number(process.env.BROWSER_HTTP_BASE ?? 8100),
  udpBase: Number(process.env.BROWSER_UDP_BASE ?? 52000),
  udpPerSession: 10,
  /** Public URL template. Use https behind a TLS proxy in production (mixed content is blocked). */
  urlTemplate: process.env.BROWSER_URL_TEMPLATE ?? 'http://localhost:{port}',
  /** Address the API uses to health-check the container. */
  internalHost: process.env.BROWSER_INTERNAL_HOST ?? 'localhost',
  /** IP that WebRTC clients should connect to (NEKO NAT1TO1). */
  publicIp: process.env.BROWSER_PUBLIC_IP ?? '127.0.0.1',
  image: process.env.NEKO_IMAGE ?? 'ghcr.io/m1k1o/neko/chromium:latest',
});
export type BrowserConfig = ReturnType<typeof browserConfig>;
