/**
 * Status of a property visit.
 * Must match Prisma VisitStatus enum values.
 */
export enum VisitStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  RESCHEDULED = 'RESCHEDULED',
}
