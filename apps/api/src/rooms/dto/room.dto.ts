import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Friday night, together' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ default: 2, minimum: 2, maximum: 2 })
  @IsOptional()
  @IsInt()
  @Min(2)
  maxParticipants?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class JoinRoomDto {
  @ApiProperty({ example: 'ABCD-EFGH' })
  @IsString()
  @MinLength(4)
  @MaxLength(512)
  invite!: string;
}

export class RoomMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;
}

export class RoomSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  inviteCode!: string;

  @ApiProperty()
  role!: 'HOST' | 'PARTICIPANT';

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: [RoomMemberDto] })
  members!: RoomMemberDto[];

  @ApiPropertyOptional({ nullable: true })
  lastMovieTitle!: string | null;
}

export class RoomSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  everyoneCanControl?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  screenShareEnabled?: boolean;
}

export class ScheduleDateDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  scheduledFor!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateScheduleDateDto extends ScheduleDateDto {}

export class CursorQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit = 20;
}
