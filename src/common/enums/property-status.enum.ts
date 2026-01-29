/**
 * Property listing status enum matching Prisma schema.
 * Defines the visibility and availability state of a property.
 *
 * DRAFT: Only visible to the landlord (not published)
 * AVAILABLE: Published and available for rent
 * RENTED: Currently rented, visible but not available
 * PENDING: Has pending applications in review
 */
export enum PropertyStatus {
  DRAFT = 'DRAFT',
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  PENDING = 'PENDING',
}
