/**
 * Status of a tenant payment request.
 * Tracks the lifecycle from submission to validation.
 *
 * PENDING_VALIDATION: Awaiting landlord review
 * APPROVED: Landlord approved, Payment record created
 * REJECTED: Landlord rejected the payment
 * DISPUTED: Tenant opened dispute after rejection
 * CANCELLED: Tenant cancelled before validation
 */
export enum TenantPaymentRequestStatus {
  /** Awaiting landlord review */
  PENDING_VALIDATION = 'PENDING_VALIDATION',

  /** Landlord approved, Payment record created */
  APPROVED = 'APPROVED',

  /** Landlord rejected the payment */
  REJECTED = 'REJECTED',

  /** Tenant opened dispute after rejection */
  DISPUTED = 'DISPUTED',

  /** Tenant cancelled before validation */
  CANCELLED = 'CANCELLED',
}
