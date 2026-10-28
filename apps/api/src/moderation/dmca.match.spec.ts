import { urlMatchesTakedown } from './dmca.match';
const entries = [{ kind: 'domain' as const, value: 'pirate.example' }, { kind: 'url' as const, value: 'https://ok.com/bad.mp4' }];
describe('urlMatchesTakedown', () => {
  it('blocks domain and subdomains', () => {
    expect(urlMatchesTakedown('https://pirate.example/a.mp4', entries)).toBe(true);
    expect(urlMatchesTakedown('https://cdn.pirate.example/a', entries)).toBe(true);
  });
  it('does not block look-alike domains', () => expect(urlMatchesTakedown('https://notpirate.example/a', entries)).toBe(false));
  it('blocks an exact URL, ignoring #hash', () => {
    expect(urlMatchesTakedown('https://ok.com/bad.mp4#t=5', entries)).toBe(true);
    expect(urlMatchesTakedown('https://ok.com/good.mp4', entries)).toBe(false);
  });
  it('is safe on garbage input', () => expect(urlMatchesTakedown('not a url', entries)).toBe(false));
});
