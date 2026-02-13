import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { DocumentTemplateCategory } from '../../../common/enums/document-template-category.enum.js';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Contrato de arriendo', description: 'Template name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: DocumentTemplateCategory, example: DocumentTemplateCategory.CONTRATO, description: 'Template category' })
  @IsEnum(DocumentTemplateCategory)
  category!: DocumentTemplateCategory;

  @ApiProperty({ example: 'Content with {{variables}}...', description: 'Template content with variable placeholders' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: '1.0', description: 'Template version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ type: [String], example: ['tenantName', 'propertyAddress'], description: 'List of variable names used in the template' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
