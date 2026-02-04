/**
 * Subscription tier level enum matching Prisma schema.
 * Represents the plan tier (FREE, PRO, BUSINESS).
 *
 * Plan limits are now stored in the database via SubscriptionPlanConfig model.
 * Use the SubscriptionsService to query plan limits dynamically.
 */
export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}
