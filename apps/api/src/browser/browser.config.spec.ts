import { browserConfig } from './browser.config';

describe('browserConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalImage = process.env.NEKO_IMAGE;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalImage === undefined) delete process.env.NEKO_IMAGE;
    else process.env.NEKO_IMAGE = originalImage;
  });

  it('rejects mutable browser images in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEKO_IMAGE = 'ghcr.io/m1k1o/neko/chromium:latest';
    expect(() => browserConfig()).toThrow('immutable sha256 digest');
  });

  it('accepts a digest-pinned browser image in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEKO_IMAGE = `ghcr.io/m1k1o/neko/chromium@sha256:${'a'.repeat(64)}`;
    expect(browserConfig().image).toContain('@sha256:');
  });
});
