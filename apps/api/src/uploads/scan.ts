/* eslint-disable @typescript-eslint/require-await */
export const VIRUS_SCANNER = Symbol('VIRUS_SCANNER');
export interface VirusScanner {
  /** Return clean=false to reject the upload. Swap in a ClamAV implementation later. */
  scan(key: string): Promise<{ clean: boolean; reason?: string }>;
}
export class NoopScanner implements VirusScanner {
  async scan(): Promise<{ clean: boolean }> { return { clean: true }; }
}
