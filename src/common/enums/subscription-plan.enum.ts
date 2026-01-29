/**
 * Subscription plan enum matching Prisma schema.
 * Defines the subscription tier for users.
 *
 * FREE: 1 property, 1 contract, no AI scoring
 * PRO: 10 properties, unlimited contracts, AI scoring ($149,900/month)
 * BUSINESS: Unlimited properties, API access ($499,900/month)
 */
export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}

/**
 * Plan limits configuration
 */
export const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: {
    maxProperties: 1,
    maxContracts: 1,
    aiScoring: false,
    apiAccess: false,
  },
  [SubscriptionPlan.PRO]: {
    maxProperties: 10,
    maxContracts: Infinity,
    aiScoring: true,
    apiAccess: false,
  },
  [SubscriptionPlan.BUSINESS]: {
    maxProperties: Infinity,
    maxContracts: Infinity,
    aiScoring: true,
    apiAccess: true,
  },
} as const;
