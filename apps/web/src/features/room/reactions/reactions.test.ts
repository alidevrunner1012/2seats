import { describe, expect, it } from 'vitest';
import { capList, emojiFor, makeThrottle } from './reactions';

describe('reactions helpers', () => {
  it('throttles presses inside the gap', () => {
    let t = 1000; const ok = makeThrottle(300, () => t);
    expect(ok()).toBe(true); t = 1100; expect(ok()).toBe(false); t = 1301; expect(ok()).toBe(true);
  });
  it('caps list length keeping newest', () => {
    let l: number[] = []; for (let i = 0; i < 40; i++) l = capList(l, i, 30);
    expect(l).toHaveLength(30); expect(l[0]).toBe(10); expect(l.at(-1)).toBe(39);
  });
  it('maps ids to emoji with a safe fallback', () => { expect(emojiFor('popcorn')).toBe('🍿'); expect(emojiFor('nope')).toBe('❤️'); });
});
