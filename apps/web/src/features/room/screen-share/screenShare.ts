export type ShareQuality = '720p' | '1080p';
export const SHARE_PRESETS: Record<ShareQuality, { width: number; height: number; frameRate: number; maxBitrate: number }> = {
  '720p': { width: 1280, height: 720, frameRate: 30, maxBitrate: 2_500_000 },
  '1080p': { width: 1920, height: 1080, frameRate: 30, maxBitrate: 5_000_000 },
};
/** getDisplayMedia is missing on most mobile browsers. */
export function canShareScreen(nav?: { mediaDevices?: { getDisplayMedia?: unknown } }): boolean {
  return typeof nav?.mediaDevices?.getDisplayMedia === 'function';
}
export type ShareState = 'idle' | 'me' | 'partner';
/** Only one sharer at a time: if someone else is sharing, I cannot start. */
export function shareState(sharers: { isLocal: boolean }[]): ShareState {
  if (sharers.some((s) => s.isLocal)) return 'me';
  return sharers.length ? 'partner' : 'idle';
}
