import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class GenerateDocumentDto {
  @ApiProperty({ example: 'Contrato Juan Perez', description: 'Name for the generated document' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Template ID to generate from' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Consignacion ID to associate the document with' })
  @IsOptional()
  @IsUUID()
  consignacionId?: string;

  @ApiPropertyOptional({ description: 'Raw content (used if no templateId is provided)' })
  @IsOptional()
  @IsString()
  content?: string;
}
