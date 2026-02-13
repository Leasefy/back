import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PipelineStage } from '../../../common/enums/pipeline-stage.enum.js';

export class MoveStageDto {
  @ApiProperty({ description: 'Target pipeline stage', enum: PipelineStage })
  @IsEnum(PipelineStage)
  stage!: PipelineStage;

  @ApiPropertyOptional({ description: 'Reason for moving to LOST stage (only for LOST)' })
  @IsOptional()
  @IsString()
  lostReason?: string;
}
