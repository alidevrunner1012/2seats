import Docker from 'dockerode';
import { browserConfig } from './browser.config';
import { BrowserRuntime, ManagedInstance, StartOptions, httpHealthy, nekoEnv } from './browser.runtime';

/**
 * Dev runtime. Host ports == container ports so WebRTC ICE works with NAT1TO1.
 * NOTE: Docker cannot filter egress by itself. Apply infra/egress-rules.sh on the host
 * (blocks RFC1918 + metadata IPs for the `twoseats-browsers` network).
 */
export class DockerRuntime implements BrowserRuntime {
  private readonly docker = new Docker();
  private readonly cfg = browserConfig();

  async start(o: StartOptions) {
    const ports: Record<string, { HostPort: string }[]> = { '8080/tcp': [{ HostPort: String(o.httpPort) }] };
    const exposed: Record<string, object> = { '8080/tcp': {} };
    for (let p = o.udpFrom; p <= o.udpTo; p++) {
      ports[`${p}/udp`] = [{ HostPort: String(p) }];
      exposed[`${p}/udp`] = {};
    }
    const c = await this.docker.createContainer({
      Image: this.cfg.image,
      name: `2seats-browser-${o.sessionId}`,
      Env: nekoEnv(o, this.cfg.publicIp),
      Labels: {
        'twoseats.managed': 'true',
        'twoseats.session': o.sessionId,
        'twoseats.created': String(Date.now()),
      },
      ExposedPorts: exposed,
      HostConfig: {
        PortBindings: ports,
        Memory: 2 * 1024 ** 3,
        NanoCpus: 2e9,
        ShmSize: 2 * 1024 ** 3, // chromium needs /dev/shm
        PidsLimit: 512,
        CapDrop: ['ALL'],
        // Chromium sandbox may need SYS_ADMIN depending on the image. Opt in explicitly.
        CapAdd: process.env.NEKO_CAP_ADD ? process.env.NEKO_CAP_ADD.split(',') : [],
        SecurityOpt: ['no-new-privileges:true'],
        // Neko writes to many paths, so a fully read-only rootfs is not workable.
        // Keep the rootfs ephemeral and cap writable tmpfs instead.
        Tmpfs: { '/tmp': 'rw,size=512m' },
        NetworkMode: process.env.BROWSER_DOCKER_NETWORK ?? 'bridge',
        AutoRemove: true,
      },
    });
    await c.start();
    return { handle: c.id };
  }
  isHealthy(o: Pick<StartOptions, 'httpPort'>) { return httpHealthy(this.cfg.internalHost, o.httpPort); }
  async stop(handle: string) {
    try { await this.docker.getContainer(handle).stop({ t: 3 }); }
    catch (e: unknown) {
      if ((e as { statusCode?: number }).statusCode === 304 || (e as { statusCode?: number }).statusCode === 404) return;
      throw e;
    }
  }
  async listManaged(): Promise<ManagedInstance[]> {
    const list = await this.docker.listContainers({ filters: { label: ['twoseats.managed=true'] } });
    return list.flatMap((c) => {
      const sessionId = c.Labels['twoseats.session'];
      if (sessionId === undefined) return [];
      return [{ handle: c.Id, sessionId, createdAt: Number(c.Labels['twoseats.created'] ?? 0) }];
    });
  }
}
