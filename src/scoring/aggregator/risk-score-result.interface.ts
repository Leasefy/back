import { RiskLevel } from '../../common/enums/index.js';

/**
 * Driver
 *
 * Represents a key factor that contributed to the risk score.
 * Used for explainability - shows user why they got their score.
 */
export interface Driver {
  /** Human-readable explanation of the factor */
  text: string;
  /** Whether this factor is positive (true = good) or negative (false = concern) */
  positive: boolean;
}

/**
 * Flag
 *
 * Represents a warning or concern identified during scoring.
 * Used to highlight specific risks to the landlord.
 */
export interface Flag {
  /** Unique code identifying the flag (e.g., 'HIGH_RTI', 'MISSING_REFERENCE') */
  code: string;
  /** Severity level of the flag */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Human-readable explanation of the concern */
  message: string;
}

/**
 * Condition
 *
 * Represents a suggested condition or requirement for approval.
 * Helps landlords mitigate identified risks.
 */
export interface Condition {
  /** Type of condition being suggested */
  type: 'DEPOSIT' | 'COSIGNER' | 'INCOME_VERIFICATION' | 'INSURANCE';
  /** Human-readable explanation of the condition */
  message: string;
  /** Whether this condition is required vs recommended */
  required: boolean;
}

/**
 * RiskScoreResultData
 *
 * Complete risk score result with all explainability data.
 * This interface matches the frontend RiskScore contract.
 */
export interface RiskScoreResultData {
  /** Total score (0-100) */
  total: number;
  /** Risk level classification (A, B, C, D) */
  level: RiskLevel;
  /** Category subscores */
  categories: {
    /** Integrity score (0-25): Data consistency and verification */
    integrity: number;
    /** Financial score (0-35): RTI, DTI, disposable income */
    financial: number;
    /** Stability score (0-25): Employment type, tenure, employer contact */
    stability: number;
    /** History score (0-15): References and rental history */
    history: number;
    /** Payment history bonus (0-15): Platform payment track record */
    paymentHistory?: number;
    /** Document verification bonus (0-15): AI document analysis */
    documentVerification?: number;
  };
  /** Key factors that drove the score (3-6 explanations) */
  drivers: Driver[];
  /** Warning flags identified during scoring */
  flags: Flag[];
  /** Suggested conditions for approval */
  conditions: Condition[];
}
