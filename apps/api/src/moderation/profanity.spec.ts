import { filterProfanity } from './profanity';
describe('filterProfanity', () => {
  it('masks listed words case-insensitively', () => expect(filterProfanity('What the FUCK', ['fuck'])).toBe('What the ****'));
  it('does not mask inside other words', () => expect(filterProfanity('classic assassin', ['ass'])).toBe('classic assassin'));
  it('handles empty list and regex chars', () => {
    expect(filterProfanity('hello', [])).toBe('hello');
    expect(filterProfanity('a.b', ['a.b'])).toBe('***');
  });
});
