import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto.js';

/**
 * DTO for updating a notification template.
 * All fields optional except code cannot be changed.
 */
export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
