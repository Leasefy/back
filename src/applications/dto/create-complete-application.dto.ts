import {
  IsUUID,
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsObject,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Nested reference DTOs ---

class PreviousLandlordRefDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() relationship?: string;
}

class EmploymentRefDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationship?: string;
}

class PersonalRefDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationship?: string;
}

class ReferencesBlockDto {
  @ApiPropertyOptional({ type: [PreviousLandlordRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviousLandlordRefDto)
  previousLandlords?: PreviousLandlordRefDto[];

  @ApiPropertyOptional({ type: [EmploymentRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmploymentRefDto)
  employmentReferences?: EmploymentRefDto[];

  @ApiPropertyOptional({ type: [PersonalRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalRefDto)
  personalReferences?: PersonalRefDto[];
}

// --- Main DTO ---

/**
 * All-in-one application creation DTO.
 * Accepts the complete form payload from the frontend,
 * creates the application and fills all wizard steps in one request.
 */
export class CreateCompleteApplicationDto {
  // --- Property ---
  @ApiProperty({ description: 'Property ID to apply for' })
  @IsUUID()
  propertyId!: string;

  // --- Step 1: Personal Info ---
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) fullName!: string;
  @ApiProperty() @IsString() documentType!: string;
  @ApiProperty() @IsString() documentNumber!: string;
  @ApiProperty() @IsDateString() dateOfBirth!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() timeAtCurrentAddress?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() maritalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() dependents?: number;

  // --- Step 2: Employment Info ---
  @ApiProperty() @IsString() employmentStatus!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() timeAtJob?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() employerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employerAddress?: string;

  // --- Step 3: Income Info ---
  @ApiProperty() @IsNumber() @Min(0) monthlySalary!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) additionalIncome?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() additionalIncomeSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalMonthlyIncome?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) monthlyObligations?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) availableForRent?: number;

  // --- Step 4: References ---
  @ApiPropertyOptional({ type: ReferencesBlockDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReferencesBlockDto)
  references?: ReferencesBlockDto;

  // --- Co-signer ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasCoSigner?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  coSigner?: Record<string, unknown>;

  // --- Agent attribution ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkCode?: string;
}
