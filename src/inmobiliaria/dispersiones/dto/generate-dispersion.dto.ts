import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class GenerateDispersionDto {
  @ApiProperty({
    example: '2026-02',
    description: 'Month to generate dispersiones for, in YYYY-MM format',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;
}
