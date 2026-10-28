import { describe, expect, it } from 'vitest';
import {
  markSplashSeen,
  shouldShowSplash,
  SPLASH_SESSION_KEY,
  SPLASH_TIMELINE,
  splashDuration,
  splashMotionMode,
} from './splash-state';

describe('splash state', () => {
  it('plays once in a browser session and supports replay after clearing the key', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(shouldShowSplash(storage)).toBe(true);
    markSplashSeen(storage);
    expect(values.get(SPLASH_SESSION_KEY)).toBe('true');
    expect(shouldShowSplash(storage)).toBe(false);
    values.delete(SPLASH_SESSION_KEY);
    expect(shouldShowSplash(storage)).toBe(true);
  });

  it('keeps the signature sequence close to 3.2 seconds including exit and reduces to one second', () => {
    expect(SPLASH_TIMELINE).toMatchObject({
      seats: 0.3,
      heart: 1.1,
      wordmark: 1.5,
      tagline: 2.1,
      exit: 3,
      duration: 3200,
    });
    expect(splashDuration(false) + 200).toBe(3200);
    expect(splashDuration(true) + 100).toBe(1000);
    expect(splashMotionMode(true)).toBe('reduced');
  });
});
