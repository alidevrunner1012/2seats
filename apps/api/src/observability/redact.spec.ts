import pino from 'pino';
import { pinoRedact } from './redact';

function capture(obj: object): string {
  let out = '';
  const log = pino({ redact: pinoRedact }, { write: (s: string) => { out += s; } });
  log.info(obj, 'test');
  return out;
}
describe('log redaction', () => {
  it('hides auth headers and cookies', () => {
    const out = capture({ req: { headers: { authorization: 'Bearer SECRET1', cookie: 'rt=SECRET2' } } });
    expect(out).not.toContain('SECRET1'); expect(out).not.toContain('SECRET2'); expect(out).toContain('[REDACTED]');
  });
  it('hides passwords and tokens in bodies', () => {
    const out = capture({ body: { password: 'hunter2', email: 'a@b.com' }, accessToken: 'TOK' });
    expect(out).not.toContain('hunter2'); expect(out).not.toContain('TOK'); expect(out).toContain('a@b.com');
  });
  it('hides browser session secrets', () => {
    const out = capture({ view: { sessionUrl: 'http://x/?pwd=ABC', controlToken: 'XYZ' } });
    expect(out).not.toContain('ABC'); expect(out).not.toContain('XYZ');
  });
});
