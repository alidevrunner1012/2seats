import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(protected readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user?: AuthenticatedUser }
    >();
    const roomId = this.roomId(request);
    const userId = request.user?.id;
    if (roomId === undefined || userId === undefined) {
      throw new ForbiddenException('An active room membership is required');
    }
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null, room: { deletedAt: null } },
      select: { id: true },
    });
    if (member === null) {
      throw new ForbiddenException('An active room membership is required');
    }
    return true;
  }

  private roomId(request: FastifyRequest): string | undefined {
    const params = request.params as Record<string, unknown> | undefined;
    const value = params?.id ?? params?.roomId;
    return typeof value === 'string' ? value : undefined;
  }
}
