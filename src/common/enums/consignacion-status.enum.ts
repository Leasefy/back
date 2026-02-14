/**
 * Status of a property consignacion (consignment contract).
 * Matches Prisma schema enum ConsignacionStatus.
 */
export enum ConsignacionStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}
