import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CursorQueryDto,
  CreateRoomDto,
  JoinRoomDto,
  RoomSettingsDto,
  RoomSummaryDto,
  ScheduleDateDto,
  UpdateScheduleDateDto,
} from './dto/room.dto';
import { RoomHostGuard } from './room-host.guard';
import { RoomMemberGuard } from './room-member.guard';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post('rooms')
  @ApiCreatedResponse({ type: RoomSummaryDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<RoomSummaryDto> {
    return this.rooms.create(user, dto, idempotencyKey);
  }

  @Post('rooms/:id/invite')
  @UseGuards(RoomHostGuard)
  invite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<{ token: string; expiresIn: number }> {
    return this.rooms.createInvite(user, id);
  }

  @Get('rooms/join/:token')
  joinToken(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string): Promise<RoomSummaryDto> {
    return this.rooms.joinByToken(user, token);
  }

  @Post('rooms/join')
  @HttpCode(HttpStatus.OK)
  join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinRoomDto): Promise<RoomSummaryDto> {
    return this.rooms.join(user, dto);
  }

  @Get('rooms/recent')
  recent(@CurrentUser() user: AuthenticatedUser): Promise<RoomSummaryDto[]> {
    return this.rooms.recent(user);
  }

  @Get('rooms/:id')
  @UseGuards(RoomMemberGuard)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<RoomSummaryDto> {
    return this.rooms.get(user, id);
  }

  @Post('rooms/:id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomMemberGuard)
  async leave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.rooms.leave(user, id);
  }

  @Post('rooms/:id/lock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomHostGuard)
  async lock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.rooms.setLocked(user, id, true);
  }

  @Post('rooms/:id/unlock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomHostGuard)
  async unlock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.rooms.setLocked(user, id, false);
  }

  @Patch('rooms/:id/settings')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomHostGuard)
  async settings(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RoomSettingsDto): Promise<void> {
    await this.rooms.updateSettings(user, id, dto);
  }

  @Post('rooms/:id/members/:memberId/kick')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomHostGuard)
  async kick(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('memberId') memberId: string): Promise<void> {
    await this.rooms.kick(user, id, memberId);
  }

  @Post('rooms/:id/host/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomHostGuard)
  async transferHost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('memberId') memberId: string): Promise<void> {
    await this.rooms.transferHost(user, id, memberId);
  }

  @Get('rooms/:id/history')
  @UseGuards(RoomMemberGuard)
  history(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query() query: CursorQueryDto) {
    return this.rooms.history(user, id, query);
  }

  @Post('rooms/:id/dates')
  @UseGuards(RoomMemberGuard)
  schedule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ScheduleDateDto) {
    return this.rooms.schedule(user, id, dto);
  }

  @Get('rooms/:id/dates')
  @UseGuards(RoomMemberGuard)
  dates(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rooms.dates(user, id);
  }

  @Patch('rooms/:id/dates/:dateId')
  @UseGuards(RoomMemberGuard)
  updateDate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('dateId') dateId: string, @Body() dto: UpdateScheduleDateDto) {
    return this.rooms.updateDate(user, id, dateId, dto);
  }

  @Delete('rooms/:id/dates/:dateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoomMemberGuard)
  async deleteDate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('dateId') dateId: string): Promise<void> {
    await this.rooms.deleteDate(user, id, dateId);
  }

  @Get('me/next-date')
  nextDate(@CurrentUser() user: AuthenticatedUser) {
    return this.rooms.nextDate(user);
  }

  @Get('me/watch-history')
  watchHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: CursorQueryDto) {
    return this.rooms.watchHistory(user, query);
  }
}
