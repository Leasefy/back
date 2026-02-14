/**
 * Who pays for a maintenance request.
 * Matches Prisma schema enum MantenimientoPaidBy.
 */
export enum MantenimientoPaidBy {
  OWNER = 'OWNER',
  TENANT_PAYS = 'TENANT_PAYS',
  SPLIT = 'SPLIT',
  AGENCY_PAYS = 'AGENCY_PAYS',
}
