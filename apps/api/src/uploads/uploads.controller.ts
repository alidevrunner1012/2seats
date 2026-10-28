import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { CurrentUser, JwtAuthGuard, AuthUser } from '../_adapters';
import { UPLOAD_KINDS } from './uploads.rules';
import { UploadsService } from './uploads.service';

class PresignDto {
  @IsIn(UPLOAD_KINDS) kind!: string;
  @IsString() mime!: string;
  @IsInt() @Min(1) @Max(2_000_000_000) size!: number;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}
  @Post('presign') presign(@CurrentUser() u: AuthUser, @Body() dto: PresignDto) {
    return this.uploads.presign(u.id, dto.kind, dto.mime, dto.size);
  }
  @Post(':id/confirm') confirm(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.uploads.confirm(u.id, id);
  }
  @Get(':id/url') url(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.uploads.readUrl(u.id, id);
  }
}
