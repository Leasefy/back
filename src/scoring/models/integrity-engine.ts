import { Injectable } from '@nestjs/common';
import { Application } from '@prisma/client';
import { ScoringFeatures } from '../features/scoring-features.interface.js';
import { ModelResult, Signal } from './model-result.interface.js';
import { EmploymentType } from '../../applications/dto/employment-info.dto.js';

/**
 * IntegrityEngine
 *
 * Detects inconsistencies and anomalies in application data:
 * - Age vs employment tenure consistency
 * - Income vs employment type consistency
 * - Student income anomalies
 * - Unverifiable high income
 *
 * Unlike other models, this starts at full score and deducts for inconsistencies.
 * A complete, consistent application gets bonus recognition.
 *
 * Maximum score: 25 points (25% of total)
 */
@Injectable()
export class IntegrityEngine {
  /** Maximum score this model can award */
  private readonly MAX_SCORE = 25;

  /** High income threshold in COP */
  private readonly HIGH_INCOME_COP = 10000000;

  /** Student high income threshold in COP */
  private readonly STUDENT_HIGH_INCOME_COP = 5000000;

  /**
   * Analyze application for data integrity issues.
   * Starts at full score and deducts for inconsistencies.
   *
   * @param application - The full application (for additional context if needed)
   * @param features - Extracted scoring features
   * @returns ModelResult with score (0-25) and explanatory signals
   */
  analyze(application: Application, features: ScoringFeatures): ModelResult {
    let score = this.MAX_SCORE;
    const signals: Signal[] = [];

    // Check 1: Age vs tenure consistency (deduct up to 10 points)
    score -= this.checkAgeTenureConsistency(features, signals);

    // Check 2: Income vs employment type consistency (deduct up to 8 points)
    score -= this.checkIncomeEmploymentConsistency(features, signals);

    // Check 3: Student with high income (deduct up to 5 points)
    score -= this.checkStudentIncome(features, signals);

    // Check 4: Unverifiable high income (deduct up to 5 points)
    score -= this.checkUnverifiableHighIncome(features, signals);

    // Bonus: Complete application recognition (no deduction)
    this.checkCompleteness(features, signals);

    // Ensure score doesn't go negative
    score = Math.max(0, score);

    return {
      score,
      maxScore: this.MAX_SCORE,
      signals,
    };
  }

  /**
   * Check if employment tenure is plausible given age.
   * Someone can't have worked longer than they've been an adult.
   *
   * Example: 22-year-old claiming 10 years employment is impossible.
   *
   * @returns Points to deduct (0 or 10)
   */
  private checkAgeTenureConsistency(
    features: ScoringFeatures,
    signals: Signal[],
  ): number {
    // Calculate maximum possible work months (age - 18) * 12
    const maxPossibleWorkMonths = Math.max(0, (features.age - 18) * 12);

    if (
      features.employmentTenureMonths > 0 &&
      features.employmentTenureMonths > maxPossibleWorkMonths
    ) {
      signals.push({
        code: 'TENURE_AGE_MISMATCH',
        positive: false,
        weight: -10,
        message: `Inconsistencia: antiguedad laboral (${features.employmentTenureMonths} meses) excede tiempo posible de trabajo para edad (${features.age} anos)`,
      });
      return 10;
    }

    return 0;
  }

  /**
   * Check if reported salary makes sense for employment type.
   * Unemployed people shouldn't report a salary.
   *
   * @returns Points to deduct (0 or 8)
   */
  private checkIncomeEmploymentConsistency(
    features: ScoringFeatures,
    signals: Signal[],
  ): number {
    if (
      features.employmentType === EmploymentType.UNEMPLOYED &&
      features.monthlySalary > 0
    ) {
      signals.push({
        code: 'INCOME_EMPLOYMENT_MISMATCH',
        positive: false,
        weight: -8,
        message: `Inconsistencia: reporta salario (${features.monthlySalary.toLocaleString()} COP) pero indica estar desempleado`,
      });
      return 8;
    }

    return 0;
  }

  /**
   * Check if student has unusually high income without explanation.
   * Students with high income should have explained additional income source.
   *
   * @returns Points to deduct (0 or 5)
   */
  private checkStudentIncome(
    features: ScoringFeatures,
    signals: Signal[],
  ): number {
    if (
      features.employmentType === EmploymentType.STUDENT &&
      features.monthlyIncome > this.STUDENT_HIGH_INCOME_COP &&
      !features.hasAdditionalIncomeSource
    ) {
      signals.push({
        code: 'HIGH_STUDENT_INCOME',
        positive: false,
        weight: -5,
        message: `Inusual: estudiante con ingresos altos (${features.monthlyIncome.toLocaleString()} COP) sin explicacion de fuente adicional`,
      });
      return 5;
    }

    return 0;
  }

  /**
   * Check if high income is verifiable.
   * High earners who aren't self-employed should have employer contact.
   *
   * @returns Points to deduct (0 or 5)
   */
  private checkUnverifiableHighIncome(
    features: ScoringFeatures,
    signals: Signal[],
  ): number {
    if (
      features.monthlyIncome > this.HIGH_INCOME_COP &&
      !features.hasEmployerContact &&
      features.employmentType !== EmploymentType.SELF_EMPLOYED &&
      features.employmentType !== EmploymentType.RETIRED
    ) {
      signals.push({
        code: 'UNVERIFIABLE_HIGH_INCOME',
        positive: false,
        weight: -5,
        message: `Riesgo: ingresos altos (${features.monthlyIncome.toLocaleString()} COP) sin contacto de empleador para verificacion`,
      });
      return 5;
    }

    return 0;
  }

  /**
   * Recognize complete applications with all verifiable information.
   * This doesn't affect score but provides positive signal.
   */
  private checkCompleteness(
    features: ScoringFeatures,
    signals: Signal[],
  ): void {
    if (
      features.hasCurrentAddress &&
      features.hasEmployerContact &&
      features.hasLandlordReference
    ) {
      signals.push({
        code: 'COMPLETE_APPLICATION',
        positive: true,
        weight: 0,
        message: 'Solicitud completa: direccion, contacto empleador y referencia de arrendador proporcionados',
      });
    }
  }
}
