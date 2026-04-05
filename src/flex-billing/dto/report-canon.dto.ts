import { IsUUID, IsInt, IsString, IsOptional, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportCanonDto {
  @ApiProperty({ description: 'ID de la consignacion' })
  @IsUUID()
  consignacionId!: string;

  @ApiProperty({ description: 'Monto del canon en COP', example: 1500000 })
  @IsInt()
  @Min(1)
  canonAmount!: number;

  @ApiProperty({ description: 'Mes en formato YYYY-MM', example: '2026-04' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month debe tener formato YYYY-MM' })
  month!: string;

  @ApiPropertyOptional({ description: 'Referencia de pago' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
