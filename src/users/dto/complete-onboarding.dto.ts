import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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
  /** Usuario que quiere arrendar inmuebles (busca donde vivir) */
  TENANT = 'TENANT',
  /** Usuario que arrienda inmuebles a otros (propietario) */
  LANDLORD = 'LANDLORD',
  /** Agente inmobiliario que gestiona propiedades de otros */
  AGENT = 'AGENT',
  /** Empresa inmobiliaria que gestiona propiedades para múltiples propietarios */
  INMOBILIARIA = 'INMOBILIARIA',
}

/**
 * Agency data for INMOBILIARIA onboarding.
 * Required when userType === 'INMOBILIARIA'.
 */
export class CreateAgencyInOnboardingDto {
  @ApiProperty({ example: 'Inmobiliaria ABC', description: 'Nombre de la inmobiliaria' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la inmobiliaria es requerido' })
  name!: string;

  @ApiPropertyOptional({ example: '900123456-7', description: 'NIT de la empresa' })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional({ example: 'Bogota', description: 'Ciudad de la inmobiliaria' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '3001234567', description: 'Telefono de contacto' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contacto@inmobiliaria.com', description: 'Email de contacto' })
  @IsOptional()
  @IsEmail({}, { message: 'Email de la inmobiliaria invalido' })
  email?: string;
}

/**
 * DTO for completing user onboarding after Google OAuth registration.
 *
 * This endpoint allows new users to:
 * 1. Set their profile information (name, phone)
 * 2. Select their user type (tenant, landlord, agent, or inmobiliaria)
 * 3. If INMOBILIARIA: provide agency data to create the agency automatically
 *
 * @example
 * POST /users/me/onboarding
 * {
 *   "firstName": "Juan",
 *   "lastName": "Garcia",
 *   "phone": "+573001234567",
 *   "userType": "LANDLORD"
 * }
 *
 * @example
 * POST /users/me/onboarding
 * {
 *   "firstName": "Carlos",
 *   "lastName": "Lopez",
 *   "userType": "INMOBILIARIA",
 *   "agency": { "name": "Inmobiliaria Lopez", "city": "Medellin" }
 * }
 */
export class CompleteOnboardingDto {
  /**
   * User's first name
   * @example "Juan"
   */
  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName!: string;

  /**
   * User's last name
   * @example "Garcia"
   */
  @ApiProperty({ example: 'Garcia', description: 'Apellido del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName!: string;

  /**
   * User's phone number (Colombian mobile format)
   * @example "+573001234567"
   */
  @ApiPropertyOptional({ example: '+573001234567', description: 'Telefono movil colombiano' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+57)?3[0-9]{9}$/, {
    message: 'Numero de telefono invalido. Formato: +573XXXXXXXXX o 3XXXXXXXXX',
  })
  phone?: string;

  /**
   * Type of user account:
   * - TENANT: Looking to rent a property (inquilino)
   * - LANDLORD: Has properties to rent out (propietario)
   * - AGENT: Real estate agent managing properties for landlords
   * - INMOBILIARIA: Real estate company managing multiple properties
   *
   * @example "LANDLORD"
   */
  @ApiProperty({
    enum: UserType,
    example: UserType.LANDLORD,
    description: 'Tipo de cuenta de usuario',
  })
  @IsEnum(UserType, {
    message: 'Tipo de usuario invalido. Debe ser: TENANT, LANDLORD, AGENT o INMOBILIARIA',
  })
  @IsNotEmpty({ message: 'El tipo de usuario es requerido' })
  userType!: UserType;

  /**
   * Agency data — required when userType === 'INMOBILIARIA'.
   * Ignored for other user types.
   */
  @ApiPropertyOptional({
    type: () => CreateAgencyInOnboardingDto,
    description: 'Datos de la inmobiliaria (requerido cuando userType es INMOBILIARIA)',
  })
  @IsOptional()
  @ValidateIf((o: CompleteOnboardingDto) => o.userType === UserType.INMOBILIARIA)
  @IsNotEmpty({ message: 'Los datos de la agencia son requeridos para una inmobiliaria' })
  @ValidateNested()
  @Type(() => CreateAgencyInOnboardingDto)
  agency?: CreateAgencyInOnboardingDto;
}
