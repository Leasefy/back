import {
  IsString,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReferenceDto {
  @ApiProperty({ description: 'Reference full name', example: 'Maria Garcia' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Relationship', example: 'Previous landlord' })
  @IsString()
  @MaxLength(50)
  relationship!: string;

  @ApiProperty({ description: 'Contact phone', example: '+573009876543' })
  @Matches(/^(\+57)?[0-9]{7,10}$/, { message: 'Invalid phone number' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * Step 4: References
 * Personal and professional references.
 */
export class ReferencesDto {
  @ApiPropertyOptional({
    description: 'Previous landlord reference',
    type: ReferenceDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReferenceDto)
  landlordReference?: ReferenceDto;

  @ApiProperty({
    description: 'Employment reference (supervisor or HR)',
    type: ReferenceDto,
  })
  @ValidateNested()
  @Type(() => ReferenceDto)
  employmentReference!: ReferenceDto;

  @ApiProperty({
    description: 'Personal references (at least 1)',
    type: [ReferenceDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  personalReferences!: ReferenceDto[];
}
