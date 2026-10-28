import { Controller, Delete, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard, PrismaService, RoomMemberGuard } from '../_adapters';
import { BrowserSessionService } from './browser-session.service';

@Controller('rooms/:roomId/browser-session')
@UseGuards(JwtAuthGuard, RoomMemberGuard)
export class BrowserSessionController {
  constructor(private readonly sessions: BrowserSessionService, private readonly prisma: PrismaService) {}

  /** Host always; others only when the room allows everyone to control. */
  private async assertMayControl(roomId: string, userId: string) {
    const [room, member] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.roomMember.findFirst({ where: { roomId, userId } }),
    ]);
    if (!room || !member) throw new ForbiddenException();
    if (member.role !== 'HOST' && !room.everyoneCanControl) throw new ForbiddenException('Only the host can do this');
  }

  @Get() status(@CurrentUser() u: AuthUser, @Param('roomId') roomId: string) {
    return this.sessions.status(u.id, roomId, u.displayName);
  }
  @Post() async start(@CurrentUser() u: AuthUser, @Param('roomId') roomId: string) {
    await this.assertMayControl(roomId, u.id);
    return this.sessions.start(u.id, roomId, u.displayName);
  }
  @Post('extend') async extend(@CurrentUser() u: AuthUser, @Param('roomId') roomId: string) {
    await this.assertMayControl(roomId, u.id);
    return this.sessions.extend(roomId);
  }
  @Delete() async stop(@CurrentUser() u: AuthUser, @Param('roomId') roomId: string) {
    await this.assertMayControl(roomId, u.id);
    await this.sessions.stopForRoom(roomId);
    return { ok: true };
  }
}
