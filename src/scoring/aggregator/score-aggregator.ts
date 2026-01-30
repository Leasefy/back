import { Injectable } from '@nestjs/common';
import { RiskLevel, getRiskLevelFromScore } from '../../common/enums/index.js';
import { ModelResult, Signal } from '../models/model-result.interface.js';
import {
  RiskScoreResultData,
  Driver,
  Flag,
  Condition,
} from './risk-score-result.interface.js';

/**
 * Level thresholds for risk classification.
 * Used to determine the risk level from total score.
 */
const LEVEL_THRESHOLDS = {
  A: 80, // 80-100: Excellent
  B: 65, // 65-79: Good
  C: 50, // 50-64: Fair
  D: 0, // 0-49: Poor
} as const;

/**
 * Flag codes that trigger income verification condition.
 */
const INCOME_VERIFICATION_FLAGS = ['HIGH_RTI', 'UNVERIFIABLE_HIGH_INCOME'];

/**
 * ScoreAggregator
 *
 * Combines scores from all four scoring models into a single risk assessment.
 * Responsibilities:
 * - Sum subscores into total (0-100)
 * - Determine risk level (A/B/C/D)
 * - Collect signals into drivers
 * - Extract flags from negative signals
 * - Generate conditions based on level and flags
 */
@Injectable()
export class ScoreAggregator {
  /**
   * Combine results from all scoring models into final risk score.
   *
   * @param results - Results from each scoring model
   * @returns Complete risk score result with explainability data
   */
  combine(results: {
    financial: ModelResult;
    stability: ModelResult;
    history: ModelResult;
    integrity: ModelResult;
  }): RiskScoreResultData {
    // Sum all scores
    const total =
      results.financial.score +
      results.stability.score +
      results.history.score +
      results.integrity.score;

    // Bound total to 0-100 range
    const boundedTotal = Math.max(0, Math.min(100, total));

    // Calculate level using helper function
    const level = getRiskLevelFromScore(boundedTotal);

    // Collect all signals into drivers
    const allSignals = [
      ...results.financial.signals,
      ...results.stability.signals,
      ...results.history.signals,
      ...results.integrity.signals,
    ];

    const drivers: Driver[] = allSignals.map((s) => ({
      text: s.message,
      positive: s.positive,
    }));

    // Extract flags from integrity signals (negative ones indicate concerns)
    const flags: Flag[] = results.integrity.signals
      .filter((s) => !s.positive)
      .map((s) => ({
        code: s.code,
        severity: this.calculateSeverity(s.weight),
        message: s.message,
      }));

    // Generate conditions based on level and flags
    const conditions = this.generateConditions(level, flags);

    return {
      total: boundedTotal,
      level,
      categories: {
        integrity: results.integrity.score,
        financial: results.financial.score,
        stability: results.stability.score,
        history: results.history.score,
      },
      drivers,
      flags,
      conditions,
    };
  }

  /**
   * Calculate severity based on signal weight.
   * Higher weight deductions = more severe.
   *
   * @param weight - Signal weight (typically negative for deductions)
   * @returns Severity level
   */
  private calculateSeverity(weight: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Weight is typically the points deducted (negative or low positive)
    // Higher absolute deduction = more severe
    const absWeight = Math.abs(weight);

    if (absWeight >= 10) return 'HIGH';
    if (absWeight >= 5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate conditions based on risk level and flags.
   *
   * Logic:
   * - Level C: Suggest extra deposit (2 months), not required
   * - Level D: Require cosigner
   * - HIGH_RTI flag: Require income verification
   * - UNVERIFIABLE_HIGH_INCOME flag: Require income verification
   *
   * @param level - Risk level
   * @param flags - Identified flags
   * @returns Array of conditions
   */
  private generateConditions(level: RiskLevel, flags: Flag[]): Condition[] {
    const conditions: Condition[] = [];

    // Level-based conditions
    if (level === RiskLevel.C) {
      conditions.push({
        type: 'DEPOSIT',
        message:
          'Se recomienda solicitar un deposito de 2 meses de arriendo debido al perfil de riesgo moderado',
        required: false,
      });
    }

    if (level === RiskLevel.D) {
      conditions.push({
        type: 'COSIGNER',
        message:
          'Se requiere un codeudor o fiador debido al perfil de riesgo alto',
        required: true,
      });
    }

    // Flag-based conditions
    const flagCodes = flags.map((f) => f.code);
    const needsIncomeVerification = INCOME_VERIFICATION_FLAGS.some((code) =>
      flagCodes.includes(code),
    );

    if (needsIncomeVerification) {
      conditions.push({
        type: 'INCOME_VERIFICATION',
        message:
          'Se requiere verificacion adicional de ingresos debido a la relacion arriendo/ingresos',
        required: true,
      });
    }

    return conditions;
  }
}
