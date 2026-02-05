import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

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
}

/**
 * DTO for completing user onboarding after Google OAuth registration.
 *
 * This endpoint allows new users to:
 * 1. Set their profile information (name, phone)
 * 2. Select their user type (tenant, landlord, or agent)
 *
 * @example
 * POST /users/me/onboarding
 * {
 *   "firstName": "Juan",
 *   "lastName": "Garcia",
 *   "phone": "+573001234567",
 *   "userType": "LANDLORD"
 * }
 */
export class CompleteOnboardingDto {
  /**
   * User's first name
   * @example "Juan"
   */
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName!: string;

  /**
   * User's last name
   * @example "Garcia"
   */
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName!: string;

  /**
   * User's phone number (Colombian mobile format)
   * @example "+573001234567"
   */
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
   *
   * @example "LANDLORD"
   */
  @IsEnum(UserType, {
    message: 'Tipo de usuario invalido. Debe ser: TENANT, LANDLORD, o AGENT',
  })
  @IsNotEmpty({ message: 'El tipo de usuario es requerido' })
  userType!: UserType;
}
