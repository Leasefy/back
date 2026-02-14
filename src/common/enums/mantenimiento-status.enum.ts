/**
 * Status of a maintenance request.
 * Matches Prisma schema enum MantenimientoStatus.
 */
export enum MantenimientoStatus {
  REPORTED = 'REPORTED',
  QUOTED = 'QUOTED',
  MAINT_APPROVED = 'MAINT_APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  MAINT_COMPLETED = 'MAINT_COMPLETED',
  MAINT_CANCELLED = 'MAINT_CANCELLED',
}
