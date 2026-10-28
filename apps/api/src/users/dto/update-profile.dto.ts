import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  displayName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: true, protocols: ['https'] })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
