/**
 * Subscription tier level enum matching Prisma schema.
 * Represents the plan tier (STARTER, PRO, FLEX).
 *
 * Plan limits are now stored in the database via SubscriptionPlanConfig model.
 * Use the SubscriptionsService to query plan limits dynamically.
 *
 * Tier overview:
 * - STARTER: Free base tier. Limited properties/scoring.
 * - PRO: Paid subscription ($149,000/mo). Unlimited properties, premium scoring.
 * - FLEX: Pay-per-use tier ($0 subscription). Credits-based access to evaluations.
 */
export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  FLEX = 'FLEX',
}
