/**
 * Status of a payment dispute.
 * Tracks the dispute lifecycle from opening to resolution.
 *
 * OPEN: Dispute opened by tenant
 * UNDER_REVIEW: Admin reviewing
 * RESOLVED_FAVOR_TENANT: Resolved in tenant's favor (payment approved)
 * RESOLVED_FAVOR_LANDLORD: Resolved in landlord's favor (rejection stands)
 * CLOSED: Administratively closed
 */
export enum PaymentDisputeStatus {
  /** Dispute opened by tenant */
  OPEN = 'OPEN',

  /** Admin reviewing */
  UNDER_REVIEW = 'UNDER_REVIEW',

  /** Resolved in tenant's favor (payment approved) */
  RESOLVED_FAVOR_TENANT = 'RESOLVED_FAVOR_TENANT',

  /** Resolved in landlord's favor (rejection stands) */
  RESOLVED_FAVOR_LANDLORD = 'RESOLVED_FAVOR_LANDLORD',

  /** Administratively closed */
  CLOSED = 'CLOSED',
}
