import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LeaseInfoDto {
  @ApiProperty({ description: 'Property title', example: 'Apartamento Centro' })
  propertyTitle!: string;

  @ApiProperty({
    description: 'Property address',
    example: 'Calle 10 #45-23, Bogota',
  })
  propertyAddress!: string;

  @ApiProperty({ description: 'Monthly rent in COP', example: 1500000 })
  monthlyRent!: number;

  @ApiProperty({ description: 'Day of month rent is due (1-28)', example: 5 })
  paymentDay!: number;

  @ApiProperty({ description: 'Lease start date' })
  startDate!: Date;

  @ApiProperty({ description: 'Lease end date' })
  endDate!: Date;

  @ApiProperty({
    description: 'Lease status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'ENDING_SOON'],
  })
  status!: string;
}

class PaymentStatusDto {
  @ApiProperty({
    description: 'Whether current month rent has been paid',
    example: true,
  })
  currentMonthPaid!: boolean;

  @ApiPropertyOptional({
    description: 'Date of last payment, null if no payments yet',
  })
  lastPaymentDate!: Date | null;

  @ApiProperty({
    description: 'Total number of payments made for this lease',
    example: 6,
  })
  totalPayments!: number;

  @ApiProperty({ description: 'Next payment due date' })
  nextPaymentDue!: Date;
}

class UpcomingVisitDto {
  @ApiProperty({
    description: 'Property title for the visit',
    example: 'Apartamento Chapinero',
  })
  propertyTitle!: string;

  @ApiProperty({ description: 'Visit date' })
  date!: Date;

  @ApiProperty({ description: 'Visit start time (HH:mm)', example: '10:00' })
  startTime!: string;

  @ApiProperty({
    description: 'Visit status',
    example: 'ACCEPTED',
    enum: ['PENDING', 'ACCEPTED'],
  })
  status!: string;
}

export class TenantDashboardResponseDto {
  @ApiProperty({
    description: 'Whether the tenant has an active lease',
    example: true,
  })
  hasActiveLease!: boolean;

  @ApiPropertyOptional({
    description: 'Active lease summary (null if no active lease)',
    type: LeaseInfoDto,
  })
  lease?: LeaseInfoDto;

  @ApiPropertyOptional({
    description: 'Payment status for active lease (null if no active lease)',
    type: PaymentStatusDto,
  })
  payment?: PaymentStatusDto;

  @ApiPropertyOptional({
    description: 'Upcoming visit (null if none scheduled)',
    type: UpcomingVisitDto,
    nullable: true,
  })
  upcomingVisit?: UpcomingVisitDto | null;

  @ApiProperty({
    description: 'Count of non-terminal applications',
    example: 2,
  })
  pendingApplications!: number;
}
