import { Injectable } from '@nestjs/common';
import { ModelResult, Signal } from './model-result.interface.js';
import { PaymentHistoryMetrics } from '../features/payment-history-metrics.interface.js';

/**
 * PaymentHistoryModel
 *
 * Calculates bonus scoring points (0-15) based on tenant payment history.
 * This is an ENHANCEMENT model - adds bonus points on top of base 100 score.
 * Tenants without history get 0 bonus (not penalized).
 *
 * Score breakdown:
 * - On-time payment percentage: max 8 pts
 * - Late payment penalty: up to -10 pts (can offset bonuses)
 * - Platform tenure bonus: max 5 pts
 * - Returning tenant bonus: 2 pts
 *
 * Max total: 15 pts (capped)
 */
@Injectable()
export class PaymentHistoryModel {
  private readonly MAX_BONUS = 15;

  /**
   * Calculate bonus score from payment history metrics.
   *
   * @param metrics - Aggregated payment metrics for tenant
   * @returns ModelResult with score (0-15) and signals
   */
  calculate(metrics: PaymentHistoryMetrics): ModelResult {
    const signals: Signal[] = [];

    // No history = no bonus (not a penalty)
    if (metrics.leaseCount === 0 || metrics.totalPayments === 0) {
      signals.push({
        code: 'NO_PLATFORM_HISTORY',
        positive: true, // Neutral, not negative
        weight: 0,
        message: 'Sin historial de pagos en la plataforma (inquilino nuevo)',
      });
      return {
        score: 0,
        maxScore: this.MAX_BONUS,
        signals,
      };
    }

    let score = 0;

    // 1. On-time payment percentage (max 8 bonus pts)
    score += this.scoreOnTimePayments(metrics.onTimePercentage, signals);

    // 2. Late payment penalty (up to -10 pts, can offset bonuses)
    score += this.scoreLatePayments(metrics.latePaymentCount, signals);

    // 3. Tenure bonus (max 5 pts)
    score += this.scoreTenure(metrics.totalMonthsOnPlatform, signals);

    // 4. Returning tenant bonus (2 pts)
    if (metrics.isReturningTenant) {
      score += 2;
      signals.push({
        code: 'RETURNING_TENANT',
        positive: true,
        weight: 2,
        message: 'Inquilino recurrente en la plataforma (2+ contratos)',
      });
    }

    // Bound score to 0-MAX_BONUS
    const boundedScore = Math.max(0, Math.min(this.MAX_BONUS, score));

    return {
      score: boundedScore,
      maxScore: this.MAX_BONUS,
      signals,
    };
  }

  /**
   * Score based on on-time payment percentage.
   * 100% = 8 pts, 95%+ = 6 pts, 85%+ = 4 pts, 70%+ = 2 pts, <70% = 0 pts
   */
  private scoreOnTimePayments(percentage: number, signals: Signal[]): number {
    if (percentage >= 1.0) {
      signals.push({
        code: 'PERFECT_PAYMENT_HISTORY',
        positive: true,
        weight: 8,
        message: '100% de pagos a tiempo en la plataforma',
      });
      return 8;
    }
    if (percentage >= 0.95) {
      signals.push({
        code: 'EXCELLENT_PAYMENT_HISTORY',
        positive: true,
        weight: 6,
        message: '95%+ de pagos a tiempo en la plataforma',
      });
      return 6;
    }
    if (percentage >= 0.85) {
      signals.push({
        code: 'GOOD_PAYMENT_HISTORY',
        positive: true,
        weight: 4,
        message: '85%+ de pagos a tiempo en la plataforma',
      });
      return 4;
    }
    if (percentage >= 0.7) {
      signals.push({
        code: 'FAIR_PAYMENT_HISTORY',
        positive: false,
        weight: 2,
        message: '70%+ de pagos a tiempo en la plataforma',
      });
      return 2;
    }
    // < 70% on-time = no bonus (but no additional penalty beyond late count)
    signals.push({
      code: 'POOR_PAYMENT_HISTORY',
      positive: false,
      weight: 0,
      message: 'Menos del 70% de pagos a tiempo en la plataforma',
    });
    return 0;
  }

  /**
   * Penalty for late payments.
   * 0 late = 0 penalty, 1 late = -2, 2 late = -5, 3+ late = -10
   */
  private scoreLatePayments(lateCount: number, signals: Signal[]): number {
    if (lateCount === 0) return 0; // No penalty

    if (lateCount >= 3) {
      signals.push({
        code: 'FREQUENT_LATE_PAYMENTS',
        positive: false,
        weight: -10,
        message: '3+ pagos atrasados en historial de plataforma',
      });
      return -10;
    }
    if (lateCount === 2) {
      signals.push({
        code: 'MULTIPLE_LATE_PAYMENTS',
        positive: false,
        weight: -5,
        message: '2 pagos atrasados en historial de plataforma',
      });
      return -5;
    }
    // 1 late payment
    signals.push({
      code: 'SINGLE_LATE_PAYMENT',
      positive: false,
      weight: -2,
      message: '1 pago atrasado en historial de plataforma',
    });
    return -2;
  }

  /**
   * Bonus for platform tenure.
   * 24+ months = 5 pts, 12+ months = 3 pts, 6+ months = 1 pt
   */
  private scoreTenure(months: number, signals: Signal[]): number {
    if (months >= 24) {
      signals.push({
        code: 'LONG_PLATFORM_TENURE',
        positive: true,
        weight: 5,
        message: '2+ anos como inquilino en la plataforma',
      });
      return 5;
    }
    if (months >= 12) {
      signals.push({
        code: 'MODERATE_PLATFORM_TENURE',
        positive: true,
        weight: 3,
        message: '1+ ano como inquilino en la plataforma',
      });
      return 3;
    }
    if (months >= 6) {
      signals.push({
        code: 'SHORT_PLATFORM_TENURE',
        positive: true,
        weight: 1,
        message: '6+ meses como inquilino en la plataforma',
      });
      return 1;
    }
    return 0;
  }
}
