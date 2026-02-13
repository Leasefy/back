import { PartialType } from '@nestjs/swagger';
import { CreatePipelineItemDto } from './create-pipeline-item.dto.js';

export class UpdatePipelineItemDto extends PartialType(CreatePipelineItemDto) {}
