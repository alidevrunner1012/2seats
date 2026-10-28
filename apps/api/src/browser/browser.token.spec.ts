import { buildSessionUrl, signControlToken, verifyControlToken } from './browser.token';
describe('control token', () => {
  const secret = 's3cret';
  it('round-trips', () => {
    const t = signControlToken('abc', Date.now() + 10_000, secret);
    expect(verifyControlToken(t, secret)).toBe('abc');
  });
  it('rejects tampering', () => {
    const t = signControlToken('abc', Date.now() + 10_000, secret).replace('abc', 'xyz');
    expect(verifyControlToken(t, secret)).toBeNull();
  });
  it('rejects expired and wrong secret', () => {
    const t = signControlToken('abc', Date.now() - 1, secret);
    expect(verifyControlToken(t, secret)).toBeNull();
    expect(verifyControlToken(signControlToken('abc', Date.now() + 5000, secret), 'other')).toBeNull();
  });
  it('refuses to sign without a secret', () => expect(() => signControlToken('a', 1, '')).toThrow());
});
describe('buildSessionUrl', () => {
  it('fills port and slot', () => {
    expect(buildSessionUrl('https://b{slot}.x.com:{port}', 3, 8103)).toBe('https://b3.x.com:8103');
  });
});
