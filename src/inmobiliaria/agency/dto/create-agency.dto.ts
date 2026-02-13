import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEmail, Min, Max } from 'class-validator';

/**
 * DTO for creating a new agency.
 * The creator is automatically added as ADMIN member.
 */
export class CreateAgencyDto {
  @ApiProperty({ example: 'Inmobiliaria ABC', description: 'Agency name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '900123456-7', description: 'NIT (tax ID)' })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional({ example: 'Calle 100 #15-20, Oficina 301', description: 'Office address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bogota', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '3001234567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contacto@inmobiliariaABC.com', description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 10, description: 'Default commission percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultCommissionPercent?: number;
}
