import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InsuranceTier } from '../../common/enums/index.js';

class CustomClauseDto {
  @ApiProperty({ example: 'SEXTA. MASCOTAS' })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'Se permite una mascota de hasta 10kg.' })
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class CreateContractDto {
  @ApiProperty({ description: 'ID of approved application' })
  @IsUUID()
  applicationId!: string;

  @ApiProperty({
    example: '2026-03-01',
    description: 'Contract start date (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    example: '2027-02-28',
    description: 'Contract end date (YYYY-MM-DD)',
  })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 2500000, description: 'Monthly rent in COP' })
  @IsInt()
  @Min(100000)
  monthlyRent!: number;

  @ApiProperty({ example: 5000000, description: 'Deposit amount in COP' })
  @IsInt()
  @Min(0)
  deposit!: number;

  @ApiProperty({ example: 5, description: 'Payment due day of month (1-28)' })
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDay!: number;

  @ApiPropertyOptional({
    enum: InsuranceTier,
    default: InsuranceTier.NONE,
    description: 'Insurance tier: NONE, BASIC, or PREMIUM',
  })
  @IsEnum(InsuranceTier)
  @IsOptional()
  insuranceTier?: InsuranceTier;

  @ApiPropertyOptional({
    type: [CustomClauseDto],
    description: 'Custom contract clauses',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomClauseDto)
  @IsOptional()
  customClauses?: CustomClauseDto[];
}
