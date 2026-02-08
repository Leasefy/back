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
 * AffordabilityModel
 *
 * Scores property affordability against tenant income.
 * 40% weight in overall match score.
 *
 * Logic:
 * - RTI <= 0.30: 100 points (Excelente)
 * - RTI 0.30-0.35: 80 points (Buen ajuste)
 * - RTI 0.35-0.40: 60 points (Aceptable)
 * - RTI > 0.40: 20-40 points (Fuera de presupuesto)
 */
@Injectable()
export class AffordabilityModel {
  /**
   * Score property affordability based on rent-to-income ratio.
   *
   * @param property - Property to evaluate
   * @param tenantProfile - Tenant profile from UsersService.getTenantProfile()
   * @returns SubModelResult with score (0-100) and Spanish label
   */
  score(property: Property, tenantProfile: TenantProfile): SubModelResult {
    const monthlyRent = property.monthlyRent + property.adminFee;
    const income = tenantProfile.applicationData?.income ?? 0;

    // No income data = neutral score
    if (income === 0) {
      return { score: 50, label: 'Sin informacion de ingresos' };
    }

    const rentToIncomeRatio = monthlyRent / income;

    if (rentToIncomeRatio <= 0.30) {
      return { score: 100, label: 'Excelente ajuste de presupuesto' };
    }
    if (rentToIncomeRatio <= 0.35) {
      return { score: 80, label: 'Buen ajuste de presupuesto' };
    }
    if (rentToIncomeRatio <= 0.40) {
      return { score: 60, label: 'Ajuste aceptable' };
    }

    // Over budget: score decreases as ratio increases
    const overBudgetScore = Math.max(20, Math.round(60 - (rentToIncomeRatio - 0.40) * 100));
    return { score: overBudgetScore, label: 'Fuera de presupuesto ideal' };
  }
}
