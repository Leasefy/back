/**
 * PredictionOutcome
 *
 * Actual outcome of a prediction after landlord decision and lease lifecycle.
 * Used to track whether the model's prediction matched reality.
 *
 * TypeScript enum (NOT a Prisma enum) - stored as strings in the database.
 *
 * Lifecycle:
 *   PENDING -> REJECTED | WITHDRAWN | APPROVED_PENDING
 *   APPROVED_PENDING -> APPROVED_PAID_ON_TIME | APPROVED_LATE_PAYMENTS | APPROVED_DEFAULTED
 *
 * Legacy values (LEASE_SUCCESSFUL, LEASE_PROBLEMATIC) kept for backward compat.
 */
export enum PredictionOutcome {
  /** Application was rejected by landlord */
  REJECTED = 'REJECTED',

  /** Tenant withdrew their application */
  WITHDRAWN = 'WITHDRAWN',

  /** Lease was created and completed successfully without issues */
  LEASE_SUCCESSFUL = 'LEASE_SUCCESSFUL',

  /** Lease had payment issues or early termination */
  LEASE_PROBLEMATIC = 'LEASE_PROBLEMATIC',

  /** Prediction is still pending - no final outcome yet */
  PENDING = 'PENDING',

  /** Application approved, lease created, awaiting sufficient payment data */
  APPROVED_PENDING = 'APPROVED_PENDING',

  /** Lease with 6+ months tracked and zero late payments */
  APPROVED_PAID_ON_TIME = 'APPROVED_PAID_ON_TIME',

  /** Lease with 6+ months tracked and 1-3 late payments */
  APPROVED_LATE_PAYMENTS = 'APPROVED_LATE_PAYMENTS',

  /** Lease terminated due to chronic late payments (>3) or default */
  APPROVED_DEFAULTED = 'APPROVED_DEFAULTED',
}
