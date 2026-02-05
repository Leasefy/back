import { Injectable } from '@nestjs/common';
import { ScoringFeatures } from '../features/scoring-features.interface.js';
import { ModelResult, Signal } from './model-result.interface.js';
import { EmploymentType } from '../../applications/dto/employment-info.dto.js';

/**
 * StabilityModel
 *
 * Evaluates the applicant's employment stability:
 * - Employment type: Full-time vs. self-employed vs. unemployed
 * - Employment tenure: How long at current position
 * - Verifiable contact: Can we confirm employment?
 *
 * Maximum score: 25 points (25% of total)
 */
@Injectable()
export class StabilityModel {
  /** Maximum score this model can award */
  private readonly MAX_SCORE = 25;

  /**
   * Calculate stability subscore based on employment factors.
   *
   * @param features - Extracted scoring features
   * @returns ModelResult with score (0-25) and explanatory signals
   */
  calculate(features: ScoringFeatures): ModelResult {
    let score = 0;
    const signals: Signal[] = [];

    // Employment type scoring (max 10 points)
    score += this.scoreEmploymentType(features.employmentType, signals);

    // Employment tenure scoring (max 10 points)
    score += this.scoreEmploymentTenure(
      features.employmentTenureMonths,
      signals,
    );

    // Verifiable employer contact scoring (max 5 points)
    score += this.scoreEmployerContact(features.hasEmployerContact, signals);

    return {
      score,
      maxScore: this.MAX_SCORE,
      signals,
    };
  }

  /**
   * Score employment type (max 10 points).
   * More stable employment = higher score.
   *
   * Scoring:
   * - EMPLOYED: 10 (most stable, verifiable)
   * - RETIRED: 9 (stable income from pension)
   * - SELF_EMPLOYED: 7 (income may vary)
   * - CONTRACTOR: 6 (employment term uncertainty)
   * - STUDENT: 4 (limited income potential)
   * - UNEMPLOYED: 0 (no verifiable income)
   */
  private scoreEmploymentType(
    employmentType: EmploymentType,
    signals: Signal[],
  ): number {
    switch (employmentType) {
      case EmploymentType.EMPLOYED:
        signals.push({
          code: 'STABLE_EMPLOYMENT',
          positive: true,
          weight: 10,
          message: 'Empleado con contrato formal, ingresos estables',
        });
        return 10;

      case EmploymentType.RETIRED:
        signals.push({
          code: 'RETIRED',
          positive: true,
          weight: 9,
          message: 'Pensionado con ingresos estables de pension',
        });
        return 9;

      case EmploymentType.SELF_EMPLOYED:
        signals.push({
          code: 'SELF_EMPLOYED',
          positive: true,
          weight: 7,
          message: 'Independiente, ingresos pueden variar',
        });
        return 7;

      case EmploymentType.CONTRACTOR:
        signals.push({
          code: 'CONTRACTOR',
          positive: true,
          weight: 6,
          message: 'Contratista, duracion del trabajo puede ser incierta',
        });
        return 6;

      case EmploymentType.STUDENT:
        signals.push({
          code: 'STUDENT',
          positive: false,
          weight: 4,
          message: 'Estudiante, capacidad de ingresos limitada',
        });
        return 4;

      case EmploymentType.UNEMPLOYED:
        signals.push({
          code: 'UNEMPLOYED',
          positive: false,
          weight: 0,
          message: 'Desempleado, sin ingresos verificables de empleo',
        });
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Score employment tenure (max 10 points).
   * Longer tenure = more stability.
   *
   * Thresholds:
   * - >= 24 months: Long tenure, very stable
   * - >= 12 months: Established, stable
   * - >= 6 months: Moderate tenure
   * - >= 3 months: Short tenure (new job)
   * - < 3 months: Very short tenure (probation period)
   */
  private scoreEmploymentTenure(
    tenureMonths: number,
    signals: Signal[],
  ): number {
    if (tenureMonths >= 24) {
      signals.push({
        code: 'LONG_TENURE',
        positive: true,
        weight: 10,
        message: 'Antiguedad laboral de 2+ anos, muy estable',
      });
      return 10;
    }

    if (tenureMonths >= 12) {
      signals.push({
        code: 'GOOD_TENURE',
        positive: true,
        weight: 8,
        message: 'Antiguedad laboral de 1+ ano, estable',
      });
      return 8;
    }

    if (tenureMonths >= 6) {
      signals.push({
        code: 'MODERATE_TENURE',
        positive: true,
        weight: 5,
        message: 'Antiguedad laboral de 6+ meses, moderada',
      });
      return 5;
    }

    if (tenureMonths >= 3) {
      signals.push({
        code: 'SHORT_TENURE',
        positive: false,
        weight: 2,
        message: 'Antiguedad laboral de 3+ meses, trabajo nuevo',
      });
      return 2;
    }

    signals.push({
      code: 'VERY_SHORT_TENURE',
      positive: false,
      weight: 0,
      message: 'Antiguedad laboral menor a 3 meses, posible periodo de prueba',
    });
    return 0;
  }

  /**
   * Score verifiable employer contact (max 5 points).
   * Having HR contact allows employment verification.
   */
  private scoreEmployerContact(
    hasEmployerContact: boolean,
    signals: Signal[],
  ): number {
    if (hasEmployerContact) {
      signals.push({
        code: 'VERIFIABLE_EMPLOYER',
        positive: true,
        weight: 5,
        message: 'Contacto de empleador disponible para verificacion',
      });
      return 5;
    }

    signals.push({
      code: 'NO_EMPLOYER_CONTACT',
      positive: false,
      weight: 0,
      message: 'Sin contacto de empleador para verificacion',
    });
    return 0;
  }
}
