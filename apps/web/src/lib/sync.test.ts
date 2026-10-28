import { describe, expect, it } from 'vitest';
import { calculateDrift } from './sync';

const state = { position: 100, rate: 1, status: 'playing' as const, updatedAt: 100_000 };

describe('calculateDrift', () => {
  it('does nothing within the convergence threshold', () => {
    expect(calculateDrift(state, 100_000, 100.15)).toMatchObject({ kind: 'none', drift: expect.closeTo(-0.15, 5) });
  });
  it('nudges playback rate for moderate drift', () => {
    expect(calculateDrift(state, 100_000, 99.5)).toEqual({ kind: 'rate', drift: 0.5, playbackRate: 1.05 });
    expect(calculateDrift(state, 100_000, 100.5)).toEqual({ kind: 'rate', drift: -0.5, playbackRate: 0.95 });
  });
  it('hard seeks for large drift and clamps negative positions', () => {
    expect(calculateDrift(state, 100_000, 90)).toEqual({ kind: 'seek', drift: 10, position: 100 });
    expect(calculateDrift({ ...state, position: 0, status: 'paused' }, 100_000, 4)).toEqual({ kind: 'seek', drift: -4, position: 0 });
  });
  it('accounts for playback rate while playing', () => {
    expect(calculateDrift({ ...state, rate: 2 }, 100_500, 101)).toEqual({ kind: 'none', drift: 0 });
  });
});
