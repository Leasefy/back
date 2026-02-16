import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { ExportQueryDto } from '../dto/export-query.dto.js';

/**
 * Shape of a row returned by the training data export query.
 * Combines immutable feature snapshots with prediction logs and risk score results.
 */
interface TrainingDataRow {
  // Features (flattened from JSON)
  age: number | null;
  employmentType: string | null;
  employmentTenureMonths: number | null;
  monthlyIncome: number | null;
  rentToIncomeRatio: number | null;
  debtToIncomeRatio: number | null;
  disposableIncome: number | null;
  hasLandlordReference: boolean | null;
  personalReferenceCount: number | null;
  hasCurrentAddress: boolean | null;
  hasEmployerContact: boolean | null;
  hasAdditionalIncomeSource: boolean | null;
  monthlySalary: number | null;
  monthlyDebtPayments: number | null;
  rentAmount: number | null;
  hasEmploymentReference: boolean | null;

  // Property context
  propertyRent: number | null;

  // Prediction
  predictedScore: number;
  predictedLevel: string;
  financialScore: number;
  stabilityScore: number;
  historyScore: number;
  integrityScore: number;
  paymentHistoryScore: number;

  // Outcome
  actualOutcome: string | null;
  monthsTracked: number | null;
  latePaymentCount: number | null;
  defaulted: boolean;

  // Metadata
  algorithmVersion: string;
  scoredAt: Date;
}

/**
 * Shape of raw SQL query result before feature flattening.
 */
interface RawExportRow {
  features: Record<string, unknown>;
  property_rent: number | null;
  algorithm_version: string;
  scored_at: Date;
  predicted_score: number;
  predicted_level: string;
  financial_score: number;
  stability_score: number;
  history_score: number;
  integrity_score: number;
  payment_history_score: number;
  actual_outcome: string | null;
  months_tracked: number | null;
  late_payment_count: number | null;
  defaulted: boolean;
}

/**
 * Export statistics breakdown.
 */
export interface ExportStats {
  totalSnapshots: number;
  totalPredictionLogs: number;
  completedOutcomes: number;
  outcomeBreakdown: Record<string, number>;
  algorithmVersionBreakdown: Record<string, number>;
}

/**
 * MlExportService
 *
 * Provides training data export logic with point-in-time correct queries.
 * Joins immutable ApplicationFeatureSnapshots with PredictionLogs and
 * RiskScoreResults -- never queries mutable Application data.
 *
 * This ensures the exported training data reflects the exact features
 * and predictions at scoring time, not current application state.
 */
