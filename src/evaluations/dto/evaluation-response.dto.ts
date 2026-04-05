import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluationResponseDto {
  @ApiProperty()
  runId!: string;

  @ApiProperty({ enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  status!: string;

  @ApiPropertyOptional()
  result?: unknown;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  createdAt!: Date;
}
