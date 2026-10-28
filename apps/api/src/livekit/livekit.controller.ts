import { BadRequestException, Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LiveKitService } from './livekit.service';
import { RoomHostGuard } from '../rooms/room-host.guard';
import { MuteParticipantDto } from './livekit.dto';

type RawBodyRequest = FastifyRequest & { rawBody?: Buffer };

@ApiTags('livekit')
@Controller()
export class LiveKitController {
  constructor(private readonly liveKit: LiveKitService) {}

  @Post('rooms/:id/livekit-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  token(@CurrentUser() user: AuthenticatedUser, @Param('id') roomId: string) {
    return this.liveKit.token(user, roomId);
  }

  @Post('rooms/:id/livekit/mute')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoomHostGuard)
  async mute(@Param('id') roomId: string, @Body() dto: MuteParticipantDto): Promise<void> {
    await this.liveKit.muteParticipant(roomId, dto.identity, dto.trackSid, dto.muted);
  }

  @Post('webhooks/livekit')
  async webhook(
    @Req() request: RawBodyRequest,
    @Headers('authorization') authorization?: string,
    @Body() body?: unknown,
  ): Promise<void> {
    const raw = request.rawBody?.toString('utf8') ?? (typeof body === 'string' ? body : JSON.stringify(body));
    if (raw === undefined) throw new BadRequestException('Webhook body is required.');
    await this.liveKit.webhook(raw, authorization);
  }
}
