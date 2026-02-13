import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessDispersionDto {
  @ApiProperty({
    example: 'TRF-2026-02-001',
    description: 'Bank transfer reference number',
  })
  @IsString()
  @IsNotEmpty()
  transferReference!: string;
}
