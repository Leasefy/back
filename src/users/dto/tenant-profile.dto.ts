import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserBasicDto {
  @ApiProperty({ description: 'User UUID' })
  id!: string;

  @ApiProperty({ description: 'User email address' })
  email!: string;

  @ApiPropertyOptional({ description: 'User first name' })
  firstName!: string | null;

  @ApiPropertyOptional({ description: 'User last name' })
  lastName!: string | null;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone!: string | null;

  @ApiProperty({ description: 'User role', example: 'TENANT' })
  role!: string;
}

class PreferencesDataDto {
  @ApiProperty({ type: [String], description: 'Preferred cities', example: ['Bogota'] })
  preferredCities!: string[];

  @ApiPropertyOptional({ description: 'Preferred number of bedrooms' })
  preferredBedrooms!: number | null;

  @ApiProperty({ type: [String], description: 'Preferred property types', example: ['APARTMENT'] })
  preferredPropertyTypes!: string[];

  @ApiPropertyOptional({ description: 'Minimum monthly budget in COP' })
  minBudget!: number | null;

  @ApiPropertyOptional({ description: 'Maximum monthly budget in COP' })
  maxBudget!: number | null;

  @ApiProperty({ description: 'Looking for pet-friendly properties' })
  petFriendly!: boolean;

  @ApiPropertyOptional({ description: 'Desired move-in date' })
  moveInDate!: Date | null;
}

class ApplicationDataDto {
  @ApiPropertyOptional({ description: 'Monthly salary from latest application (COP)' })
  income!: number | null;

  @ApiPropertyOptional({ description: 'Employment type (e.g., EMPLOYED, INDEPENDENT)' })
  employment!: string | null;

  @ApiPropertyOptional({ description: 'Company/employer name' })
  employmentCompany!: string | null;

  @ApiPropertyOptional({ description: 'Application ID' })
  applicationId!: string;
}

class RiskDataDto {
  @ApiProperty({ description: 'Total risk score (0-100)', example: 78 })
  totalScore!: number;

  @ApiProperty({ description: 'Risk level classification', example: 'B', enum: ['A', 'B', 'C', 'D'] })
  level!: string;
}

/**
 * Full tenant profile aggregating user info, preferences, application data, and risk score.
 * Response shape for GET /users/me/profile.
 */
export class TenantProfileDto {
  @ApiProperty({ type: UserBasicDto, description: 'Basic user information' })
  user!: UserBasicDto;

  @ApiProperty({ type: PreferencesDataDto, nullable: true, description: 'Search preferences (null if not set)' })
  preferences!: PreferencesDataDto | null;

  @ApiProperty({ type: ApplicationDataDto, nullable: true, description: 'Latest application data (null if no applications)' })
  applicationData!: ApplicationDataDto | null;

  @ApiProperty({ type: RiskDataDto, nullable: true, description: 'Risk score data (null if not scored)' })
  riskData!: RiskDataDto | null;
}
