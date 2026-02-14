/**
 * Status of a payment dispersion to property owner.
 * Matches Prisma schema enum DispersionStatus.
 */
export enum DispersionStatus {
  DISP_PENDING = 'DISP_PENDING',
  PROCESSING = 'PROCESSING',
  DISP_COMPLETED = 'DISP_COMPLETED',
  FAILED = 'FAILED',
}
