/**
 * ScoringJobData
 *
 * Data structure for scoring queue jobs.
 * Contains all information needed to process a scoring request.
 */
export interface ScoringJobData {
  /** ID of the application to score */
  applicationId: string;
  /** User ID who triggered the scoring (submitted the application) */
  triggeredBy: string;
  /** ISO timestamp when the job was created */
  triggeredAt: string;
}
