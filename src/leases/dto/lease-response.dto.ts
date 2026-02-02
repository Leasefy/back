import { ApiProperty } from '@nestjs/swagger';
import { LeaseStatus } from '../../common/enums/index.js';

/**
 * Response DTO for lease data
 */
export class LeaseResponseDto {
  @ApiProperty({ description: 'Lease ID' })
  id!: string;

  @ApiProperty({ description: 'Contract ID' })
  contractId!: string;

  @ApiProperty({ description: 'Property ID' })
  propertyId!: string;

  @ApiProperty({ enum: LeaseStatus, description: 'Lease status' })
  status!: LeaseStatus;

  // Denormalized data
  @ApiProperty({ description: 'Property address snapshot' })
  propertyAddress!: string;

  @ApiProperty({ description: 'Property city snapshot' })
  propertyCity!: string;

  @ApiProperty({ description: 'Landlord name snapshot' })
  landlordName!: string;

  @ApiProperty({ description: 'Landlord email snapshot' })
  landlordEmail!: string;

  @ApiProperty({ description: 'Tenant name snapshot' })
  tenantName!: string;

  @ApiProperty({ description: 'Tenant email snapshot' })
  tenantEmail!: string;

  @ApiProperty({ description: 'Tenant phone snapshot', nullable: true })
  tenantPhone!: string | null;

  // Contract terms
  @ApiProperty({ description: 'Lease start date' })
  startDate!: Date;

  @ApiProperty({ description: 'Lease end date' })
  endDate!: Date;

  @ApiProperty({ description: 'Monthly rent in COP' })
  monthlyRent!: number;

  @ApiProperty({ description: 'Deposit in COP' })
  deposit!: number;

  @ApiProperty({ description: 'Day of month rent is due (1-28)' })
  paymentDay!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;
}

/**
 * Summary for lease list
 */
export class LeaseSummaryDto {
  @ApiProperty({ description: 'Lease ID' })
  id!: string;

  @ApiProperty({ enum: LeaseStatus, description: 'Lease status' })
  status!: LeaseStatus;

  @ApiProperty({ description: 'Property address' })
  propertyAddress!: string;

  @ApiProperty({ description: 'Property city' })
  propertyCity!: string;

  @ApiProperty({ description: 'Tenant name' })
  tenantName!: string;

  @ApiProperty({ description: 'Monthly rent in COP' })
  monthlyRent!: number;

  @ApiProperty({ description: 'Lease start date' })
  startDate!: Date;

  @ApiProperty({ description: 'Lease end date' })
  endDate!: Date;

  @ApiProperty({ description: 'Number of payments recorded' })
  paymentCount!: number;
}
