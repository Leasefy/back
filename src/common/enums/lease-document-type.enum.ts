/**
 * Lease document type enum matching Prisma schema.
 * Defines the types of documents associated with a lease.
 *
 * CONTRACT_SIGNED: Signed contract copy
 * PAYMENT_RECEIPT: Payment receipt/comprobante
 * DELIVERY_INVENTORY: Delivery inventory checklist
 * RETURN_INVENTORY: Return inventory checklist
 * ADDENDUM: Contract addendum/amendment
 * PHOTO: Property photos (condition, damages)
 * OTHER: Other lease-related documents
 */
export enum LeaseDocumentType {
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  DELIVERY_INVENTORY = 'DELIVERY_INVENTORY',
  RETURN_INVENTORY = 'RETURN_INVENTORY',
  ADDENDUM = 'ADDENDUM',
  PHOTO = 'PHOTO',
  OTHER = 'OTHER',
}
