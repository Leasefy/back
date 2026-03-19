import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

/**
 * DTO for updating user profile information.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateProfileDto {
  @ApiProperty({ description: 'User first name', example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ description: 'User last name', example: 'Garcia', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ description: 'Colombian mobile phone number', example: '+573001234567', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(\+57)?3[0-9]{9}$/, {
    message: 'Phone must be a valid Colombian mobile number (e.g., +573001234567 or 3001234567)',
  })
  phone?: string;

  @ApiProperty({ description: 'National ID (RUT/CC/NIT)', example: '76.543.210-K', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @ApiProperty({ description: 'Physical address', example: 'Cra 7 #32-16, Bogotá', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ description: 'Date of birth (ISO 8601)', example: '1990-05-20', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ description: 'Emergency contact name', example: 'Carlos Pérez', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @ApiProperty({ description: 'Emergency contact phone', example: '3001234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @ApiProperty({ description: 'Avatar image URL', required: false })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
