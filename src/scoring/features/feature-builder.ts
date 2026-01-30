import { Injectable } from '@nestjs/common';
import { Application, Property } from '@prisma/client';
import { ScoringFeatures } from './scoring-features.interface.js';
import { PersonalInfoDto } from '../../applications/dto/personal-info.dto.js';
import {
  EmploymentInfoDto,
  EmploymentType,
} from '../../applications/dto/employment-info.dto.js';
import { IncomeInfoDto } from '../../applications/dto/income-info.dto.js';
import { ReferencesDto } from '../../applications/dto/references.dto.js';

/**
 * FeatureBuilder
 *
 * Extracts and calculates scoring-relevant features from Application and Property data.
 * Handles type casting from Prisma JSON fields to typed DTOs.
 * Protects against division-by-zero in ratio calculations.
 */
@Injectable()
export class FeatureBuilder {
  /**
   * Build ScoringFeatures from Application and Property data.
   *
   * @param application - The application with JSON field data
   * @param property - The property being applied for
   * @returns Calculated ScoringFeatures for scoring models
   */
  build(application: Application, property: Property): ScoringFeatures {
    // Cast JSON fields to typed DTOs
    const personal = application.personalInfo as unknown as PersonalInfoDto;
    const employment =
      application.employmentInfo as unknown as EmploymentInfoDto;
    const income = application.incomeInfo as unknown as IncomeInfoDto;
    const references = application.referencesInfo as unknown as ReferencesDto;

    // Calculate financial values
    const monthlySalary = income?.monthlySalary ?? 0;
    const additionalIncome = income?.additionalIncome ?? 0;
    const monthlyIncome = monthlySalary + additionalIncome;
    const monthlyDebtPayments = income?.monthlyDebtPayments ?? 0;
    const rentAmount = property.monthlyRent + property.adminFee;

    // Calculate ratios with division-by-zero protection
    const rentToIncomeRatio =
      monthlyIncome > 0 ? rentAmount / monthlyIncome : 1.0;
    const debtToIncomeRatio =
      monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 1.0;
    const disposableIncome = monthlyIncome - monthlyDebtPayments - rentAmount;

    return {
      // Personal
      age: this.calculateAge(personal?.dateOfBirth),
      hasCurrentAddress: !!personal?.currentAddress,

      // Employment
      employmentType: employment?.employmentType ?? EmploymentType.UNEMPLOYED,
      employmentTenureMonths: this.calculateMonthsSince(employment?.startDate),
      hasEmployerContact: !!(
        employment?.hrContactPhone || employment?.hrContactEmail
      ),

      // Financial
      monthlyIncome,
      monthlyDebtPayments,
      rentAmount,
      rentToIncomeRatio,
      debtToIncomeRatio,
      disposableIncome,

      // References
      hasLandlordReference: !!references?.landlordReference,
      hasEmploymentReference: !!references?.employmentReference,
      personalReferenceCount: references?.personalReferences?.length ?? 0,

      // Additional context for integrity checks
      hasAdditionalIncomeSource: !!income?.additionalIncomeSource,
      monthlySalary,
    };
  }

  /**
   * Calculate age from date of birth string.
   *
   * @param dateOfBirth - ISO date string (e.g., '1990-05-15')
   * @returns Age in years, or 0 if invalid/missing
   */
  private calculateAge(dateOfBirth: string | undefined): number {
    if (!dateOfBirth) return 0;

    const birth = new Date(dateOfBirth);
    if (isNaN(birth.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // Adjust if birthday hasn't occurred this year
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return Math.max(0, age);
  }

  /**
   * Calculate months since a given start date.
   *
   * @param startDate - ISO date string (e.g., '2020-03-01')
   * @returns Months elapsed, or 0 if invalid/missing
   */
  private calculateMonthsSince(startDate: string | undefined): number {
    if (!startDate) return 0;

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return 0;

    const today = new Date();
    const months =
      (today.getFullYear() - start.getFullYear()) * 12 +
      (today.getMonth() - start.getMonth());

    return Math.max(0, months);
  }
}
