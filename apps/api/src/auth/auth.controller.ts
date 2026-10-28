import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { REFRESH_COOKIE } from './auth.constants';
import { AuthService, type SafeUser, type SessionTokens } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './authenticated-user';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  AuthMessageDto,
  AuthResponseDto,
  GoogleLoginDto,
  LoginDto,
  PasswordResetDto,
  RequestEmailDto,
  SafeUserDto,
  SignupDto,
  TokenDto,
} from './dto/auth.dto';

@ApiTags('auth')
@UseGuards(AuthRateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Account created' })
  @ApiConflictResponse({ description: 'Email address is already registered' })
  @ApiTooManyRequestsResponse()
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const session = await this.auth.signup(dto);
    this.setRefreshCookie(reply, session);
    return this.auth.toAuthResponse(session);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto, description: 'Signed in' })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or locked account',
  })
  @ApiTooManyRequestsResponse()
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const session = await this.auth.login(dto, request.ip);
    this.setRefreshCookie(reply, session);
    return this.auth.toAuthResponse(session);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Signed in with Google',
  })
  @ApiUnauthorizedResponse({
    description: 'Google account could not be verified',
  })
  async google(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const session = await this.auth.loginWithGoogle(dto);
    this.setRefreshCookie(reply, session);
    return this.auth.toAuthResponse(session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ type: AuthResponseDto, description: 'Access token renewed' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
  })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const token = request.cookies?.[REFRESH_COOKIE];
    if (token === undefined) {
      throw new UnauthorizedException('Refresh cookie is missing');
    }
    const session = await this.auth.refresh(token);
    this.setRefreshCookie(reply, session);
    return this.auth.toAuthResponse(session);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiNoContentResponse({ description: 'Session revoked' })
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: SafeUserDto, description: 'Current signed-in user' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<SafeUser> {
    return this.auth.getCurrentUser(user.id);
  }

  @Post('email/verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthMessageDto })
  async requestVerification(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuthMessageDto> {
    await this.auth.requestEmailVerification(user.id);
    return {
      message: 'If your email needs verification, a link is on its way.',
    };
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: TokenDto })
  @ApiOkResponse({ type: AuthMessageDto })
  async verifyEmail(@Body() dto: TokenDto): Promise<AuthMessageDto> {
    await this.auth.verifyEmail(dto.token);
    return { message: 'Your email is verified. Welcome back to your seat.' };
  }

  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: RequestEmailDto })
  @ApiOkResponse({ type: AuthMessageDto })
  async requestPasswordReset(
    @Body() dto: RequestEmailDto,
  ): Promise<AuthMessageDto> {
    await this.auth.requestPasswordReset(dto.email);
    return { message: 'If an account exists, a reset link is on its way.' };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password using a single-use email token' })
  @ApiOkResponse({ type: AuthMessageDto })
  async resetPassword(@Body() dto: PasswordResetDto): Promise<AuthMessageDto> {
    await this.auth.resetPassword(dto.token, dto.password);
    return {
      message: 'Your password has been changed. You can sign in again.',
    };
  }

  private setRefreshCookie(reply: FastifyReply, session: SessionTokens): void {
    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
}
