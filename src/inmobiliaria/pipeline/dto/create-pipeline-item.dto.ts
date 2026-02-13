import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEmail,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PipelineStage } from '../../../common/enums/pipeline-stage.enum.js';

export class CreatePipelineItemDto {
  @ApiProperty({ description: 'ID of the consignacion (property) for this prospect' })
  @IsUUID()
  consignacionId!: string;

  @ApiPropertyOptional({ description: 'ID of the agent assigned to this prospect' })
  @IsOptional()
  @IsUUID()
  agenteUserId?: string;

  @ApiProperty({ description: 'Full name of the candidate/prospect' })
  @IsString()
  candidateName!: string;

  @ApiPropertyOptional({ description: 'Email address of the candidate' })
  @IsOptional()
  @IsEmail()
  candidateEmail?: string;

  @ApiPropertyOptional({ description: 'Phone number of the candidate' })
  @IsOptional()
  @IsString()
  candidatePhone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL of the candidate' })
  @IsOptional()
  @IsString()
  candidateAvatar?: string;

  @ApiPropertyOptional({ description: 'Risk score (0-100) from scoring engine' })
  @IsOptional()
  @IsInt()
  riskScore?: number;

  @ApiPropertyOptional({ description: 'Risk level (A/B/C/D)' })
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'Initial pipeline stage (defaults to LEAD)', enum: PipelineStage })
  @IsOptional()
  @IsEnum(PipelineStage)
  stage?: PipelineStage;

  @ApiPropertyOptional({ description: 'Next action to take' })
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional({ description: 'Date for the next action (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;

  @ApiPropertyOptional({ description: 'Free-text notes about the prospect' })
  @IsOptional()
  @IsString()
  notes?: string;
}
