import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export class CreateAvatarUploadDto {
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @ApiProperty({ minimum: 1, maximum: MAX_AVATAR_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_AVATAR_BYTES)
  sizeBytes!: number;
}

export class CompleteAvatarUploadDto {
  @ApiProperty({ example: 'avatars/user-id/uuid' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  @Matches(/^avatars\/[a-zA-Z0-9_-]+\/[a-f0-9-]+$/)
  objectKey!: string;
}

export interface AvatarUploadResponse {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
}
