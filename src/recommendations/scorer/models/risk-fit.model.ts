import { Injectable } from '@nestjs/common';
import { Property, RiskLevel } from '@prisma/client';
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
 * RiskFitModel
 *
 * Scores tenant risk level fit for property requirements.
 * 30% weight in overall match score.
 *
 * Logic:
 * - Risk level A: 100 points (any property)
 * - Risk level B: 85 points (most properties)
 * - Risk level C: 60 points (may need higher deposit)
 * - Risk level D: 30 points (needs cosigner)
 * - No risk score: 50 points (neutral)
 */
@Injectable()
export class RiskFitModel {
  /**
   * Score tenant risk level fit for property.
   *
   * @param property - Property to evaluate
   * @param tenantProfile - Tenant profile from UsersService.getTenantProfile()
   * @returns SubModelResult with score (0-100) and Spanish label
   */
  score(property: Property, tenantProfile: TenantProfile): SubModelResult {
    const riskLevel = tenantProfile.riskData?.level as RiskLevel | undefined;

    if (!riskLevel) {
      return { score: 50, label: 'Sin evaluacion de riesgo' };
    }

    switch (riskLevel) {
      case RiskLevel.A:
        return { score: 100, label: 'Perfil excelente para esta propiedad' };
      case RiskLevel.B:
        return { score: 85, label: 'Buen perfil para esta propiedad' };
      case RiskLevel.C:
        return { score: 60, label: 'Perfil aceptable, puede requerir deposito adicional' };
      case RiskLevel.D:
        return { score: 30, label: 'Perfil de riesgo alto, puede requerir codeudor' };
      default:
        return { score: 50, label: 'Sin evaluacion de riesgo' };
    }
  }
}
