import { describe, expect, it, vi } from 'vitest';
import { RipplePool, type RippleTarget } from './ripple-pool';

function createTarget(): RippleTarget {
  return {
    animate: vi.fn(() => ({}) as Animation),
  };
}

describe('RipplePool', () => {
  it('limits active ripples to five and reuses a finished slot', () => {
    const targets = Array.from({ length: 8 }, createTarget);
    const animateSpies = targets
      .slice(0, 5)
      .map((target) => vi.spyOn(target, 'animate'));
    const pool = new RipplePool(targets, 640);

    for (let index = 0; index < 5; index += 1) {
      expect(pool.spawn(index, index + 1, 100)).toBe(true);
    }
    expect(pool.size).toBe(5);
    expect(pool.spawn(10, 20, 101)).toBe(false);
    expect(
      animateSpies.every((animate) => animate.mock.calls.length === 1),
    ).toBe(true);

    expect(pool.spawn(10, 20, 741)).toBe(true);
    expect(animateSpies[0]?.mock.calls[1]?.[0][0]).toMatchObject({
      transform:
        'translate3d(10px, 20px, 0) translate3d(-50%, -50%, 0) scale(0.25)',
    });
  });

  it('keeps 1,000 pooled click animations within one 60fps frame budget', () => {
    const targets = Array.from({ length: 5 }, createTarget);
    const animateSpies = targets.map((target) => vi.spyOn(target, 'animate'));
    const pool = new RipplePool(targets);
    const start = performance.now();

    for (let index = 0; index < 1_000; index += 1) {
      pool.spawn(index, index, index * 641);
    }

    expect(performance.now() - start).toBeLessThan(1000 / 60);
    expect(targets).toHaveLength(5);
    expect(
      animateSpies.reduce(
        (count, animate) => count + animate.mock.calls.length,
        0,
      ),
    ).toBe(1_000);
  });
});
