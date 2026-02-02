/**
 * Status of an active lease
 * ACTIVE: Lease in effect, tenant occupying property
 * ENDING_SOON: Within 30 days of end date
 * ENDED: Natural termination at end date
 * TERMINATED: Early termination
 */
export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  ENDING_SOON = 'ENDING_SOON',
  ENDED = 'ENDED',
  TERMINATED = 'TERMINATED',
}
