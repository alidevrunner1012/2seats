import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Avery' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  displayName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class GoogleLoginDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  code!: string;

  @ApiProperty({ example: 'http://localhost:3000/auth/callback' })
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  redirectUri!: string;
}

export class TokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string;
}

export class PasswordResetDto extends TokenDto {
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class RequestEmailDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class SafeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  emailVerified!: boolean;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  tokenType!: 'Bearer';

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty()
  user!: SafeUserDto;
}

export class AuthMessageDto {
  @ApiProperty()
  message!: string;
}
