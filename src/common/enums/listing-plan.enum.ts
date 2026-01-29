/**
 * Listing plan enum matching Prisma schema.
 * Defines the subscription tier for property listings.
 *
 * FREE: Basic listing with standard visibility
 * PRO: Enhanced listing with priority placement
 * BUSINESS: Premium listing with maximum exposure
 */
export enum ListingPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}
