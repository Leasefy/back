/**
 * Payload contract for the agent microservice POST /tenant-scoring endpoint.
 *
 * Matches the Zod schema in `agent/src/server/routes/tenant-scoring.ts`.
 * The micro accepts only 3 document types: cedula, extracto_bancario, contrato_laboral.
 * Other backend DocumentType values are filtered out before sending.
 *
 * IMPORTANT: agencyId is OPTIONAL per micro team decision — omit entirely when
 * the landlord is not a member of an agency. Do not send empty string or placeholder.
 */
export type TenantScoringDocumentType =
  | 'cedula'
  | 'extracto_bancario'
  | 'contrato_laboral';

export interface TenantScoringPayload {
  applicationId: string;
  tenantId: string;
  agencyId?: string;
  monthlyRent: number;
  documents: Array<{
    url: string;
    type: TenantScoringDocumentType;
  }>;
  language?: 'es' | 'en';
  forceRefresh?: boolean;
}
