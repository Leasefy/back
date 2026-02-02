import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsEnum,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums/index.js';

/**
 * DTO for recording a payment
 * Landlord records payments received from tenant
 *
 * Requirements: LEAS-04, LEAS-05
 */
export class CreatePaymentDto {
  @ApiProperty({ example: 2500000, description: 'Amount in COP' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.PSE,
    description: 'Payment method used',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({
    example: 'CUS123456789012',
    description: 'Payment reference number (PSE CUS, bank reference, receipt #)',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  referenceNumber!: string;

  @ApiProperty({
    example: '2026-02-05',
    description: 'Date payment was made (ISO 8601)',
  })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({
    example: 2,
    description: 'Month this payment covers (1-12)',
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({
    example: 2026,
    description: 'Year this payment covers',
    minimum: 2020,
    maximum: 2100,
  })
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear!: number;

  @ApiPropertyOptional({
    example: 'Paid via Nequi transfer',
    description: 'Optional notes about the payment',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
