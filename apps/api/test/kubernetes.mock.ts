export class CoreV1Api {
  createNamespacedPod(): Promise<void> {
    return Promise.reject(new Error('Kubernetes runtime is unavailable in e2e tests'));
  }

  deleteNamespacedPod(): Promise<void> {
    return Promise.reject(new Error('Kubernetes runtime is unavailable in e2e tests'));
  }

  listNamespacedPod(): Promise<{ items: [] }> {
    return Promise.reject(new Error('Kubernetes runtime is unavailable in e2e tests'));
  }
}

export class KubeConfig {
  loadFromDefault(): void {}

  makeApiClient(): CoreV1Api {
    return new CoreV1Api();
  }
}
