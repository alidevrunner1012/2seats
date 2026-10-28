import { IsBoolean, IsString, MinLength } from 'class-validator';

export class MuteParticipantDto {
  @IsString()
  @MinLength(1)
  identity!: string;

  @IsString()
  @MinLength(1)
  trackSid!: string;

  @IsBoolean()
  muted!: boolean;
}
