import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a notification template
 */
export class CreateTemplateDto {
  @ApiProperty({
    description: 'Unique template code (uppercase with underscores)',
    example: 'APPLICATION_RECEIVED',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'Code must be uppercase with underscores (e.g., APPLICATION_RECEIVED)',
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable template name',
    example: 'Nueva aplicacion recibida',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Admin notes about this template',
    example: 'Sent to landlord when tenant submits application',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Email subject line (supports {{variables}})',
    example: 'Nueva aplicacion para {{propertyTitle}}',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  emailSubject!: string;

  @ApiProperty({
    description: 'Email body in Markdown (supports {{variables}})',
    example:
      '# Nueva Aplicacion\n\n**{{otherPartyName}}** ha aplicado a tu propiedad.',
  })
  @IsString()
  @IsNotEmpty()
  emailBody!: string;

  @ApiProperty({
    description: 'Push notification title',
    example: 'Nueva aplicacion',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pushTitle!: string;

  @ApiProperty({
    description: 'Push notification body',
    example: '{{otherPartyName}} aplico a {{propertyTitle}}',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  pushBody!: string;

  @ApiPropertyOptional({
    description: 'Whether template is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
