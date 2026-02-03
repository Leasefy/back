/**
 * User roles in the system.
 * Matches Prisma schema enum Role.
 *
 * TENANT: Can apply for properties
 * LANDLORD: Can list properties, view applications
 * BOTH: Can do both (switches context via activeRole)
 * ADMIN: System administrator, can manage notification templates
 */
export enum Role {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  BOTH = 'BOTH',
  ADMIN = 'ADMIN',
}
