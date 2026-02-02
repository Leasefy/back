import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums/index.js';

/**
 * DTO for creating a tenant payment request.
 *
 * Tenant submits payment details with receipt for landlord validation.
 * Amount defaults to lease monthly rent if not provided.
 *
 * Requirements: TPAY-06
 */
export class CreatePaymentRequestDto {
  @ApiPropertyOptional({
    description: 'Amount in COP (defaults to lease rent)',
    example: 1500000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'Amount must be at least 1000 COP' })
  amount?: number;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method used',
    example: 'BANK_TRANSFER',
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    description: 'Month of the rental period (1-12)',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({
    description: 'Year of the rental period (e.g., 2026)',
    example: 2026,
  })
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear!: number;

  @ApiProperty({
    description: 'Date when payment was made (YYYY-MM-DD)',
    example: '2026-02-01',
  })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional({
    description: 'Reference number from receipt or transaction',
    example: 'REF-12345',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;
}
