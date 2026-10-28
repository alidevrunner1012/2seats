/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { CanActivate, ExecutionContext, Controller, ForbiddenException, Get, Injectable, Res, SetMetadata } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

/** Double-submit check. Pure so it is easy to test. */
export function csrfValid(cookie: string | undefined, header: string | undefined): boolean {
  if (!cookie || !header) return false;
  const a = Buffer.from(cookie), b = Buffer.from(header);
  return a.length === b.length && a.length >= 32 && timingSafeEqual(a, b);
}

/** Apply to endpoints authenticated by cookie (refresh, logout). Bearer-token endpoints do not need it. */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (!csrfValid(req.cookies?.[CSRF_COOKIE], req.headers[CSRF_HEADER] as string | undefined)) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }
    return true;
  }
}

/** GET /auth/csrf sets the (JS-readable) cookie; the web client copies it into the x-csrf-token header. */
@Controller('auth')
export class CsrfController {
  @Get('csrf')
  issue(@Res({ passthrough: true }) res: { setCookie: (n: string, v: string, o: object) => void }) {
    const token = randomBytes(32).toString('base64url');
    res.setCookie(CSRF_COOKIE, token, {
      httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24,
    });
    return { csrfToken: token };
  }
}
export const SkipCsrf = () => SetMetadata('skipCsrf', true);
