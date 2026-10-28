import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { RoomMemberGuard } from './room-member.guard';

@Injectable()
export class RoomHostGuard extends RoomMemberGuard implements CanActivate {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user?: AuthenticatedUser }
    >();
    const params = request.params as Record<string, unknown> | undefined;
    const roomId = params?.id ?? params?.roomId;
    if (typeof roomId !== 'string' || request.user === undefined) {
      throw new ForbiddenException('Room host access is required');
    }
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId: request.user.id, leftAt: null },
      select: { role: true },
    });
    if (member?.role !== 'HOST') {
      throw new ForbiddenException('Room host access is required');
    }
    return true;
  }
}
