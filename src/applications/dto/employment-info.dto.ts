import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmploymentType {
  EMPLOYED = 'EMPLOYED',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  CONTRACTOR = 'CONTRACTOR',
  UNEMPLOYED = 'UNEMPLOYED',
  RETIRED = 'RETIRED',
  STUDENT = 'STUDENT',
}

/**
 * Step 2: Employment Information
 * Current employment status and details.
 */
export class EmploymentInfoDto {
  @ApiProperty({ enum: EmploymentType, description: 'Type of employment' })
  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @ApiPropertyOptional({ description: 'Employer/Company name', example: 'Empresa ABC S.A.S.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Job title/position', example: 'Desarrollador Senior' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Employment start date', example: '2020-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Work address', example: 'Carrera 7 #32-00, Bogota' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workAddress?: string;

  @ApiPropertyOptional({ description: 'HR contact phone', example: '+5713001234' })
  @IsOptional()
  @IsString()
  hrContactPhone?: string;

  @ApiPropertyOptional({ description: 'HR contact email', example: 'rrhh@empresa.com' })
  @IsOptional()
  @IsString()
  hrContactEmail?: string;
}
