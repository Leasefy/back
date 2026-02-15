import { ApiProperty } from '@nestjs/swagger';

/**
 * Driver category types
 */
export type DriverCategory =
  | 'financial'
  | 'stability'
  | 'history'
  | 'integrity'
  | 'paymentHistory'
  | 'documentVerification';

/**
 * Icon types for drivers
 */
export type DriverIcon = 'trending_up' | 'trending_down' | 'warning';

/**
 * DriverExplanationDto
 *
 * Enriched driver with category and icon metadata for UI rendering.
 */
export class DriverExplanationDto {
  @ApiProperty({
    description: 'Human-readable explanation of the factor',
    example: 'Relación ingreso-arriendo del 25% (Excelente)',
  })
  text!: string;

  @ApiProperty({
    description: 'Whether this factor is positive (good) or negative (concern)',
    example: true,
  })
  positive!: boolean;

  @ApiProperty({
    description: 'Category of the driver',
    enum: [
      'financial',
      'stability',
      'history',
      'integrity',
      'paymentHistory',
      'documentVerification',
    ],
    example: 'financial',
  })
  category!: DriverCategory;

  @ApiProperty({
    description: 'Icon to display for this driver',
    enum: ['trending_up', 'trending_down', 'warning'],
    example: 'trending_up',
  })
  icon!: DriverIcon;
}

/**
 * SubscoreDto
 *
 * Individual subscore breakdown by category.
 */
export class SubscoreDto {
  @ApiProperty({
    description: 'Category of the subscore',
    enum: [
      'financial',
      'stability',
      'history',
      'integrity',
      'paymentHistory',
    ],
    example: 'financial',
  })
  category!: string;

  @ApiProperty({
    description: 'Score achieved in this category',
    example: 30,
  })
  score!: number;

  @ApiProperty({
    description: 'Maximum possible score for this category',
    example: 35,
  })
  maxScore!: number;

  @ApiProperty({
    description: 'Spanish label for this category',
    example: 'Situación Financiera',
  })
  label!: string;
}

/**
 * ExplainabilityResponseDto
 *
 * Complete explainability response with score, narrative, drivers, and metadata.
 */
export class ExplainabilityResponseDto {
  @ApiProperty({
    description: 'Total risk score (0-100)',
    example: 85,
  })
  totalScore!: number;

  @ApiProperty({
    description: 'Risk level classification',
    enum: ['A', 'B', 'C', 'D'],
    example: 'A',
  })
  level!: string;

  @ApiProperty({
    description: 'Natural language narrative explaining the score (Spanish)',
    example:
      'Este inquilino presenta un perfil excelente. Su relación ingreso-arriendo es muy saludable...',
  })
  narrative!: string;

  @ApiProperty({
    description: 'Key drivers that contributed to the score',
    type: [DriverExplanationDto],
  })
  drivers!: DriverExplanationDto[];

  @ApiProperty({
    description: 'Warning flags identified',
    example: [],
    isArray: true,
  })
  flags!: Array<{
    code: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
  }>;

  @ApiProperty({
    description: 'Suggested conditions for approval',
    example: [],
    isArray: true,
  })
  conditions!: Array<{
    type: 'DEPOSIT' | 'COSIGNER' | 'INCOME_VERIFICATION' | 'INSURANCE';
    message: string;
    required: boolean;
  }>;

  @ApiProperty({
    description: 'Subscore breakdown by category',
    type: [SubscoreDto],
  })
  subscores!: SubscoreDto[];

  @ApiProperty({
    description: 'Algorithm version used for scoring',
    example: '1.0',
  })
  algorithmVersion!: string;

  @ApiProperty({
    description: 'Whether this explanation used premium AI features',
    example: true,
  })
  isPremium!: boolean;
}
