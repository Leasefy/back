import { Injectable } from '@nestjs/common';
import { ScoringFeatures } from '../features/scoring-features.interface.js';
import { ModelResult, Signal } from './model-result.interface.js';

/**
 * HistoryModel
 *
 * Evaluates the applicant's reference history:
 * - Landlord reference: Previous rental history
 * - Employment reference: Supervisor/HR reference
 * - Personal references: Character references
 *
 * Maximum score: 15 points (15% of total)
 */
@Injectable()
export class HistoryModel {
  /** Maximum score this model can award */
  private readonly MAX_SCORE = 15;

  /**
   * Calculate history subscore based on references provided.
   *
   * @param features - Extracted scoring features
   * @returns ModelResult with score (0-15) and explanatory signals
   */
  calculate(features: ScoringFeatures): ModelResult {
    let score = 0;
    const signals: Signal[] = [];

    // Landlord reference scoring (max 6 points)
    score += this.scoreLandlordReference(
      features.hasLandlordReference,
      signals,
    );

    // Employment reference scoring (max 5 points)
    score += this.scoreEmploymentReference(
      features.hasEmploymentReference,
      signals,
    );

    // Personal references scoring (max 4 points)
    score += this.scorePersonalReferences(
      features.personalReferenceCount,
      signals,
    );

    return {
      score,
      maxScore: this.MAX_SCORE,
      signals,
    };
  }

  /**
   * Score landlord reference (max 6 points).
   * Previous landlord reference shows rental history.
   */
  private scoreLandlordReference(
    hasLandlordReference: boolean,
    signals: Signal[],
  ): number {
    if (hasLandlordReference) {
      signals.push({
        code: 'HAS_LANDLORD_REF',
        positive: true,
        weight: 6,
        message: 'Referencia de arrendador anterior disponible',
      });
      return 6;
    }

    signals.push({
      code: 'NO_LANDLORD_REF',
      positive: false,
      weight: 0,
      message:
        'Sin referencia de arrendador anterior (primer arriendo o no proporcionada)',
    });
    return 0;
  }

  /**
   * Score employment reference (max 5 points).
   * Employment reference verifies work character.
   */
  private scoreEmploymentReference(
    hasEmploymentReference: boolean,
    signals: Signal[],
  ): number {
    if (hasEmploymentReference) {
      signals.push({
        code: 'HAS_EMPLOYMENT_REF',
        positive: true,
        weight: 5,
        message: 'Referencia laboral disponible',
      });
      return 5;
    }

    signals.push({
      code: 'NO_EMPLOYMENT_REF',
      positive: false,
      weight: 0,
      message: 'Sin referencia laboral',
    });
    return 0;
  }

  /**
   * Score personal references (max 4 points).
   * More references = more character vouchers.
   *
   * Scoring:
   * - 2+ references: Full points
   * - 1 reference: Partial points
   * - 0 references: No points
   */
  private scorePersonalReferences(
    referenceCount: number,
    signals: Signal[],
  ): number {
    if (referenceCount >= 2) {
      signals.push({
        code: 'MULTIPLE_PERSONAL_REFS',
        positive: true,
        weight: 4,
        message: 'Multiples referencias personales proporcionadas',
      });
      return 4;
    }

    if (referenceCount === 1) {
      signals.push({
        code: 'SINGLE_PERSONAL_REF',
        positive: true,
        weight: 2,
        message: 'Una referencia personal proporcionada',
      });
      return 2;
    }

    signals.push({
      code: 'NO_PERSONAL_REFS',
      positive: false,
      weight: 0,
      message: 'Sin referencias personales',
    });
    return 0;
  }
}
