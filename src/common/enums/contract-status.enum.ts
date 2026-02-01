/**
 * Status of a rental contract.
 * Must match the Prisma ContractStatus enum.
 */
export enum ContractStatus {
  /** Contract created, not yet sent for signatures */
  DRAFT = 'DRAFT',

  /** Waiting for landlord to sign */
  PENDING_LANDLORD_SIGNATURE = 'PENDING_LANDLORD_SIGNATURE',

  /** Landlord signed, waiting for tenant */
  PENDING_TENANT_SIGNATURE = 'PENDING_TENANT_SIGNATURE',

  /** Both parties have signed */
  SIGNED = 'SIGNED',

  /** Contract is in effect (start date has passed) */
  ACTIVE = 'ACTIVE',

  /** Contract cancelled before activation */
  CANCELLED = 'CANCELLED',

  /** Contract term has ended */
  EXPIRED = 'EXPIRED',
}
