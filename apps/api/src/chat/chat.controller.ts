import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CursorQueryDto } from '../rooms/dto/room.dto';
import { RoomMemberGuard } from '../rooms/room-member.guard';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoomMemberGuard)
@Controller('rooms/:id/messages')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(
    @CurrentUser() _user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: CursorQueryDto,
  ) {
    return this.chat.list(id, query.cursor, query.limit);
  }
}
