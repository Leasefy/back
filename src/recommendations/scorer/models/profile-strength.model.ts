import { Injectable } from '@nestjs/common';
import type { Property } from '@prisma/client';
import type { SubModelResult } from '../match-result.interface.js';

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
 * ProfileStrengthModel
 *
 * Scores completeness of tenant profile.
 * 15% weight in overall match score.
 *
 * Logic:
 * - Has applicationData (submitted application): +40 points
 * - Has riskData (scored): +30 points
 * - Has preferences set: +15 points
 * - Has user firstName+lastName: +15 points
 */
@Injectable()
export class ProfileStrengthModel {
  /**
   * Score tenant profile completeness.
   *
   * @param property - Property to evaluate (not used, signature consistency)
   * @param tenantProfile - Tenant profile from UsersService.getTenantProfile()
   * @returns SubModelResult with score (0-100) and Spanish label
   */
  score(property: Property, tenantProfile: TenantProfile): SubModelResult {
    let points = 0;

    // Has submitted application (+40)
    if (tenantProfile.applicationData) {
      points += 40;
    }

    // Has risk score (+30)
    if (tenantProfile.riskData) {
      points += 30;
    }

    // Has preferences set (+15)
    if (tenantProfile.preferences) {
      points += 15;
    }

    // Has complete user profile (+15)
    if (tenantProfile.user.firstName && tenantProfile.user.lastName) {
      points += 15;
    }

    // Generate label
    let label: string;
    if (points >= 85) {
      label = 'Perfil completo y verificado';
    } else if (points >= 55) {
      label = 'Perfil parcialmente completo';
    } else if (points >= 15) {
      label = 'Perfil basico - completa tu aplicacion';
    } else {
      label = 'Sin informacion de perfil';
    }

    return { score: points, label };
  }
}
