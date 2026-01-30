/**
 * Signal
 *
 * Represents a single factor that contributed to a scoring model's result.
 * Used for explainability - tells the user why they got the score they did.
 */
export interface Signal {
  /** Unique code identifying the signal (e.g., 'LOW_RTI', 'HIGH_DTI') */
  code: string;
  /** Whether this signal is positive (true = good) or negative (false = concern) */
  positive: boolean;
  /** Points contributed by this signal (can be negative for deductions) */
  weight: number;
  /** Human-readable explanation of the signal */
  message: string;
}

/**
 * ModelResult
 *
 * Standard return type for all scoring models.
 * Each model returns a score within its allocated range plus signals explaining the factors.
 */
export interface ModelResult {
  /** Score achieved (within 0 to maxScore) */
  score: number;
  /** Maximum possible score for this model */
  maxScore: number;
  /** Signals explaining the factors that contributed to the score */
  signals: Signal[];
}
