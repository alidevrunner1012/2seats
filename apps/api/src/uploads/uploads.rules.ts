export const UPLOAD_RULES = {
  image: { mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], maxBytes: 5 * 1024 * 1024 },
  subtitle: { mimes: ['text/vtt'], maxBytes: 1024 * 1024 },
  video: {
    mimes: ['video/mp4', 'video/webm'],
    maxBytes: Number(process.env.UPLOAD_MAX_VIDEO_BYTES ?? 500 * 1024 * 1024),
  },
} as const;
export type UploadKind = keyof typeof UPLOAD_RULES;
export const UPLOAD_KINDS = Object.keys(UPLOAD_RULES) as UploadKind[];
export const USER_QUOTA_BYTES = Number(process.env.UPLOAD_USER_QUOTA_BYTES ?? 2 * 1024 ** 3);

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'text/vtt': '.vtt', 'video/mp4': '.mp4', 'video/webm': '.webm',
};
export const extFor = (mime: string): string => EXT[mime] ?? '';

/** Returns an error message, or null when the upload is acceptable. */
export function validateUpload(kind: string, mime: string, size: number): string | null {
  if (!UPLOAD_KINDS.includes(kind as UploadKind)) return 'Unknown upload kind';
  const rule = UPLOAD_RULES[kind as UploadKind];
  if (!(rule.mimes as readonly string[]).includes(mime)) return `Type ${mime} not allowed for ${kind}`;
  if (!Number.isInteger(size) || size <= 0) return 'Invalid size';
  if (size > rule.maxBytes) return `File too large (max ${Math.floor(rule.maxBytes / 1024 / 1024)}MB)`;
  return null;
}
export const wouldExceedQuota = (used: number, incoming: number, quota = USER_QUOTA_BYTES) =>
  used + incoming > quota;
