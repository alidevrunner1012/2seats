import { describe, expect, it } from 'vitest';
import { nextWeekLocal } from './date';

describe('nextWeekLocal', () => {
  it('is exactly 7 days later in datetime-local format', () => {
    expect(nextWeekLocal(new Date(2026, 9, 28, 21, 5))).toBe('2026-11-04T21:05');
  });
  it('rolls over month and year', () => expect(nextWeekLocal(new Date(2026, 11, 28, 9, 0))).toBe('2027-01-04T09:00'));
});
