import { describe, expect, it } from 'vitest';
import { translate } from './i18n';

describe('translate', () => {
  it('returns English and Hindi date-night copy', () => {
    expect(translate('en', 'tagline')).toBe(
      'Your seat is always next to mine.',
    );
    expect(translate('hi', 'tagline')).toBe(
      'Meri seat hamesha tumhare paas hai.',
    );
    expect(translate('hi', 'startDate')).toContain('Movie date');
  });
});
