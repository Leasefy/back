/**
 * Status of an agency document.
 * Matches Prisma schema enum AgencyDocumentStatus.
 */
export enum AgencyDocumentStatus {
  DOC_DRAFT = 'DOC_DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  DOC_SIGNED = 'DOC_SIGNED',
  DOC_EXPIRED = 'DOC_EXPIRED',
}
