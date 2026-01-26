/**
 * User role enum matching Prisma schema.
 * Re-exported for convenience in application code.
 *
 * TENANT: Can apply for properties
 * LANDLORD: Can list properties, view applications
 * BOTH: Can do both (switches context via activeRole)
 */
export enum Role {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  BOTH = 'BOTH',
}
