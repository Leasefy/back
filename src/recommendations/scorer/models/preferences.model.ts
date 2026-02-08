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
 * PreferencesModel
 *
 * Scores property match against tenant preferences.
 * 15% weight in overall match score.
 *
 * Logic:
 * - City match: +30 points (or 0)
 * - Bedroom match: +25 points (or 0)
 * - Property type match: +25 points (or 0)
 * - Budget match (minBudget <= rent <= maxBudget): +20 points (or 0)
 * Total: 0-100 based on criteria met
 */
@Injectable()
export class PreferencesModel {
  /**
   * Score property match against tenant preferences.
   *
   * @param property - Property to evaluate
   * @param tenantProfile - Tenant profile from UsersService.getTenantProfile()
   * @returns SubModelResult with score (0-100) and Spanish label
   */
  score(property: Property, tenantProfile: TenantProfile): SubModelResult {
    const prefs = tenantProfile.preferences;

    // No preferences = neutral
    if (!prefs) {
      return { score: 50, label: 'Sin preferencias configuradas' };
    }

    let points = 0;
    const matches: string[] = [];
    let hasCriteria = false;

    // City match (30 points)
    if (prefs.preferredCities && prefs.preferredCities.length > 0) {
      hasCriteria = true;
      if (prefs.preferredCities.includes(property.city)) {
        points += 30;
        matches.push('ciudad');
      }
    }

    // Bedroom match (25 points)
    if (prefs.preferredBedrooms !== null) {
      hasCriteria = true;
      if (property.bedrooms === prefs.preferredBedrooms) {
        points += 25;
        matches.push('habitaciones');
      }
    }

    // Property type match (25 points)
    if (prefs.preferredPropertyTypes && prefs.preferredPropertyTypes.length > 0) {
      hasCriteria = true;
      if (prefs.preferredPropertyTypes.includes(property.type)) {
        points += 25;
        matches.push('tipo');
      }
    }

    // Budget match (20 points)
    if (prefs.minBudget !== null || prefs.maxBudget !== null) {
      hasCriteria = true;
      const minOk = prefs.minBudget === null || property.monthlyRent >= prefs.minBudget;
      const maxOk = prefs.maxBudget === null || property.monthlyRent <= prefs.maxBudget;
      if (minOk && maxOk) {
        points += 20;
        matches.push('presupuesto');
      }
    }

    // If no criteria were set at all, return neutral
    if (!hasCriteria) {
      return { score: 50, label: 'Sin preferencias configuradas' };
    }

    const label = matches.length > 0
      ? `Coincide con tus preferencias: ${matches.join(', ')}`
      : 'No coincide con tus preferencias';

    return { score: points, label };
  }
}
