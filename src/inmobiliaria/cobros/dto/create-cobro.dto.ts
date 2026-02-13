import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNumber, IsOptional, Matches, Min } from 'class-validator';

export class CreateCobroDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the consignacion this cobro belongs to',
  })
  @IsUUID()
  consignacionId!: string;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsOptional()
  @IsString()
  tenantEmail?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  tenantPhone?: string;

  @ApiProperty({ example: 'Apartamento 301 - Torre Norte' })
  @IsString()
  propertyTitle!: string;

  @ApiProperty({
    example: '2026-02',
    description: 'Month in YYYY-MM format',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @ApiProperty({ example: 1500000, description: 'Monthly rent amount in COP' })
  @IsNumber()
  @Min(0)
  rentAmount!: number;

  @ApiPropertyOptional({ example: 200000, description: 'Admin fee in COP' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adminAmount?: number;

  @ApiProperty({
    example: '2026-02-05',
    description: 'Due date in YYYY-MM-DD format',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be in YYYY-MM-DD format' })
  dueDate!: string;
}
