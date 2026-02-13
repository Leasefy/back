import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class RegisterPaymentDto {
  @ApiProperty({ example: 1500000, description: 'Amount paid in COP' })
  @IsInt()
  @Min(0)
  paidAmount!: number;

  @ApiPropertyOptional({ example: 'PSE', description: 'Payment method used' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: 'REF-123456',
    description: 'Payment reference number',
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: '2026-02-05',
    description: 'Date the payment was made (defaults to today)',
  })
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
