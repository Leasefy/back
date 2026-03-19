import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User type selection during onboarding.
 * Maps to the Role enum in the database.
 */
export enum UserType {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  AGENT = 'AGENT',
  INMOBILIARIA = 'INMOBILIARIA',
}

/**
 * Agency data for INMOBILIARIA onboarding.
 * Required when userType === 'INMOBILIARIA'.
 */
export class CreateAgencyInOnboardingDto {
  @ApiProperty({ example: 'Inmobiliaria ABC' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la inmobiliaria es requerido' })
  name!: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional({ example: 'Bogota' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contacto@inmobiliaria.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email de la inmobiliaria invalido' })
  email?: string;

  // Business profile fields (saved to agencies table)
  @ApiPropertyOptional({ example: 'small', enum: ['small', 'medium', 'large', 'enterprise'] })
  @IsOptional()
  @IsString()
  portfolioSize?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsInBusiness?: number;

  @ApiPropertyOptional({ example: ['arriendos', 'ventas'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ example: 'https://miinmobiliaria.com' })
  @IsOptional()
  @IsString()
  website?: string;
}

/**
 * DTO for completing user onboarding.
 * Accepts all role-specific fields and persists them to the database.
 */
export class CompleteOnboardingDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName!: string;

  @ApiProperty({ example: 'Garcia' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+57)?3[0-9]{9}$/, {
    message: 'Numero de telefono invalido. Formato: +573XXXXXXXXX o 3XXXXXXXXX',
  })
  phone?: string;

  @ApiProperty({ enum: UserType, example: UserType.LANDLORD })
  @IsEnum(UserType, {
    message: 'Tipo de usuario invalido. Debe ser: TENANT, LANDLORD, AGENT o INMOBILIARIA',
  })
  @IsNotEmpty({ message: 'El tipo de usuario es requerido' })
  userType!: UserType;

  /** CC para personas naturales (inquilino/propietario) o RUT para inmobiliaria */
  @ApiPropertyOptional({ example: '1090525663', description: 'Cédula de ciudadanía o RUT' })
  @IsOptional()
  @IsString()
  rut?: string;

  // ── Common extended fields ──────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'whatsapp', enum: ['whatsapp', 'email', 'phone'] })
  @IsOptional()
  @IsString()
  preferredContact?: string;

  // ── Tenant-specific fields ──────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'employed' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ example: 'Empresa S.A.' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalIncome?: number;

  @ApiPropertyOptional({ example: 800000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ example: 1500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ example: ['Chapinero', 'Usaquén'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredZones?: string[];

  @ApiPropertyOptional({ example: ['parking', 'gym'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredAmenities?: string[];

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsString()
  moveInDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasPets?: boolean;

  @ApiPropertyOptional({ example: 'Un perro pequeño' })
  @IsOptional()
  @IsString()
  petDetails?: string;

  // ── Landlord-specific fields ────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'apartment', enum: ['apartment', 'house', 'studio', 'room'] })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString()
  propertyCity?: string;

  @ApiPropertyOptional({ example: 2000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedRent?: number;

  // ── Inmobiliaria agency data ────────────────────────────────────────────────

  @ApiPropertyOptional({ type: () => CreateAgencyInOnboardingDto })
  @IsOptional()
  @ValidateIf((o: CompleteOnboardingDto) => o.userType === UserType.INMOBILIARIA)
  @IsNotEmpty({ message: 'Los datos de la agencia son requeridos para una inmobiliaria' })
  @ValidateNested()
  @Type(() => CreateAgencyInOnboardingDto)
  agency?: CreateAgencyInOnboardingDto;
}
