import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ModelResult, Signal } from './model-result.interface.js';

/**
 * DocumentVerificationModel
 *
 * Bonus scoring model (0-15 points) based on AI document analysis results.
 * Similar pattern to PaymentHistoryModel - adds bonus on top of base 100.
 *
 * Score breakdown:
 * - Documents analyzed with high confidence (>0.8): +5 pts
 * - Cross-validation without inconsistencies: +5 pts
 * - All key documents present and verified: +5 pts
 * - Severe inconsistencies found: -10 pts
 *
 * Max total: 15 pts (capped)
 */
@Injectable()
export class DocumentVerificationModel {
  private readonly MAX_BONUS = 15;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate bonus score from document analysis results.
   *
   * @param applicationId - Application to check
   * @returns ModelResult with score (0-15) and signals
   */
  async calculate(applicationId: string): Promise<ModelResult> {
    const signals: Signal[] = [];

    const results = await this.prisma.documentAnalysisResult.findMany({
      where: {
        applicationId,
        status: 'COMPLETED',
      },
    });

    // No analysis results = no bonus (not a penalty)
    if (results.length === 0) {
      signals.push({
        code: 'NO_DOCUMENT_ANALYSIS',
        positive: true,
        weight: 0,
        message: 'Documentos no analizados con IA (sin bonus ni penalización)',
      });
      return { score: 0, maxScore: this.MAX_BONUS, signals };
    }

    let score = 0;

    // 1. High confidence analysis (+5 pts)
    const highConfidenceCount = results.filter(
      (r) => (r.confidence ?? 0) > 0.8,
    ).length;
    const highConfidenceRatio = highConfidenceCount / results.length;

    if (highConfidenceRatio >= 0.8) {
      score += 5;
      signals.push({
        code: 'HIGH_CONFIDENCE_DOCS',
        positive: true,
        weight: 5,
        message: `${highConfidenceCount}/${results.length} documentos analizados con alta confianza`,
      });
    } else if (highConfidenceRatio >= 0.5) {
      score += 3;
      signals.push({
        code: 'MODERATE_CONFIDENCE_DOCS',
        positive: true,
        weight: 3,
        message: `${highConfidenceCount}/${results.length} documentos con alta confianza`,
      });
    }

    // 2. Cross-validation consistency (+5 pts)
    const allInconsistencies = results.flatMap((r) => {
      const incs = r.inconsistencies;
      return Array.isArray(incs) ? incs : [];
    });

    const severeInconsistencies = allInconsistencies.filter(
      (i) =>
        typeof i === 'object' &&
        i !== null &&
        (i as Record<string, unknown>).severity === 'HIGH',
    );

    if (allInconsistencies.length === 0) {
      score += 5;
      signals.push({
        code: 'NO_INCONSISTENCIES',
        positive: true,
        weight: 5,
        message:
          'Sin inconsistencias detectadas entre documentos',
      });
    } else if (severeInconsistencies.length === 0) {
      score += 3;
      signals.push({
        code: 'MINOR_INCONSISTENCIES',
        positive: true,
        weight: 3,
        message: `${allInconsistencies.length} inconsistencia(s) menores detectadas`,
      });
    } else {
      // Severe inconsistencies found - penalty
      score -= 10;
      signals.push({
        code: 'SEVERE_INCONSISTENCIES',
        positive: false,
        weight: -10,
        message: `${severeInconsistencies.length} inconsistencia(s) graves entre documentos`,
      });
    }

    // 3. Key document coverage (+5 pts)
    const docTypes = new Set(results.map((r) => String(r.documentType)));
    const keyDocCount = [
      'ID_DOCUMENT',
      'EMPLOYMENT_LETTER',
      'PAY_STUB',
      'BANK_STATEMENT',
    ].filter((t) => docTypes.has(t)).length;

    if (keyDocCount >= 4) {
      score += 5;
      signals.push({
        code: 'FULL_DOCUMENT_COVERAGE',
        positive: true,
        weight: 5,
        message: 'Todos los documentos clave analizados y verificados',
      });
    } else if (keyDocCount >= 2) {
      score += 2;
      signals.push({
        code: 'PARTIAL_DOCUMENT_COVERAGE',
        positive: true,
        weight: 2,
        message: `${keyDocCount}/4 documentos clave analizados`,
      });
    }

    // Bound score to 0-MAX_BONUS
    const boundedScore = Math.max(0, Math.min(this.MAX_BONUS, score));

    return { score: boundedScore, maxScore: this.MAX_BONUS, signals };
  }
}
