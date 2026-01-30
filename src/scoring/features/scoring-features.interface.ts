import { EmploymentType } from '../../applications/dto/employment-info.dto.js';

/**
 * ScoringFeatures
 *
 * Extracted and calculated features from Application and Property data
 * used by scoring models to evaluate tenant risk.
 *
 * All monetary values are in COP (Colombian Pesos).
 */
export interface ScoringFeatures {
  // Personal
  /** Applicant age calculated from dateOfBirth */
  age: number;
  /** Whether current address was provided */
  hasCurrentAddress: boolean;

  // Employment
  /** Type of employment (EMPLOYED, SELF_EMPLOYED, etc.) */
  employmentType: EmploymentType;
  /** Months at current employment, calculated from startDate */
  employmentTenureMonths: number;
  /** Whether HR contact info was provided */
  hasEmployerContact: boolean;

  // Financial
  /** Total monthly income (salary + additional) in COP */
  monthlyIncome: number;
  /** Monthly debt payments in COP */
  monthlyDebtPayments: number;
  /** Total rent amount (monthlyRent + adminFee) in COP */
  rentAmount: number;
  /** Rent-to-income ratio (rent / income) */
  rentToIncomeRatio: number;
  /** Debt-to-income ratio (debt / income) */
  debtToIncomeRatio: number;
  /** Disposable income after debt and rent in COP */
  disposableIncome: number;

  // References
  /** Whether landlord reference was provided */
  hasLandlordReference: boolean;
  /** Whether employment reference was provided */
  hasEmploymentReference: boolean;
  /** Number of personal references provided */
  personalReferenceCount: number;

  // Additional context (for integrity checks)
  /** Whether additional income source was explained */
  hasAdditionalIncomeSource: boolean;
  /** Monthly salary only (excluding additional income) */
  monthlySalary: number;
}
