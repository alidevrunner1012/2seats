import { csrfValid } from './csrf';
const t = 'a'.repeat(43);
describe('csrfValid', () => {
  it('accepts matching tokens', () => expect(csrfValid(t, t)).toBe(true));
  it('rejects missing, mismatched, short', () => {
    expect(csrfValid(undefined, t)).toBe(false);
    expect(csrfValid(t, undefined)).toBe(false);
    expect(csrfValid(t, 'b'.repeat(43))).toBe(false);
    expect(csrfValid('abc', 'abc')).toBe(false);
  });
});
