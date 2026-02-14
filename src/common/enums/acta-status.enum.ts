/**
 * Status of an acta (handover/return document).
 * Matches Prisma schema enum ActaStatus.
 */
export enum ActaStatus {
  ACTA_DRAFT = 'ACTA_DRAFT',
  ACTA_IN_PROGRESS = 'ACTA_IN_PROGRESS',
  PENDING_SIGNATURES = 'PENDING_SIGNATURES',
  ACTA_COMPLETED = 'ACTA_COMPLETED',
}
