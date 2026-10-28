import { describe, expect, it } from 'vitest';
import { DEFAULT_AMBIENT, averageColor, softenColor } from './ambient';

describe('ambient', () => {
  it('averages pixels', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    expect(averageColor(px)).toEqual({ r: 128, g: 0, b: 128 });
  });
  it('ignores transparent pixels and empty data', () => {
    expect(averageColor(new Uint8ClampedArray([9, 9, 9, 0]))).toEqual(DEFAULT_AMBIENT);
    expect(averageColor(new Uint8ClampedArray([]))).toEqual(DEFAULT_AMBIENT);
  });
  it('softening moves black towards rose but not all the way', () => {
    const s = softenColor({ r: 0, g: 0, b: 0 });
    expect(s.r).toBeGreaterThan(0); expect(s.r).toBeLessThan(DEFAULT_AMBIENT.r);
  });
});
