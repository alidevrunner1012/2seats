/** pino redaction paths. Used by the logger config AND by tests. */
export const REDACT_PATHS = [
  'req.headers.authorization', 'req.headers.cookie', 'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password', '*.newPassword', '*.currentPassword', '*.token', '*.accessToken', '*.refreshToken',
  '*.controlToken', '*.sessionUrl', '*.secret', '*.authorization', '*.cookie',
  'password', 'token', 'accessToken', 'refreshToken',
];
export const pinoRedact = { paths: REDACT_PATHS, censor: '[REDACTED]' };
