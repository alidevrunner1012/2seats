import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { REFRESH_COOKIE } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUserDto } from '../auth/dto/auth.dto';
import type { SafeUser } from '../auth/auth.service';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AvatarUploadResponse,
  CompleteAvatarUploadDto,
  CreateAvatarUploadDto,
} from './dto/avatar-upload.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @ApiOkResponse({ type: SafeUserDto, description: 'Updated profile' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    return this.users.updateProfile(user, dto);
  }

  @Post('me/avatar/presign')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Short-lived avatar upload URL' })
  createAvatarUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAvatarUploadDto,
  ): Promise<AvatarUploadResponse> {
    return this.users.createAvatarUpload(user, dto);
  }

  @Post('me/avatar/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SafeUserDto, description: 'Avatar saved to profile' })
  completeAvatarUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteAvatarUploadDto,
  ): Promise<SafeUser> {
    return this.users.completeAvatarUpload(user, dto);
  }

  @Get('me/export')
  @ApiOkResponse({ description: 'Personal data export' })
  exportData(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.users.exportData(user.id);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Account and associated personal data erased',
  })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.users.deleteAccount(user.id);
    reply.clearCookie(REFRESH_COOKIE, {
      path: '/auth',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    });
  }
}
