import * as k8s from '@kubernetes/client-node';
import { browserConfig } from './browser.config';
import { BrowserRuntime, ManagedInstance, StartOptions, httpHealthy, nekoEnv } from './browser.runtime';

/**
 * Prod runtime: one Pod per session in a dedicated namespace.
 * WebRTC needs UDP reachable from users, so this uses hostPort (pods must land on nodes with a
 * public IP) and the slot allocator guarantees port uniqueness per node-pool. Alternatives:
 * a UDP LoadBalancer per session, or a TURN-only setup. See docs/RUNBOOK.md.
 */
export class KubernetesRuntime implements BrowserRuntime {
  private readonly api: k8s.CoreV1Api;
  private readonly cfg = browserConfig();
  private readonly ns = process.env.BROWSER_K8S_NAMESPACE ?? 'twoseats-browsers';

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.api = kc.makeApiClient(k8s.CoreV1Api);
  }

  async start(o: StartOptions) {
    const name = `browser-${o.sessionId}`;
    const ports: k8s.V1ContainerPort[] = [{ containerPort: 8080, hostPort: o.httpPort, protocol: 'TCP' }];
    for (let p = o.udpFrom; p <= o.udpTo; p++) ports.push({ containerPort: p, hostPort: p, protocol: 'UDP' });
    const pod: k8s.V1Pod = {
      metadata: {
        name,
        labels: { app: 'twoseats-browser', 'twoseats/session': o.sessionId },
        annotations: { 'twoseats/created': String(Date.now()) },
      },
      spec: {
        restartPolicy: 'Never',
        automountServiceAccountToken: false,
        enableServiceLinks: false,
        activeDeadlineSeconds: this.cfg.idleMinutes * 60 * 8,
        containers: [{
          name: 'neko',
          image: this.cfg.image,
          env: nekoEnv(o, this.cfg.publicIp).map((s) => {
            const i = s.indexOf('=');
            return { name: s.slice(0, i), value: s.slice(i + 1) };
          }),
          ports,
          resources: { limits: { cpu: '2', memory: '2Gi' }, requests: { cpu: '1', memory: '1Gi' } },
          securityContext: {
            allowPrivilegeEscalation: false,
            capabilities: { drop: ['ALL'], add: process.env.NEKO_CAP_ADD ? process.env.NEKO_CAP_ADD.split(',') : [] },
            seccompProfile: { type: 'RuntimeDefault' },
          },
          volumeMounts: [{ name: 'shm', mountPath: '/dev/shm' }, { name: 'tmp', mountPath: '/tmp' }],
        }],
        volumes: [
          { name: 'shm', emptyDir: { medium: 'Memory', sizeLimit: '2Gi' } },
          { name: 'tmp', emptyDir: { sizeLimit: '512Mi' } },
        ],
      },
    };
    await this.api.createNamespacedPod({ namespace: this.ns, body: pod });
    return { handle: name };
  }
  isHealthy(o: Pick<StartOptions, 'httpPort'>) { return httpHealthy(this.cfg.internalHost, o.httpPort); }
  async stop(handle: string) {
    try { await this.api.deleteNamespacedPod({ name: handle, namespace: this.ns, gracePeriodSeconds: 3 }); }
    catch (e: unknown) { if ((e as { code?: number }).code !== 404) throw e; }
  }
  async listManaged(): Promise<ManagedInstance[]> {
    const res = await this.api.listNamespacedPod({ namespace: this.ns, labelSelector: 'app=twoseats-browser' });
    return res.items.map((p) => ({
      handle: p.metadata?.name ?? '',
      sessionId: p.metadata?.labels?.['twoseats/session'] ?? '',
      createdAt: Number(p.metadata?.annotations?.['twoseats/created'] ?? 0),
    }));
  }
}
