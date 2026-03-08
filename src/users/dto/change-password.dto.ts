import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification. Required when user has an email/password credential. Omit for Google-only accounts.',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ description: 'New password (min 8 chars)', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
