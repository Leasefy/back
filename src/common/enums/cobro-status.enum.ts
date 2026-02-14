/**
 * Status of a cobro (rent collection).
 * Matches Prisma schema enum CobroStatus.
 */
export enum CobroStatus {
  COBRO_PENDING = 'COBRO_PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  LATE = 'LATE',
  DEFAULTED = 'DEFAULTED',
}
