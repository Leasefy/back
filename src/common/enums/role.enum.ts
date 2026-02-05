/**
 * User roles in the system.
 * Matches Prisma schema enum Role.
 *
 * TENANT: Can apply for properties
 * LANDLORD: Can list properties, view applications
 * AGENT: Can manage assigned properties on behalf of landlords
 * ADMIN: System administrator, can manage notification templates
 */
export enum Role {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}
