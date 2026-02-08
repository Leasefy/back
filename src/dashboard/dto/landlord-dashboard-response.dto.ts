import { ApiProperty } from '@nestjs/swagger';

class FinancialStatsDto {
  @ApiProperty({
    description: 'Total rent received this month (COP)',
    example: 3500000,
  })
  monthlyIncome!: number;

  @ApiProperty({
    description: 'Sum of active lease monthly rents (COP)',
    example: 5000000,
  })
  expectedIncome!: number;

  @ApiProperty({
    description: 'Percentage of expected income collected (0-100, one decimal)',
    example: 70.0,
  })
  collectionRate!: number;

  @ApiProperty({
    description: 'Expected minus received this month (COP)',
    example: 1500000,
  })
  pendingPayments!: number;

  @ApiProperty({
    description: 'Count of leases without payment this month',
    example: 1,
  })
  latePayments!: number;
}

class UrgentActionsDto {
  @ApiProperty({
    description: 'Total count of urgent actions',
    example: 5,
  })
  totalUrgent!: number;

  @ApiProperty({
    description: 'Applications in SUBMITTED or UNDER_REVIEW status',
    example: 2,
  })
  pendingApplications!: number;

  @ApiProperty({
    description: 'Contracts awaiting landlord signature',
    example: 1,
  })
  pendingSignatures!: number;

  @ApiProperty({
    description: 'Visits in PENDING status',
    example: 1,
  })
  pendingVisits!: number;

  @ApiProperty({
    description: 'Leases with ENDING_SOON status',
    example: 1,
  })
  endingLeases!: number;
}

class CandidateRiskDistributionDto {
  @ApiProperty({ description: 'Count of risk level A candidates', example: 3 })
  a!: number;

  @ApiProperty({ description: 'Count of risk level B candidates', example: 5 })
  b!: number;

  @ApiProperty({ description: 'Count of risk level C candidates', example: 2 })
  c!: number;

  @ApiProperty({ description: 'Count of risk level D candidates', example: 1 })
  d!: number;
}

export class LandlordDashboardResponseDto {
  @ApiProperty({
    description: 'Financial statistics for current month',
    type: FinancialStatsDto,
  })
  financial!: FinancialStatsDto;

  @ApiProperty({
    description: 'Urgent actions requiring attention',
    type: UrgentActionsDto,
  })
  urgentActions!: UrgentActionsDto;

  @ApiProperty({
    description: 'Risk distribution of active candidates',
    type: CandidateRiskDistributionDto,
  })
  candidates!: CandidateRiskDistributionDto;
}