@Injectable()
export class MlExportService {
  private readonly logger = new Logger(MlExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Query training data with point-in-time correct joins.
   * Returns flattened rows suitable for ML consumption.
   */
  async getTrainingData(query: ExportQueryDto): Promise<TrainingDataRow[]> {
    const algorithmVersion = query.algorithmVersion ?? '2.1';
    const completedOnly = query.completedOnly ?? true;
    const minMonthsTracked = query.minMonthsTracked ?? 6;

    const rawRows = await this.prisma.$queryRawUnsafe<RawExportRow[]>(
      `
      SELECT
        afs.features,
        afs.property_rent,
        afs.algorithm_version,
        afs.created_at as scored_at,
        rsr.total_score as predicted_score,
        rsr.level::text as predicted_level,
        rsr.financial_score,
        rsr.stability_score,
        rsr.history_score,
        rsr.integrity_score,
        rsr.payment_history_score,
        pl.actual_outcome,
        pl.months_tracked,
        pl.late_payment_count,
        pl.defaulted
      FROM application_feature_snapshots afs
      JOIN risk_score_results rsr ON rsr.application_id = afs.application_id
      JOIN prediction_logs pl ON pl.application_id = afs.application_id
      WHERE afs.algorithm_version = $1
        AND (pl.actual_outcome IS NOT NULL OR $2 = false)
        AND (pl.months_tracked >= $3 OR pl.months_tracked IS NULL)
      ORDER BY afs.created_at DESC
      `,
      algorithmVersion,
      completedOnly,
      minMonthsTracked,
    );

    return rawRows.map((row) => this.flattenRow(row));
  }

  /**
   * Format training data rows as CSV string.
   * Flattens JSON features into individual columns.
   */
  formatAsCsv(rows: TrainingDataRow[]): string {
    const headers = [
      'age',
      'employmentType',
      'employmentTenureMonths',
      'monthlyIncome',
      'rentToIncomeRatio',
      'debtToIncomeRatio',
      'disposableIncome',
      'hasLandlordReference',
      'personalReferenceCount',
      'hasCurrentAddress',
      'hasEmployerContact',
      'hasAdditionalIncomeSource',
      'monthlySalary',
      'monthlyDebtPayments',
      'rentAmount',
      'hasEmploymentReference',
      'propertyRent',
      'predictedScore',
      'predictedLevel',
      'financialScore',
      'stabilityScore',
      'historyScore',
      'integrityScore',
      'paymentHistoryScore',
      'actualOutcome',
      'monthsTracked',
      'latePaymentCount',
      'defaulted',
      'algorithmVersion',
      'scoredAt',
    ];

    const csvRows = rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h as keyof TrainingDataRow];
          if (value === null || value === undefined) return '';
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'boolean') return value ? '1' : '0';
          if (typeof value === 'string' && value.includes(','))
            return `"${value}"`;
          return String(value);
        })
        .join(','),
    );

    return [headers.join(','), ...csvRows].join('\n');
  }

  /**
   * Get aggregate statistics about the ML data.
   */
  async getStats(): Promise<ExportStats> {
    const [totalSnapshots, totalPredictionLogs, completedOutcomes] =
      await Promise.all([
        this.prisma.applicationFeatureSnapshot.count(),
        this.prisma.predictionLog.count(),
        this.prisma.predictionLog.count({
          where: {
            actualOutcome: { not: null },
            NOT: { actualOutcome: 'PENDING' },
          },
        }),
      ]);

    // Outcome breakdown
    const outcomeGroups = await this.prisma.predictionLog.groupBy({
      by: ['actualOutcome'],
      _count: { id: true },
    });
    const outcomeBreakdown: Record<string, number> = {};
    for (const group of outcomeGroups) {
      outcomeBreakdown[group.actualOutcome ?? 'NULL'] = group._count.id;
    }

    // Algorithm version breakdown
    const versionGroups = await this.prisma.applicationFeatureSnapshot.groupBy({
      by: ['algorithmVersion'],
      _count: { id: true },
    });
    const algorithmVersionBreakdown: Record<string, number> = {};
    for (const group of versionGroups) {
      algorithmVersionBreakdown[group.algorithmVersion] = group._count.id;
    }

    return {
      totalSnapshots,
      totalPredictionLogs,
      completedOutcomes,
      outcomeBreakdown,
      algorithmVersionBreakdown,
    };
  }

  /**
   * Flatten a raw SQL row into the TrainingDataRow shape.
   * Extracts individual feature fields from the JSON features column.
   */
  private flattenRow(raw: RawExportRow): TrainingDataRow {
    const f = raw.features ?? {};

    return {
      // Features from JSON
      age: this.num(f['age']),
      employmentType: this.str(f['employmentType']),
      employmentTenureMonths: this.num(f['employmentTenureMonths']),
      monthlyIncome: this.num(f['monthlyIncome']),
      rentToIncomeRatio: this.num(f['rentToIncomeRatio']),
      debtToIncomeRatio: this.num(f['debtToIncomeRatio']),
      disposableIncome: this.num(f['disposableIncome']),
      hasLandlordReference: this.bool(f['hasLandlordReference']),
      personalReferenceCount: this.num(f['personalReferenceCount']),
      hasCurrentAddress: this.bool(f['hasCurrentAddress']),
      hasEmployerContact: this.bool(f['hasEmployerContact']),
      hasAdditionalIncomeSource: this.bool(f['hasAdditionalIncomeSource']),
      monthlySalary: this.num(f['monthlySalary']),
      monthlyDebtPayments: this.num(f['monthlyDebtPayments']),
      rentAmount: this.num(f['rentAmount']),
      hasEmploymentReference: this.bool(f['hasEmploymentReference']),

      // Property context
      propertyRent: raw.property_rent,

      // Prediction
      predictedScore: raw.predicted_score,
      predictedLevel: raw.predicted_level,
      financialScore: raw.financial_score,
      stabilityScore: raw.stability_score,
      historyScore: raw.history_score,
      integrityScore: raw.integrity_score,
      paymentHistoryScore: raw.payment_history_score,

      // Outcome
      actualOutcome: raw.actual_outcome,
      monthsTracked: raw.months_tracked,
      latePaymentCount: raw.late_payment_count,
      defaulted: raw.defaulted,

      // Metadata
      algorithmVersion: raw.algorithm_version,
      scoredAt: raw.scored_at,
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private str(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    return String(v);
  }

  private bool(v: unknown): boolean | null {
    if (v === null || v === undefined) return null;
    return Boolean(v);
  }
}
