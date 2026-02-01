import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus, RiskLevel } from '../../common/enums/index.js';

/**
 * Candidate card for property candidate list.
 * Shows summary info for ranking/filtering candidates.
 */
export class CandidateCardDto {
  @ApiProperty({ description: 'Application ID' })
  id!: string;

  @ApiProperty({ description: 'Tenant full name' })
  tenantName!: string;

  @ApiProperty({ description: 'Tenant email' })
  tenantEmail!: string;

  @ApiProperty({ enum: ApplicationStatus, description: 'Application status' })
  status!: ApplicationStatus;

  @ApiProperty({ description: 'When application was submitted' })
  submittedAt!: Date;

  @ApiPropertyOptional({
    description: 'Risk score summary (null if not yet scored)',
  })
  riskScore?: {
    totalScore: number;
    level: RiskLevel;
  };

  @ApiPropertyOptional({
    description: 'Landlord private note (if exists)',
  })
  note?: {
    id: string;
    content: string;
    updatedAt: Date;
  };
}
