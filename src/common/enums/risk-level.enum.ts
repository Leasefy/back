/**
 * Risk level classification based on total score.
 * Used to categorize tenants for landlord decision-making.
 *
 * A (80-100): Excellent - approve immediately
 * B (65-79): Good - approve with standard terms
 * C (50-64): Fair - approve with conditions
 * D (0-49): Poor - decline or require cosigner
 */
export enum RiskLevel {
  /** Score 80-100: Excellent - approve immediately */
  A = 'A',

  /** Score 65-79: Good - approve with standard terms */
  B = 'B',

  /** Score 50-64: Fair - approve with conditions */
  C = 'C',

  /** Score 0-49: Poor - decline or require cosigner */
  D = 'D',
}

/**
 * Score ranges for each risk level.
 * Used by the scoring engine to determine level from total score.
 */
export const RISK_LEVEL_RANGES = {
  A: { min: 80, max: 100 },
  B: { min: 65, max: 79 },
  C: { min: 50, max: 64 },
  D: { min: 0, max: 49 },
} as const;

/**
 * Get the risk level based on a total score.
 * @param score - Total score between 0-100
 * @returns The corresponding risk level
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return RiskLevel.A;
  if (score >= 65) return RiskLevel.B;
  if (score >= 50) return RiskLevel.C;
  return RiskLevel.D;
}
