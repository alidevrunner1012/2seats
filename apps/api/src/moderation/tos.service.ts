/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../_adapters';

export const CURRENT_TOS_VERSION = process.env.TOS_VERSION ?? '2026-01';

@Injectable()
export class TosService {
  constructor(private readonly prisma: PrismaService) {}
  accept(userId: string, version = CURRENT_TOS_VERSION) {
    return this.prisma.tosAcceptance.upsert({
      where: { userId_version: { userId, version } }, update: {}, create: { userId, version },
    });
  }
  async hasAccepted(userId: string) {
    return !!(await this.prisma.tosAcceptance.findUnique({ where: { userId_version: { userId, version: CURRENT_TOS_VERSION } } }));
  }
}

/** Put on POST /rooms (after JwtAuthGuard). */
@Injectable()
export class TosGuard implements CanActivate {
  constructor(private readonly tos: TosService) {}
  async canActivate(ctx: ExecutionContext) {
    const userId = ctx.switchToHttp().getRequest().user?.id as string | undefined;
    if (!userId || !(await this.tos.hasAccepted(userId))) {
      throw new ForbiddenException({ code: 'TOS_NOT_ACCEPTED', version: CURRENT_TOS_VERSION });
    }
    return true;
  }
}
