import { Injectable, BadRequestException } from '@nestjs/common';
import { InsuranceTier } from '../common/enums/index.js';
import { INSURANCE_PLANS, InsurancePlanDefinition } from './insurance.constants.js';

@Injectable()
export class InsuranceService {
  /**
   * Get all available insurance tiers with pricing and coverage.
   * Used by GET /insurance/tiers endpoint.
   */
  getAllTiers(): InsurancePlanDefinition[] {
    return Object.values(INSURANCE_PLANS);
  }

  /**
   * Get details for a specific tier.
   * Used by GET /insurance/tiers/:tier endpoint.
   * Throws BadRequestException for invalid tier.
   */
  getTierDetails(tier: InsuranceTier): InsurancePlanDefinition {
    const plan = INSURANCE_PLANS[tier];
    if (!plan) {
      throw new BadRequestException(`Invalid insurance tier: ${tier}`);
    }
    return plan;
  }

  /**
   * Calculate the monthly insurance premium for a given tier.
   * Returns 0 for NONE tier.
   */
  calculatePremium(tier: InsuranceTier): number {
    const plan = INSURANCE_PLANS[tier];
    if (!plan) {
      throw new BadRequestException(`Invalid insurance tier: ${tier}`);
    }
    return plan.monthlyPremium;
  }

  /**
   * Build the insurance details text for contract rendering.
   * Returns empty string for NONE tier.
   * Used by ContractsService when creating contracts.
   */
  buildInsuranceDetails(tier: InsuranceTier): string {
    const plan = INSURANCE_PLANS[tier];
    if (!plan || tier === InsuranceTier.NONE) {
      return '';
    }
    return plan.description;
  }

  /**
   * Validate that a tier value is a valid InsuranceTier.
   */
  isValidTier(tier: string): tier is InsuranceTier {
    return Object.values(InsuranceTier).includes(tier as InsuranceTier);
  }
}
