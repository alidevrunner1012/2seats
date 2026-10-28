export const SPLASH_SESSION_KEY = '2seats:intro-seen';

export const SPLASH_TIMELINE = {
  background: 0,
  seats: 0.3,
  heart: 1.1,
  wordmark: 1.5,
  tagline: 2.1,
  exit: 3,
  duration: 3200,
} as const;

export function shouldShowSplash(storage: Pick<Storage, 'getItem'>): boolean {
  return storage.getItem(SPLASH_SESSION_KEY) !== 'true';
}

export function markSplashSeen(storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(SPLASH_SESSION_KEY, 'true');
}

export function splashDuration(reducedMotion: boolean): number {
  return reducedMotion ? 900 : SPLASH_TIMELINE.exit * 1000;
}

export function splashMotionMode(reducedMotion: boolean): 'reduced' | 'full' {
  return reducedMotion ? 'reduced' : 'full';
}

export const SPLASH_SKIP_DURATION = 420;
