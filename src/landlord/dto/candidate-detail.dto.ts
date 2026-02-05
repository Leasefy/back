import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationStatus,
  RiskLevel,
  DocumentType,
  ApplicationEventType,
} from '../../common/enums/index.js';

/**
 * Full candidate detail for landlord review.
 * Includes complete score breakdown, documents, and timeline.
 */
export class CandidateDetailDto {
  @ApiProperty({ description: 'Application ID' })
  id!: string;

  @ApiProperty({ description: 'Application status' })
  status!: ApplicationStatus;

  @ApiProperty({ description: 'When application was submitted' })
  submittedAt!: Date;

  @ApiProperty({ description: 'Tenant info (limited fields)' })
  tenant!: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };

  @ApiProperty({ description: 'Property info (limited fields)' })
  property!: {
    id: string;
    title: string;
    monthlyRent: number;
  };

  @ApiPropertyOptional({
    description: 'Full risk score breakdown (null if not yet scored)',
  })
  riskScore?: {
    totalScore: number;
    level: RiskLevel;
    financialScore: number;
    stabilityScore: number;
    historyScore: number;
    integrityScore: number;
    drivers: Array<{ text: string; positive: boolean }>;
    flags: Array<{ code: string; severity: string; message: string }>;
    conditions: Array<{ type: string; message: string; required: boolean }>;
  };

  @ApiProperty({
    description:
      'List of uploaded documents (without URLs - use separate endpoint)',
  })
  documents!: Array<{
    id: string;
    type: DocumentType;
    originalName: string;
    createdAt: Date;
  }>;

  @ApiProperty({
    description: 'Application timeline events',
  })
  timeline!: Array<{
    id: string;
    type: ApplicationEventType;
    metadata: Record<string, unknown>;
    createdAt: Date;
    actor: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
  }>;

  @ApiPropertyOptional({
    description: 'Landlord private note (if exists)',
  })
  note?: {
    id: string;
    content: string;
    updatedAt: Date;
  };
}
