import { describe, expect, it } from 'vitest';
import { controlReducer, hasIncomingRequest, initialControl, roleOf } from './controlReducer';
import { formatRemaining, isExpiringSoon } from './time';

describe('controlReducer', () => {
  it('applies server state', () => {
    const s = controlReducer(initialControl, { type: 'state', controllerId: 'a', pendingFrom: 'b' });
    expect(s).toEqual({ controllerId: 'a', pendingFrom: 'b' });
  });
  it('handles release (null controller) and reset', () => {
    const s = controlReducer({ controllerId: 'a', pendingFrom: null }, { type: 'state', controllerId: null });
    expect(s.controllerId).toBeNull();
    expect(controlReducer(s, { type: 'reset' })).toEqual(initialControl);
  });
  it('roleOf', () => {
    expect(roleOf(initialControl, 'me')).toBe('free');
    expect(roleOf({ controllerId: 'me', pendingFrom: null }, 'me')).toBe('me');
    expect(roleOf({ controllerId: 'x', pendingFrom: null }, 'me')).toBe('other');
  });
  it('hasIncomingRequest only for the holder', () => {
    const s = { controllerId: 'me', pendingFrom: 'you' };
    expect(hasIncomingRequest(s, 'me')).toBe(true);
    expect(hasIncomingRequest(s, 'you')).toBe(false);
    expect(hasIncomingRequest({ controllerId: 'me', pendingFrom: null }, 'me')).toBe(false);
  });
});
describe('time', () => {
  it('formats', () => {
    expect(formatRemaining(0)).toBe('0:00');
    expect(formatRemaining(65_000)).toBe('1:05');
    expect(formatRemaining(3_725_000)).toBe('1:02:05');
    expect(formatRemaining(-5)).toBe('0:00');
  });
  it('expiring soon under 5 min', () => {
    expect(isExpiringSoon(4 * 60_000)).toBe(true);
    expect(isExpiringSoon(6 * 60_000)).toBe(false);
    expect(isExpiringSoon(0)).toBe(false);
  });
});
