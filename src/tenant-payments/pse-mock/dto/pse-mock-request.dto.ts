import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ColombianBank } from '../../../common/enums/index.js';

/**
 * DTO for PSE mock payment request.
 * Simulates real PSE form data for online banking payment.
 *
 * Requirement: TPAY-07
 */
export class PseMockRequestDto {
  @ApiProperty({ description: 'Lease ID for the payment' })
  @IsUUID()
  leaseId!: string;

  @ApiPropertyOptional({
    description: 'Amount in COP (defaults to lease rent)',
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  amount?: number;

  @ApiProperty({ description: 'Payment period month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({ description: 'Payment period year (e.g., 2026)' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear!: number;

  // PSE form fields
  @ApiProperty({ enum: ['NATURAL', 'JURIDICA'], description: 'Person type' })
  @IsIn(['NATURAL', 'JURIDICA'])
  personType!: 'NATURAL' | 'JURIDICA';

  @ApiProperty({
    enum: ['CC', 'CE', 'NIT', 'PASAPORTE'],
    description: 'Document type',
  })
  @IsIn(['CC', 'CE', 'NIT', 'PASAPORTE'])
  documentType!: 'CC' | 'CE' | 'NIT' | 'PASAPORTE';

  @ApiProperty({ description: 'Document number (6-15 digits)' })
  @IsString()
  @Matches(/^\d{6,15}$/, { message: 'Document number must be 6-15 digits' })
  documentNumber!: string;

  @ApiProperty({ description: 'Full name of payer' })
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ColombianBank, description: 'Bank code for PSE' })
  @IsEnum(ColombianBank)
  bankCode!: ColombianBank;
}
