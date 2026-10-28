import { validateUpload, wouldExceedQuota, extFor } from './uploads.rules';
describe('validateUpload', () => {
  it('accepts a small png', () => expect(validateUpload('image', 'image/png', 1000)).toBeNull());
  it('rejects wrong mime for kind', () => expect(validateUpload('image', 'video/mp4', 1000)).toMatch(/not allowed/));
  it('rejects exe', () => expect(validateUpload('image', 'application/x-msdownload', 10)).not.toBeNull());
  it('rejects oversize image', () => expect(validateUpload('image', 'image/png', 6 * 1024 * 1024)).toMatch(/too large/));
  it('rejects oversize vtt', () => expect(validateUpload('subtitle', 'text/vtt', 2 * 1024 * 1024)).not.toBeNull());
  it('rejects zero/negative/float sizes', () => {
    expect(validateUpload('image', 'image/png', 0)).not.toBeNull();
    expect(validateUpload('image', 'image/png', -5)).not.toBeNull();
    expect(validateUpload('image', 'image/png', 1.5)).not.toBeNull();
  });
  it('rejects unknown kind', () => expect(validateUpload('zip', 'application/zip', 10)).not.toBeNull());
});
describe('quota', () => {
  it('blocks when over', () => expect(wouldExceedQuota(90, 20, 100)).toBe(true));
  it('allows exactly at limit', () => expect(wouldExceedQuota(80, 20, 100)).toBe(false));
});
describe('extFor', () => it('maps mime to ext', () => expect(extFor('text/vtt')).toBe('.vtt')));
