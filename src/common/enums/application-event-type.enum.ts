/**
 * Application event type enum matching Prisma schema.
 * Defines the types of events recorded in the application audit trail.
 *
 * CREATED: Application was created
 * STEP_COMPLETED: Wizard step was completed
 * SUBMITTED: Application was submitted for review
 * STATUS_CHANGED: Application status was changed
 * INFO_REQUESTED: Landlord requested additional information
 * INFO_PROVIDED: Tenant provided requested information
 * DOCUMENT_UPLOADED: Document was uploaded
 * DOCUMENT_DELETED: Document was deleted
 * WITHDRAWN: Application was withdrawn by tenant
 */
export enum ApplicationEventType {
  CREATED = 'CREATED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  SUBMITTED = 'SUBMITTED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  INFO_REQUESTED = 'INFO_REQUESTED',
  INFO_PROVIDED = 'INFO_PROVIDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  WITHDRAWN = 'WITHDRAWN',
}
