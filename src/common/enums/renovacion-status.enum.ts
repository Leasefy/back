/**
 * Status of a lease renovation (renewal).
 * Matches Prisma schema enum RenovacionStatus.
 */
export enum RenovacionStatus {
  RENOV_PENDING = 'RENOV_PENDING',
  NOTIFIED = 'NOTIFIED',
  NEGOTIATING = 'NEGOTIATING',
  RENOV_APPROVED = 'RENOV_APPROVED',
  RENOV_SIGNED = 'RENOV_SIGNED',
  RENOV_COMPLETED = 'RENOV_COMPLETED',
  RENOV_TERMINATED = 'RENOV_TERMINATED',
}
