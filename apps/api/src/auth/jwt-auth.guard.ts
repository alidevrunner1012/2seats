import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import type { Environment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './authenticated-user';

interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const authorization = request.headers.authorization;
    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(
        authorization.slice('Bearer '.length),
        {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        },
      );
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      !Array.isArray(payload.roles)
    ) {
      throw new UnauthorizedException('Access token is invalid');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    if (user === null || user.email !== payload.email) {
      throw new UnauthorizedException('Account is unavailable');
    }
    request.user = { ...user, roles: payload.roles };
    return true;
  }
}
