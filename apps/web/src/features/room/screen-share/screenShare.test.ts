import { describe, expect, it } from 'vitest';
import { SHARE_PRESETS, canShareScreen, shareState } from './screenShare';

describe('screenShare', () => {
  it('presets are 16:9 and 1080p has higher bitrate', () => {
    for (const p of Object.values(SHARE_PRESETS)) expect(p.width / p.height).toBeCloseTo(16 / 9, 2);
    expect(SHARE_PRESETS['1080p'].maxBitrate).toBeGreaterThan(SHARE_PRESETS['720p'].maxBitrate);
  });
  it('detects getDisplayMedia support', () => {
    expect(canShareScreen({ mediaDevices: { getDisplayMedia: () => 1 } })).toBe(true);
    expect(canShareScreen({ mediaDevices: {} })).toBe(false);
    expect(canShareScreen(undefined)).toBe(false);
  });
  it('shareState: one sharer at a time', () => {
    expect(shareState([])).toBe('idle');
    expect(shareState([{ isLocal: true }])).toBe('me');
    expect(shareState([{ isLocal: false }])).toBe('partner');
  });
});
