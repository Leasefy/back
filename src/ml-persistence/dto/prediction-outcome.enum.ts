/**
 * PredictionOutcome
 *
 * Actual outcome of a prediction after landlord decision and lease lifecycle.
 * Used to track whether the model's prediction matched reality.
 *
 * TypeScript enum (NOT a Prisma enum) - stored as strings in the database.
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
}
