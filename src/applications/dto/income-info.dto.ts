import {
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Step 3: Income Information
 * Monthly income and financial details.
 */
export class IncomeInfoDto {
  @ApiProperty({ description: 'Monthly salary in COP', example: 5000000 })
  @IsNumber()
  @Min(0)
  monthlySalary!: number;

  @ApiPropertyOptional({
    description: 'Additional monthly income in COP',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalIncome?: number;

  @ApiPropertyOptional({
    description: 'Source of additional income',
    example: 'Freelance work',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  additionalIncomeSource?: string;

  @ApiPropertyOptional({
    description: 'Monthly debt payments in COP',
    example: 800000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyDebtPayments?: number;

  @ApiPropertyOptional({
    description: 'Description of debts',
    example: 'Credit card, car loan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  debtDescription?: string;
}
