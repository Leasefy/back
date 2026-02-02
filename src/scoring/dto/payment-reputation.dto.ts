import { ApiProperty } from '@nestjs/swagger';

/**
 * Reputation tier based on payment history score.
 * GOLD: 12-15 pts (80%+ of max)
 * SILVER: 8-11 pts (53%+ of max)
 * BRONZE: 4-7 pts (27%+ of max)
 * NEW: 0-3 pts or < 3 months on platform
 */
export type ReputationTier = 'GOLD' | 'SILVER' | 'BRONZE' | 'NEW';

/**
 * Signal displayed to tenant about their payment reputation.
 */
export class ReputationSignalDto {
  @ApiProperty({ example: 'EXCELLENT_PAYMENT_HISTORY' })
  code!: string;

  @ApiProperty({ example: true })
  positive!: boolean;

  @ApiProperty({ example: '95%+ de pagos a tiempo en la plataforma' })
  message!: string;
}

/**
 * Payment reputation response for tenant dashboard.
 */
export class PaymentReputationDto {
  @ApiProperty({ example: 12, description: 'Payment history bonus score (0-15)' })
  score!: number;

  @ApiProperty({ example: 15, description: 'Maximum possible bonus score' })
  maxScore!: number;

  @ApiProperty({ example: 0.95, description: 'Percentage of on-time payments (0-1)' })
  onTimePercentage!: number;

  @ApiProperty({ example: 18, description: 'Total payments recorded on platform' })
  totalPayments!: number;

  @ApiProperty({ example: 1, description: 'Number of late payments' })
  latePaymentCount!: number;

  @ApiProperty({ example: 24, description: 'Total months as tenant on platform' })
  totalMonthsOnPlatform!: number;

  @ApiProperty({ example: 45000000, description: 'Total COP paid on platform' })
  totalAmountPaid!: number;

  @ApiProperty({ example: 2, description: 'Number of leases on platform' })
  leaseCount!: number;

  @ApiProperty({
    example: 'GOLD',
    enum: ['GOLD', 'SILVER', 'BRONZE', 'NEW'],
    description: 'Reputation tier for display',
  })
  tier!: ReputationTier;

  @ApiProperty({ type: [ReputationSignalDto], description: 'Score factor signals' })
  signals!: ReputationSignalDto[];
}
