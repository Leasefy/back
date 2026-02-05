import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * DTO for updating user profile information.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'Juan',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Garcia',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    description: 'Colombian mobile phone number',
    example: '+573001234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+57)?3[0-9]{9}$/, {
    message:
      'Phone must be a valid Colombian mobile number (e.g., +573001234567 or 3001234567)',
  })
  phone?: string;
}
