import { Injectable } from '@nestjs/common';
import type { Property } from '@prisma/client';
import type { MatchResult } from './match-result.interface.js';
import { AffordabilityModel } from './models/affordability.model.js';
import { RiskFitModel } from './models/risk-fit.model.js';
import { ProfileStrengthModel } from './models/profile-strength.model.js';
import { PreferencesModel } from './models/preferences.model.js';

/**
 * TenantProfile shape from UsersService.getTenantProfile()
 */
type TenantProfile = {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: string;
  };
  preferences: {
    userId: string;
    preferredCities: string[];
    preferredBedrooms: number | null;
    preferredPropertyTypes: string[];
    minBudget: number | null;
    maxBudget: number | null;
    petFriendly: boolean;
    moveInDate: Date | null;
  } | null;
  applicationData: {
    income: number | null;
    employment: string | null;
    employmentCompany: string | null;
    applicationId: string;
  } | null;
  riskData: {
    totalScore: number;
    level: string;
  } | null;
};

/**
 * RecommendationScorer
 *
 * Aggregates 4 weighted sub-models to compute property match scores:
 * - Affordability: 40% (rent-to-income fit)
 * - Risk Fit: 30% (tenant risk level)
 * - Profile Strength: 15% (profile completeness)
 * - Preferences: 15% (city/bedrooms/type/budget match)
 *
 * Produces MatchResult with:
 * - matchScore (0-100)
 * - acceptanceProbability (alta/media/baja)
 * - matchFactors (breakdown by sub-model)
 * - recommendation (Spanish explanation)
 */
@Injectable()
export class RecommendationScorer {
  constructor(
    private readonly affordabilityModel: AffordabilityModel,
    private readonly riskFitModel: RiskFitModel,
    private readonly profileStrengthModel: ProfileStrengthModel,
    private readonly preferencesModel: PreferencesModel,
  ) {}

  /**
   * Score a property against a tenant profile.
   *
   * @param property - Property to score
   * @param tenantProfile - Tenant profile from UsersService.getTenantProfile()
   * @returns Complete MatchResult with weighted score and explanations
   */
  score(property: Property, tenantProfile: TenantProfile): MatchResult {
    // Score each sub-model
    const affordability = this.affordabilityModel.score(property, tenantProfile);
    const riskFit = this.riskFitModel.score(property, tenantProfile);
    const profileStrength = this.profileStrengthModel.score(property, tenantProfile);
    const preferences = this.preferencesModel.score(property, tenantProfile);

    // Compute weighted matchScore
    // Weights: 40% + 30% + 15% + 15% = 100%
    const matchScore = Math.round(
      affordability.score * 0.40 +
      riskFit.score * 0.30 +
      profileStrength.score * 0.15 +
      preferences.score * 0.15
    );

    // Compute acceptance probability
    let acceptanceProbability: 'alta' | 'media' | 'baja';
    if (matchScore >= 70) {
      acceptanceProbability = 'alta';
    } else if (matchScore >= 50) {
      acceptanceProbability = 'media';
    } else {
      acceptanceProbability = 'baja';
    }

    // Generate recommendation text (Spanish, focused on affordability as most impactful)
    let recommendation: string;
    if (acceptanceProbability === 'alta') {
      recommendation = `Esta propiedad es una excelente opcion para ti. ${affordability.label}.`;
    } else if (acceptanceProbability === 'media') {
      recommendation = `Esta propiedad podria funcionar para ti. ${affordability.label}.`;
    } else {
      recommendation = `Esta propiedad puede no ser la mejor opcion. ${affordability.label}.`;
    }

    return {
      propertyId: property.id,
      matchScore,
      acceptanceProbability,
      matchFactors: {
        affordability,
        riskFit,
        profileStrength,
        preferences,
      },
      recommendation,
    };
  }
}
