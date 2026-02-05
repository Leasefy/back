import {
  IsString,
  IsEnum,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ColombianBank } from '../../common/enums/index.js';

/**
 * DTO for PSE payment data in subscription operations.
 * Contains the PSE form fields needed for mock payment processing.
 *
 * Reuses same PSE field pattern from tenant-payments module.
 */
export class PseSubscriptionPaymentDto {
  @ApiProperty({
    enum: ['CC', 'CE', 'NIT', 'PASAPORTE'],
    description: 'Document type',
  })
  @IsString()
  documentType!: string;

  @ApiProperty({
    description: 'Document number (Colombian cedula, 6-15 digits)',
  })
  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'El numero de documento debe tener entre 6 y 15 digitos',
  })
  documentNumber!: string;

  @ApiProperty({
    enum: ColombianBank,
    description: 'Bank code for PSE payment',
  })
  @IsEnum(ColombianBank)
  bankCode!: ColombianBank;

  @ApiProperty({
    description: 'Full name of account holder (min 3 characters)',
  })
  @IsString()
  @MinLength(3)
  holderName!: string;

  @ApiPropertyOptional({ description: 'Colombian phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+57)?3[0-9]{9}$/, {
    message: 'El numero de telefono debe ser un celular colombiano valido',
  })
  phoneNumber?: string;
}
