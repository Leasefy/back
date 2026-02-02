/**
 * PaymentHistoryMetrics
 *
 * Aggregated payment metrics for a tenant across all platform leases.
 * Used by PaymentHistoryModel to calculate bonus scoring points.
 */
export interface PaymentHistoryMetrics {
  /** Total number of recorded payments across all leases */
  totalPayments: number;

  /** Percentage of payments made on time (0.0 to 1.0) */
  onTimePercentage: number;

  /** Number of late payments (> 5 day grace period after due date) */
  latePaymentCount: number;

  /** Total months as tenant on platform across all leases */
  totalMonthsOnPlatform: number;

  /** Total COP paid across all leases */
  totalAmountPaid: number;

  /** Whether tenant has completed at least one full lease */
  isReturningTenant: boolean;

  /** Number of leases (current and historical) */
  leaseCount: number;
}
