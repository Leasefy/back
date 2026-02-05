import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Step 1: Personal Information
 * Basic tenant identification data.
 */
export class PersonalInfoDto {
  @ApiProperty({
    description: 'Full legal name',
    example: 'Juan Carlos Perez Rodriguez',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({
    description: 'Colombian cedula number',
    example: '1234567890',
  })
  @IsString()
  @Matches(/^\d{6,10}$/, { message: 'Cedula must be 6-10 digits' })
  cedula!: string;

  @ApiProperty({ description: 'Date of birth', example: '1990-05-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'juan.perez@email.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Contact phone (Colombian mobile)',
    example: '+573001234567',
  })
  @Matches(/^(\+57)?3[0-9]{9}$/, {
    message: 'Phone must be a valid Colombian mobile number',
  })
  phone!: string;

  @ApiPropertyOptional({
    description: 'Current address',
    example: 'Calle 123 #45-67, Bogota',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentAddress?: string;
}
