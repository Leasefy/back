/**
 * Types of maintenance requests.
 * Matches Prisma schema enum MantenimientoType.
 */
export enum MantenimientoType {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  APPLIANCE = 'APPLIANCE',
  STRUCTURAL = 'STRUCTURAL',
  PAINTING = 'PAINTING',
  LOCKS = 'LOCKS',
  OTHER_MAINT = 'OTHER_MAINT',
}
