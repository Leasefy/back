/**
 * Availability status of a consigned property.
 * Matches Prisma schema enum ConsignacionAvailability.
 */
export enum ConsignacionAvailability {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  IN_PROCESS = 'IN_PROCESS',
  MAINTENANCE = 'MAINTENANCE',
}
