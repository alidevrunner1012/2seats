import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../_adapters';
import { DmcaService } from './dmca.service';
import { ModerationService, REPORT_REASONS } from './moderation.service';
import { CURRENT_TOS_VERSION, TosService } from './tos.service';

class ReportDto {
  @IsOptional() @IsString() targetUserId?: string;
  @IsOptional() @IsString() messageId?: string;
  @IsIn(REPORT_REASONS) reason!: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}
class TakedownDto {
  @IsIn(['domain', 'url']) kind!: 'domain' | 'url';
  @IsString() @MaxLength(500) value!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
class ResolveDto { @IsIn(['RESOLVED', 'DISMISSED']) status!: 'RESOLVED' | 'DISMISSED'; }

@Controller()
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(
    private readonly mod: ModerationService,
    private readonly tos: TosService,
    private readonly dmca: DmcaService,
  ) {}

  @Post('reports') report(@CurrentUser() u: AuthUser, @Body() d: ReportDto) { return this.mod.report(u.id, d); }
  @Post('blocks/:userId') block(@CurrentUser() u: AuthUser, @Param('userId') id: string) { return this.mod.block(u.id, id); }
  @Delete('blocks/:userId') unblock(@CurrentUser() u: AuthUser, @Param('userId') id: string) { return this.mod.unblock(u.id, id); }
  @Post('tos/accept') accept(@CurrentUser() u: AuthUser) { return this.tos.accept(u.id).then(() => ({ ok: true, version: CURRENT_TOS_VERSION })); }

  // ---- admin ----
  @Get('admin/reports') @UseGuards(RolesGuard) @Roles('ADMIN')
  reports(@Query('status') s?: string, @Query('cursor') c?: string) { return this.mod.listReports(s, c); }
  @Post('admin/reports/:id/resolve') @UseGuards(RolesGuard) @Roles('ADMIN')
  resolve(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: ResolveDto) { return this.mod.resolveReport(u.id, id, d.status); }
  @Post('admin/users/:id/ban') @UseGuards(RolesGuard) @Roles('ADMIN')
  ban(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.mod.banUser(u.id, id); }
  @Get('admin/audit-logs') @UseGuards(RolesGuard) @Roles('ADMIN')
  audit(@Query('cursor') c?: string) { return this.mod.auditLogs(c); }
  @Get('admin/takedowns') @UseGuards(RolesGuard) @Roles('ADMIN') takedowns() { return this.dmca.list(); }
  @Post('admin/takedowns') @UseGuards(RolesGuard) @Roles('ADMIN')
  addTakedown(@CurrentUser() u: AuthUser, @Body() d: TakedownDto) { return this.dmca.add(u.id, d.kind, d.value, d.note); }
  @Delete('admin/takedowns/:id') @UseGuards(RolesGuard) @Roles('ADMIN')
  removeTakedown(@Param('id') id: string) { return this.dmca.remove(id).then(() => ({ ok: true })); }
}
