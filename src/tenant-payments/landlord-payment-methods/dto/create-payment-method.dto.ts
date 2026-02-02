import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, AccountType } from '../../../common/enums/index.js';

/**
 * DTO for creating a new landlord payment method.
 * Landlords configure bank accounts for tenants to use when paying rent.
 *
 * Requirements: TPAY-01, TPAY-02
 */
export class CreateLandlordPaymentMethodDto {
  @ApiProperty({
    description: 'Bank name',
    example: 'Bancolombia',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  bankName!: string;

  @ApiProperty({
    enum: AccountType,
    description: 'Account type (AHORROS or CORRIENTE)',
    example: AccountType.AHORROS,
  })
  @IsEnum(AccountType)
  accountType!: AccountType;

  @ApiProperty({
    description: 'Account number',
    example: '123456789',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  accountNumber!: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'Juan Perez',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  holderName!: string;

  @ApiPropertyOptional({
    description: 'Phone number for Nequi/Daviplata (Colombian mobile format: 3XXXXXXXXX)',
    example: '3001234567',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^3[0-9]{9}$/, {
    message: 'Phone must be Colombian mobile format (3XXXXXXXXX)',
  })
  phoneNumber?: string;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method type',
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod)
  methodType!: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Instructions for tenant',
    example: 'Incluir numero de apartamento en referencia',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}
