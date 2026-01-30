import { Injectable } from '@nestjs/common';
import { ScoringFeatures } from '../features/scoring-features.interface.js';
import { ModelResult, Signal } from './model-result.interface.js';

/**
 * FinancialModel
 *
 * Evaluates the applicant's financial health:
 * - Rent-to-income ratio (RTI): Can they afford the rent?
 * - Debt-to-income ratio (DTI): Are they over-leveraged?
 * - Disposable income buffer: Do they have cushion after expenses?
 *
 * Maximum score: 35 points (35% of total)
 */
@Injectable()
export class FinancialModel {
  /** Maximum score this model can award */
  private readonly MAX_SCORE = 35;

  /** Minimum disposable income buffer in COP (Colombian Pesos) */
  private readonly MIN_BUFFER_COP = 500000;

  /**
   * Calculate financial subscore based on income ratios and buffer.
   *
   * @param features - Extracted scoring features
   * @returns ModelResult with score (0-35) and explanatory signals
   */
  calculate(features: ScoringFeatures): ModelResult {
    let score = 0;
    const signals: Signal[] = [];

    // Rent-to-income ratio scoring (max 20 points)
    score += this.scoreRentToIncome(features.rentToIncomeRatio, signals);

    // Debt-to-income ratio scoring (max 10 points)
    score += this.scoreDebtToIncome(features.debtToIncomeRatio, signals);

    // Disposable income buffer scoring (max 5 points)
    score += this.scoreDisposableBuffer(features.disposableIncome, signals);

    return {
      score,
      maxScore: this.MAX_SCORE,
      signals,
    };
  }

  /**
   * Score rent-to-income ratio (max 20 points).
   * Lower RTI = more affordable rent relative to income.
   *
   * Thresholds:
   * - <= 25%: Excellent affordability
   * - <= 30%: Good affordability (standard guideline)
   * - <= 40%: Moderate affordability (stretched but manageable)
   * - > 40%: High burden (concerning)
   */
  private scoreRentToIncome(rti: number, signals: Signal[]): number {
    if (rti <= 0.25) {
      signals.push({
        code: 'LOW_RTI',
        positive: true,
        weight: 20,
        message:
          'Excelente: el arriendo representa menos del 25% de los ingresos',
      });
      return 20;
    }

    if (rti <= 0.3) {
      signals.push({
        code: 'GOOD_RTI',
        positive: true,
        weight: 17,
        message:
          'Bueno: el arriendo representa entre 25-30% de los ingresos (rango recomendado)',
      });
      return 17;
    }

    if (rti <= 0.4) {
      signals.push({
        code: 'MODERATE_RTI',
        positive: false,
        weight: 10,
        message:
          'Moderado: el arriendo representa entre 30-40% de los ingresos',
      });
      return 10;
    }

    signals.push({
      code: 'HIGH_RTI',
      positive: false,
      weight: 3,
      message: 'Alto: el arriendo supera el 40% de los ingresos',
    });
    return 3;
  }

  /**
   * Score debt-to-income ratio (max 10 points).
   * Lower DTI = less existing debt burden.
   *
   * Thresholds:
   * - <= 20%: Healthy debt level
   * - <= 35%: Acceptable debt level
   * - <= 50%: Elevated debt level
   * - > 50%: High debt burden
   */
  private scoreDebtToIncome(dti: number, signals: Signal[]): number {
    if (dti <= 0.2) {
      signals.push({
        code: 'LOW_DTI',
        positive: true,
        weight: 10,
        message: 'Excelente: deudas mensuales menores al 20% de los ingresos',
      });
      return 10;
    }

    if (dti <= 0.35) {
      signals.push({
        code: 'GOOD_DTI',
        positive: true,
        weight: 7,
        message: 'Bueno: deudas mensuales entre 20-35% de los ingresos',
      });
      return 7;
    }

    if (dti <= 0.5) {
      signals.push({
        code: 'MODERATE_DTI',
        positive: false,
        weight: 4,
        message: 'Moderado: deudas mensuales entre 35-50% de los ingresos',
      });
      return 4;
    }

    signals.push({
      code: 'HIGH_DTI',
      positive: false,
      weight: 0,
      message: 'Alto: deudas mensuales superan el 50% de los ingresos',
    });
    return 0;
  }

  /**
   * Score disposable income buffer (max 5 points).
   * Higher buffer = more financial cushion after rent and debt.
   *
   * Thresholds based on COP minimum buffer (500,000 COP ~ 125 USD):
   * - >= 2x buffer: Comfortable margin
   * - >= 1x buffer: Adequate margin
   * - < 1x buffer: Tight margin
   */
  private scoreDisposableBuffer(
    disposableIncome: number,
    signals: Signal[],
  ): number {
    if (disposableIncome >= this.MIN_BUFFER_COP * 2) {
      signals.push({
        code: 'HIGH_BUFFER',
        positive: true,
        weight: 5,
        message:
          'Excelente: ingreso disponible amplio despues de arriendo y deudas',
      });
      return 5;
    }

    if (disposableIncome >= this.MIN_BUFFER_COP) {
      signals.push({
        code: 'ADEQUATE_BUFFER',
        positive: true,
        weight: 3,
        message: 'Adecuado: ingreso disponible suficiente para imprevistos',
      });
      return 3;
    }

    signals.push({
      code: 'LOW_BUFFER',
      positive: false,
      weight: 0,
      message:
        'Limitado: ingreso disponible ajustado despues de arriendo y deudas',
    });
    return 0;
  }
}
