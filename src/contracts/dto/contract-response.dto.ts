import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus, InsuranceTier } from '../../common/enums/index.js';

/**
 * Contract list item for displaying in a list view.
 * Lightweight data for cards/tables.
 */
export class ContractListItemDto {
  @ApiProperty({ description: 'Contract ID' })
  id!: string;

  @ApiProperty({ enum: ContractStatus, description: 'Current contract status' })
  status!: ContractStatus;

  @ApiProperty({ description: 'Property title' })
  propertyTitle!: string;

  @ApiProperty({ example: 2500000, description: 'Monthly rent in COP' })
  monthlyRent!: number;

  @ApiProperty({ description: 'Contract start date' })
  startDate!: Date;

  @ApiProperty({ description: 'Contract end date' })
  endDate!: Date;

  @ApiProperty({ enum: ['LANDLORD', 'TENANT'], description: 'User role in this contract' })
  role!: 'LANDLORD' | 'TENANT';

  @ApiProperty({ description: 'Contract creation date' })
  createdAt!: Date;
}

/**
 * Full contract details for detail view.
 */
export class ContractDetailDto {
  @ApiProperty({ description: 'Contract ID' })
  id!: string;

  @ApiProperty({ enum: ContractStatus, description: 'Current contract status' })
  status!: ContractStatus;

  @ApiProperty({ description: 'Contract start date' })
  startDate!: Date;

  @ApiProperty({ description: 'Contract end date' })
  endDate!: Date;

  @ApiProperty({ example: 2500000, description: 'Monthly rent in COP' })
  monthlyRent!: number;

  @ApiProperty({ example: 5000000, description: 'Deposit amount in COP' })
  deposit!: number;

  @ApiProperty({ example: 5, description: 'Payment due day of month' })
  paymentDay!: number;

  @ApiProperty({ enum: InsuranceTier, description: 'Insurance tier selected for contract' })
  insuranceTier!: string;

  @ApiProperty({ example: 25000, description: 'Monthly insurance premium in COP' })
  insurancePremium!: number;

  @ApiPropertyOptional({ description: 'Auto-generated insurance coverage details' })
  insuranceDetails?: string | null;

  @ApiPropertyOptional({ description: 'Custom contract clauses' })
  customClauses?: Array<{ title: string; content: string }>;

  @ApiProperty({ description: 'Property information' })
  property!: {
    id: string;
    title: string;
    address: string;
  };

  @ApiProperty({ description: 'Landlord information' })
  landlord!: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };

  @ApiProperty({ description: 'Tenant information' })
  tenant!: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Landlord signature audit trail' })
  landlordSignature?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Tenant signature audit trail' })
  tenantSignature?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Contract creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Contract last update date' })
  updatedAt!: Date;
}

/**
 * Contract preview for displaying rendered HTML.
 */
export class ContractPreviewDto {
  @ApiProperty({ description: 'Rendered contract HTML' })
  html!: string;
}

/**
 * Response when contract is successfully created.
 */
export class ContractCreatedDto {
  @ApiProperty({ description: 'Contract ID' })
  id!: string;

  @ApiProperty({ enum: ContractStatus, description: 'Initial contract status (DRAFT)' })
  status!: ContractStatus;

  @ApiProperty({ description: 'Contract creation date' })
  createdAt!: Date;
}
