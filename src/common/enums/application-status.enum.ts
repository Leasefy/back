/**
 * Application status enum matching Prisma schema.
 * Defines the stages an application goes through in the rental process.
 *
 * DRAFT: Application started but not submitted
 * SUBMITTED: Application submitted for review
 * UNDER_REVIEW: Landlord is reviewing the application
 * NEEDS_INFO: Landlord requested additional information
 * PREAPPROVED: Application passed initial review, pending final approval
 * APPROVED: Application accepted, ready for contract
 * REJECTED: Application denied
 * WITHDRAWN: Tenant withdrew the application
 */
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NEEDS_INFO = 'NEEDS_INFO',
  PREAPPROVED = 'PREAPPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}
