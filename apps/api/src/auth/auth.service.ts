import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailTokenType, Prisma, type User } from '@prisma/client';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Environment } from '../config/environment';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MinioService } from '../storage/minio.service';
import type { GoogleLoginDto, LoginDto, SignupDto } from './dto/auth.dto';

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
const AUTH_TOKEN_SECONDS = 60 * 60;
const LOCKOUT_SECONDS = 15 * 60;

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SafeUser;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleProfile {
  email?: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
    private readonly mail: MailService,
    private readonly minio: MinioService,
  ) {}

  async signup(dto: SignupDto): Promise<SessionTokens> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: { email, displayName: dto.displayName.trim(), passwordHash },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
    await this.sendEmailToken(user, EmailTokenType.VERIFY_EMAIL);
    return this.createSession(user);
  }

  async login(dto: LoginDto, address: string): Promise<SessionTokens> {
    const email = dto.email.trim().toLowerCase();
    const identity = createHash('sha256')
      .update(`${email}:${address}`)
      .digest('hex');
    const lockKey = `auth:login:lock:${identity}`;
    if ((await this.redis.client.exists(lockKey)) > 0) {
      throw new HttpException(
        'Too many unsuccessful sign-in attempts. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    const validPassword =
      user !== null &&
      user.deletedAt === null &&
      user.passwordHash !== null &&
      (await argon2.verify(user.passwordHash, dto.password));
    if (!validPassword || user === null) {
      const attemptsKey = `auth:login:attempts:${identity}`;
      const attempts = Number(
        await this.redis.client.eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",
          1,
          attemptsKey,
          LOCKOUT_SECONDS,
        ),
      );
      if (attempts >= 5) {
        await this.redis.client.set(lockKey, '1', 'EX', LOCKOUT_SECONDS);
      }
      throw new UnauthorizedException('Email or password is incorrect');
    }

    await this.redis.client.del(`auth:login:attempts:${identity}`, lockKey);
    return this.createSession(user);
  }

  async loginWithGoogle(dto: GoogleLoginDto): Promise<SessionTokens> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', {
      infer: true,
    });
    if (clientId.length === 0 || clientSecret.length === 0) {
      throw new BadRequestException('Google sign-in is not configured');
    }

    const redirectOrigin = new URL(dto.redirectUri).origin;
    const trustedOrigins = new Set([
      ...this.config.get('CORS_ORIGINS', { infer: true }),
      new URL(this.config.get('APP_URL', { infer: true })).origin,
    ]);
    if (!trustedOrigins.has(redirectOrigin)) {
      throw new BadRequestException('OAuth redirect origin is not allowed');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: dto.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: dto.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData: unknown = await tokenResponse.json();
    if (
      !tokenResponse.ok ||
      !isRecord(tokenData) ||
      typeof (tokenData as GoogleTokenResponse).access_token !== 'string'
    ) {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }

    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${(tokenData as GoogleTokenResponse).access_token}`,
        },
      },
    );
    const profileData: unknown = await profileResponse.json();
    if (
      !profileResponse.ok ||
      !isRecord(profileData) ||
      typeof (profileData as GoogleProfile).email !== 'string' ||
      (profileData as GoogleProfile).verified_email !== true
    ) {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }

    const profile = profileData as GoogleProfile;
    const email = profile.email?.trim().toLowerCase();
    if (email === undefined) {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }
    let user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        displayName:
          profile.name?.trim().slice(0, 40) || email.split('@')[0] || 'Friend',
        avatarUrl:
          profile.picture !== undefined &&
          /^https:\/\/.+/u.test(profile.picture)
            ? profile.picture
            : null,
        emailVerifiedAt: new Date(),
      },
      update: {},
    });
    if (user.deletedAt !== null) {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }
    if (user.emailVerifiedAt === null) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    return this.createSession(user);
  }

  async refresh(rawToken: string): Promise<SessionTokens> {
    const nextToken = randomBytes(32).toString('base64url');
    const nextHash = tokenHash(nextToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000);
    const outcome = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.refreshToken.findUnique({
        where: { tokenHash: tokenHash(rawToken) },
        include: { user: true },
      });
      if (current === null) return { status: 'invalid' as const };

      if (current.revokedAt !== null) {
        await transaction.refreshToken.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { status: 'reuse' as const };
      }
      if (
        current.expiresAt.getTime() <= Date.now() ||
        current.user.deletedAt !== null
      ) {
        await transaction.refreshToken.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { status: 'invalid' as const };
      }

      const claimed = await transaction.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count !== 1) {
        await transaction.refreshToken.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { status: 'reuse' as const };
      }

      await transaction.refreshToken.create({
        data: {
          userId: current.userId,
          tokenHash: nextHash,
          familyId: current.familyId,
          expiresAt,
        },
      });
      return { status: 'rotated' as const, user: current.user };
    });

    if (outcome.status === 'reuse') {
      throw new UnauthorizedException(
        'Refresh token reuse detected; this session has been revoked',
      );
    }
    if (outcome.status !== 'rotated') {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    return {
      accessToken: await this.createAccessToken(outcome.user),
      refreshToken: nextToken,
      user: {
        ...safeUser(outcome.user),
        avatarUrl: await this.minio.resolveAvatarUrl(outcome.user.avatarUrl),
      },
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken === undefined) return;
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
    });
    if (token === null) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: token.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (user === null) throw new UnauthorizedException();
    return {
      ...safeUser(user),
      avatarUrl: await this.minio.resolveAvatarUrl(user.avatarUrl),
    };
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (user === null) throw new UnauthorizedException();
    if (user.emailVerifiedAt === null) {
      await this.sendEmailToken(user, EmailTokenType.VERIFY_EMAIL);
    }
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const result = await this.prisma.$transaction(async (transaction) => {
      const emailToken = await transaction.emailToken.findUnique({
        where: { tokenHash: tokenHash(rawToken) },
      });
      if (
        emailToken === null ||
        emailToken.type !== EmailTokenType.VERIFY_EMAIL ||
        emailToken.consumedAt !== null ||
        emailToken.expiresAt.getTime() <= Date.now()
      ) {
        return false;
      }
      const consumed = await transaction.emailToken.updateMany({
        where: { id: emailToken.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return false;
      await transaction.user.update({
        where: { id: emailToken.userId },
        data: { emailVerifiedAt: new Date() },
      });
      return true;
    });
    if (!result)
      throw new BadRequestException('Email link is invalid or expired');
  }

  async requestPasswordReset(emailInput: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: emailInput.trim().toLowerCase(), deletedAt: null },
    });
    if (user !== null) {
      await this.sendEmailToken(user, EmailTokenType.PASSWORD_RESET);
    }
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const result = await this.prisma.$transaction(async (transaction) => {
      const emailToken = await transaction.emailToken.findUnique({
        where: { tokenHash: tokenHash(rawToken) },
      });
      if (
        emailToken === null ||
        emailToken.type !== EmailTokenType.PASSWORD_RESET ||
        emailToken.consumedAt !== null ||
        emailToken.expiresAt.getTime() <= Date.now()
      ) {
        return false;
      }
      const consumed = await transaction.emailToken.updateMany({
        where: { id: emailToken.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return false;
      await transaction.user.update({
        where: { id: emailToken.userId },
        data: { passwordHash },
      });
      await transaction.refreshToken.updateMany({
        where: { userId: emailToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    });
    if (!result)
      throw new BadRequestException('Password link is invalid or expired');
  }

  async createSession(user: User): Promise<SessionTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(refreshToken),
        familyId: randomBytes(16).toString('hex'),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000),
      },
    });
    return {
      accessToken: await this.createAccessToken(user),
      refreshToken,
      user: {
        ...safeUser(user),
        avatarUrl: await this.minio.resolveAvatarUrl(user.avatarUrl),
      },
    };
  }

  toAuthResponse(session: SessionTokens): AuthResponse {
    return {
      accessToken: session.accessToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_SECONDS,
      user: session.user,
    };
  }

  private async createAccessToken(user: User): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, roles: ['user'] },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: ACCESS_TOKEN_SECONDS,
      },
    );
  }

  private async sendEmailToken(
    user: User,
    type: EmailTokenType,
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.emailToken.updateMany({
        where: { userId: user.id, type, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(rawToken),
          type,
          expiresAt: new Date(Date.now() + AUTH_TOKEN_SECONDS * 1000),
        },
      }),
    ]);
    const verification = type === EmailTokenType.VERIFY_EMAIL;
    const action = verification ? 'verify-email' : 'reset-password';
    await this.mail.sendAccountEmail({
      to: user.email,
      subject: verification
        ? 'A little note to verify your 2Seats email'
        : 'A safe link to reset your 2Seats password',
      title: verification ? 'One small hello' : 'Let’s get you back in',
      message: verification
        ? 'Please confirm this email address so your movie nights stay yours.'
        : 'Use this link to choose a new password. If you did not ask for it, you can ignore this note.',
      actionLabel: verification ? 'Verify my email' : 'Reset my password',
      actionUrl: `${this.config.get('APP_URL', { infer: true })}/${action}?token=${encodeURIComponent(rawToken)}`,
    });
  }
}
