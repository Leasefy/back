# Phase 22: ML Persistence - Research

**Researched:** 2026-02-15
**Domain:** ML Training Data Infrastructure & Feature Store Patterns
**Confidence:** HIGH

## Summary

Phase 22 establishes data persistence infrastructure to support future machine learning model development for the tenant scoring system. The goal is not to train ML models now, but to ensure all the data needed for supervised learning is captured, structured, and exportable.

The research focused on four core domains: (1) Feature snapshot persistence (capturing input data at prediction time), (2) Outcome tracking (recording what actually happened after predictions), (3) Prediction logging (storing predicted vs actual for model evaluation), and (4) Data export capabilities (making data accessible to ML training pipelines).

**Primary recommendation:** Use PostgreSQL native capabilities with JSON columns for feature storage, extend existing Application/Lease state machines to track outcomes, create a lightweight PredictionLog table for prediction-vs-actual tracking, and implement CSV/JSON export endpoints. Avoid premature investment in specialized feature store infrastructure (TimescaleDB, dedicated feature stores) until ML training actually begins.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ | Feature storage, time-series queries | Native JSON support, partitioning, proven scalability |
| Prisma | 5.x | Schema management, type-safe queries | Already used, supports JSON columns and indexes |
| BullMQ | 4.x | Async processing for aggregations | Already used for scoring jobs |

### Supporting (No New Dependencies Required)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Node.js fs/stream | CSV export | Batch data export for training |
| JSON.stringify | JSON export | Quick feature inspection, debugging |
| PostgreSQL COPY | Bulk export | Large-scale exports (10k+ rows) |

### Alternatives Considered (Not Recommended Now)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL native | TimescaleDB extension | Better time-series performance but adds complexity, overkill for current scale |
| JSON columns | Dedicated feature store (Feast, Tecton) | Unified online/offline store but requires infrastructure, premature for non-ML phase |
| Custom export | Parquet files | Better compression (3x smaller) but needs Apache Arrow libs, adds dependency |

**Installation:**
```bash
# No new dependencies required - use existing stack
```

## Architecture Patterns

### Recommended Data Model Extension

**Core principle:** Don't create parallel tracking systems. Extend existing models to capture ML-relevant data.

```prisma
// NEW: Feature snapshot table
model ApplicationFeatureSnapshot {
  id              String   @id @default(uuid())
  applicationId   String   @unique @map("application_id")

  // Snapshot of extracted features at scoring time
  features        Json     // ScoringFeatures interface serialized

  // Context
  propertyRent    Int      @map("property_rent")
  algorithmVersion String  @default("2.1") @map("algorithm_version")

  createdAt       DateTime @default(now())

  application     Application @relation(...)

  @@index([createdAt])
  @@map("application_feature_snapshots")
}

// NEW: Prediction vs actual tracking
model PredictionLog {
  id              String    @id @default(uuid())
  applicationId   String    @map("application_id")

  // Prediction (at scoring time)
  predictedScore  Int       @map("predicted_score")  // 0-100
  predictedLevel  RiskLevel @map("predicted_level")  // A/B/C/D

  // Actual outcome (populated later)
  actualOutcome   String?   @map("actual_outcome")   // APPROVED_PAID_ON_TIME | APPROVED_LATE_PAYMENTS | APPROVED_DEFAULTED | REJECTED | WITHDRAWN
  outcomeUpdatedAt DateTime? @map("outcome_updated_at")

  // Payment performance (if lease created)
  leaseId         String?   @map("lease_id")
  monthsTracked   Int?      @map("months_tracked")  // How many months we've observed
  latePaymentCount Int?     @map("late_payment_count")
  defaulted       Boolean   @default(false)

  // Metadata
  algorithmVersion String   @default("2.1") @map("algorithm_version")
  createdAt       DateTime @default(now())

  @@index([applicationId])
  @@index([actualOutcome])
  @@index([createdAt])
  @@map("prediction_logs")
}
```

### Pattern 1: Feature Snapshot on Scoring
**What:** When scoring runs, persist exact feature values used for prediction
**When to use:** Every time ScoringProcessor completes scoring
**Example:**
```typescript
// Source: Pattern derived from https://www.databricks.com/blog/what-feature-store-complete-guide-ml-feature-engineering
// In ScoringProcessor.process()

const features = this.featureBuilder.build(application, property);
const scoreResult = await this.scoreAggregator.aggregate(models);

// SNAPSHOT: Persist features AFTER scoring, BEFORE saving result
await this.prisma.applicationFeatureSnapshot.create({
  data: {
    applicationId: application.id,
    features: features as any, // JSON serialization
    propertyRent: property.monthlyRent,
    algorithmVersion: '2.1',
  },
});
```

**Why this matters:** Features must be captured at prediction time, not later. Application data may change (user edits), property may be deleted, so the feature snapshot is the **ground truth** for what inputs produced what prediction.

### Pattern 2: Outcome Tracking via State Machine Extension
**What:** Track lifecycle from APPROVED → lease created → payment performance
**When to use:** Application status transitions, payment records created
**Example:**
```typescript
// Source: Pattern inspired by https://neptune.ai/blog/building-ml-systems-with-feature-store
// In ApplicationsService when status changes to APPROVED

if (newStatus === ApplicationStatus.APPROVED) {
  await this.prisma.predictionLog.upsert({
    where: { applicationId: application.id },
    create: {
      applicationId: application.id,
      predictedScore: riskScore.totalScore,
      predictedLevel: riskScore.level,
      actualOutcome: 'APPROVED_PENDING', // Initial state
      algorithmVersion: '2.1',
    },
    update: {
      actualOutcome: 'APPROVED_PENDING',
    },
  });
}

// In LeasesService when payments recorded
if (latePaymentCount > 3) {
  await this.prisma.predictionLog.update({
    where: { applicationId: lease.contract.applicationId },
    data: {
      actualOutcome: 'APPROVED_LATE_PAYMENTS',
      latePaymentCount,
      monthsTracked: elapsedMonths,
      outcomeUpdatedAt: new Date(),
    },
  });
}
```

### Pattern 3: Point-in-Time Correctness
**What:** Never mix prediction-time data with current data in exports
**When to use:** Data export queries, training dataset generation
**Example:**
```typescript
// Source: Best practice from https://aws.amazon.com/sagemaker/ai/feature-store/
// WRONG: Joins current application data (may have changed)
SELECT a.*, rs.totalScore FROM applications a JOIN risk_score_results rs

// RIGHT: Uses snapshot captured at scoring time
SELECT
  afs.features,                    -- Input features (snapshot)
  rs.totalScore,                   -- Predicted score
  pl.actualOutcome,                -- Actual outcome
  pl.latePaymentCount              -- Performance metrics
FROM application_feature_snapshots afs
JOIN risk_score_results rs ON rs.applicationId = afs.applicationId
JOIN prediction_logs pl ON pl.applicationId = afs.applicationId
WHERE pl.actualOutcome IS NOT NULL  -- Only complete examples
```

**Why critical:** Using current data creates **label leakage** - the model would train on information that wasn't available at prediction time, leading to overfitting and poor production performance.

### Pattern 4: Incremental Outcome Updates
**What:** Outcomes aren't binary (approved/rejected) - they evolve over lease lifetime
**When to use:** Payment tracking, lease lifecycle events
**Example:**
```typescript
// Outcome states (evolving over time):
// - APPROVED_PENDING (0-3 months, not enough data)
// - APPROVED_PAID_ON_TIME (6+ months, 0 late payments)
// - APPROVED_LATE_PAYMENTS (6+ months, 1-3 late payments)
// - APPROVED_DEFAULTED (tenant defaulted/evicted)
// - REJECTED (landlord rejected)
// - WITHDRAWN (tenant withdrew)

// Scheduler job: Update outcomes monthly
async updateOutcomes() {
  const leases = await this.prisma.lease.findMany({
    where: { status: 'ACTIVE' },
    include: { payments: true, contract: { include: { application: true } } },
  });

  for (const lease of leases) {
    const monthsTracked = this.calculateMonths(lease.startDate);
    if (monthsTracked < 3) continue; // Not enough data

    const lateCount = lease.payments.filter(p => this.isLate(p)).length;
    const outcome = lateCount === 0 ? 'APPROVED_PAID_ON_TIME' :
                    lateCount <= 3 ? 'APPROVED_LATE_PAYMENTS' :
                    'APPROVED_DEFAULTED';

    await this.prisma.predictionLog.update({
      where: { applicationId: lease.contract.applicationId },
      data: { actualOutcome: outcome, monthsTracked, latePaymentCount: lateCount },
    });
  }
}
```

### Anti-Patterns to Avoid

**Anti-Pattern 1: Storing only current state**
- **Problem:** Application.employmentInfo may change if user reapplies; you lose what model actually saw
- **Solution:** ApplicationFeatureSnapshot freezes feature values at prediction time

**Anti-Pattern 2: Binary outcomes (approved/rejected only)**
- **Problem:** Real ML needs to predict payment behavior, not just approval
- **Solution:** Track granular outcomes: on-time, late, default, months observed

**Anti-Pattern 3: Exporting live database directly**
- **Problem:** Current data != historical data, creates train/test leakage
- **Solution:** Export from snapshot + outcome tables only, never from mutable application data

**Anti-Pattern 4: Premature optimization (Parquet, feature stores)**
- **Problem:** Adds complexity before ML training actually begins
- **Solution:** Start with PostgreSQL JSON + CSV export, upgrade when data volume demands it

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-series partitioning | Custom table rotation | PostgreSQL native partitioning | Built-in, declarative, automatic pruning |
| CSV export | Manual string concatenation | PostgreSQL COPY or Node streams | Handles escaping, large files, memory efficiency |
| Feature versioning | Custom version tracking | Algorithm version field + created_at | Simple, queryable, sufficient for early stage |
| Data validation | Custom feature validators | Prisma schema + TypeScript types | Type safety at build + runtime |

**Key insight:** PostgreSQL is underrated for ML data storage. It handles JSON, time-series, bulk exports, and scales to millions of rows before needing specialized tools. Don't add TimescaleDB, Feast, or Parquet until data volume or query latency demands it.

## Common Pitfalls

### Pitfall 1: Not Capturing Features at Prediction Time
**What goes wrong:** Six months later, you want to retrain the model. You query Applications table for training data, but users have edited their applications. Your training data doesn't match what the model actually saw when it made predictions.

**Why it happens:** Assuming immutability - "applications are submitted once and never change." Reality: users update profiles, reapply, admins correct errors.

**How to avoid:** Create ApplicationFeatureSnapshot on every scoring run. Never use Application.employmentInfo for ML training - always use the snapshot.

**Warning signs:** Export queries that JOIN applications table directly, not through snapshot table.

### Pitfall 2: Outcome Definition Mismatch
**What goes wrong:** You define "good tenant" as "APPROVED status" but later realize what you actually care about is "paid on time for 12 months." Your training labels don't match business goals.

**Why it happens:** Conflating application approval (landlord's decision) with tenant performance (actual outcome). Research shows landlords often conflate these ([Full article: Which Information Matters?](https://www.tandfonline.com/doi/full/10.1080/10511482.2022.2113815)).

**How to avoid:** Define outcomes based on payment behavior, not approval status. Track multiple outcome categories (on-time, late, default) and let ML training decide thresholds.

**Warning signs:** PredictionLog only has "approved/rejected," no payment performance metrics.

### Pitfall 3: Selective Label Problem
**What goes wrong:** You only have payment history for approved tenants (rejected tenants never got leases). Your model learns "high scores = good outcomes" but doesn't know what would have happened if you approved low-scoring applicants. Model becomes overconfident ([Feedback Loop in ML](https://www.lakera.ai/ml-glossary/feedback-loop-in-ml), [The Selective Labels Problem](https://pmc.ncbi.nlm.nih.gov/pmc/articles/PMC5958915/)).

**Why it happens:** Observational data bias - you only observe outcomes for decisions that were made. Rejected applicants are missing outcomes.

**How to avoid:**
1. Track rejection reasons in PredictionLog (actualOutcome: 'REJECTED_LOW_SCORE' vs 'REJECTED_LANDLORD_PREFERENCE')
2. For future A/B testing: randomly approve 5% of D-level applicants to observe counterfactual outcomes
3. Document this limitation in export metadata: "Training data is selectively labeled - only approved applicants have outcomes"

**Warning signs:** All training examples are APPROVED with outcomes, zero examples of what happens when you approve risky tenants.

### Pitfall 4: Algorithm Version Mismatch
**What goes wrong:** You export 50k training examples spanning 2 years. Some scored with algorithm 1.0 (no payment history bonus), others with 2.1 (has bonus). Features aren't comparable across versions.

**Why it happens:** Algorithm evolves over time, but old predictions remain in database.

**How to avoid:**
1. Always store `algorithmVersion` with features and predictions
2. Filter exports: `WHERE algorithmVersion = '2.1'` for training
3. Keep old data for evaluation: "How much did 2.1 improve over 1.0?"

**Warning signs:** Export includes mixed algorithm versions without filtering.

### Pitfall 5: Data Leakage from Future Information
**What goes wrong:** Export query joins Payment table to get "total rent paid" as a feature. But payments happen AFTER scoring - you've leaked future info into training data. Model performs great in training, terrible in production ([Methods for correcting inference based on outcomes predicted by machine learning](https://www.pnas.org/doi/10.1073/pnas.2001238117)).

**Why it happens:** Convenient to JOIN everything in one query, forgetting temporal ordering.

**How to avoid:**
1. Only use ApplicationFeatureSnapshot (captured at prediction time)
2. Never JOIN tables that populate after scoring (Payments, Leases)
3. Use Payments only for labels (actualOutcome), never for features

**Warning signs:** Feature set includes fields like "totalRentPaid," "leaseCompletionRate" - these don't exist at application time.

## Code Examples

Verified patterns for implementation:

### Export Training Dataset (CSV)
```typescript
// Source: Adapted from https://deephaven.io/blog/2022/04/27/batch-process-data/
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function exportTrainingData(filePath: string, algorithmVersion = '2.1') {
  // Point-in-time correct query: only snapshot data
  const data = await this.prisma.$queryRaw`
    SELECT
      afs.features,                         -- Input features (JSON)
      rs.totalScore as predicted_score,     -- What we predicted
      rs.level as predicted_level,          -- Risk level
      pl.actualOutcome as actual_outcome,   -- What actually happened
      pl.latePaymentCount as late_payments, -- Performance metric
      pl.monthsTracked,                     -- How long we've observed
      afs.algorithmVersion,
      afs.createdAt as scored_at
    FROM application_feature_snapshots afs
    JOIN risk_score_results rs ON rs.applicationId = afs.applicationId
    JOIN prediction_logs pl ON pl.applicationId = afs.applicationId
    WHERE afs.algorithmVersion = ${algorithmVersion}
      AND pl.actualOutcome IS NOT NULL      -- Only completed outcomes
      AND pl.monthsTracked >= 6             -- Minimum observation period
    ORDER BY afs.createdAt DESC
  `;

  const writeStream = createWriteStream(filePath);

  // Header
  const headers = [
    'age', 'employmentType', 'employmentTenureMonths', 'monthlyIncome',
    'rentToIncomeRatio', 'debtToIncomeRatio', 'disposableIncome',
    'hasLandlordReference', 'personalReferenceCount',
    'predicted_score', 'predicted_level', 'actual_outcome',
    'late_payments', 'months_tracked', 'algorithm_version', 'scored_at'
  ];
  writeStream.write(headers.join(',') + '\n');

  // Rows
  for (const row of data) {
    const features = row.features as ScoringFeatures;
    const csvRow = [
      features.age,
      features.employmentType,
      features.employmentTenureMonths,
      features.monthlyIncome,
      features.rentToIncomeRatio,
      features.debtToIncomeRatio,
      features.disposableIncome,
      features.hasLandlordReference ? 1 : 0,
      features.personalReferenceCount,
      row.predicted_score,
      row.predicted_level,
      row.actual_outcome,
      row.late_payments || 0,
      row.months_tracked,
      row.algorithm_version,
      row.scored_at.toISOString(),
    ];
    writeStream.write(csvRow.join(',') + '\n');
  }

  writeStream.end();
}
```

### Scheduled Outcome Update Job
```typescript
// Source: Pattern from https://dagster.io/learn/ml (ML pipeline monitoring)
@Cron('0 3 * * *') // Daily at 3am
async updatePredictionOutcomes() {
  // Find leases with enough data (3+ months) but outcome not finalized
  const leases = await this.prisma.lease.findMany({
    where: {
      status: { in: ['ACTIVE', 'ENDED'] },
      createdAt: { lte: subMonths(new Date(), 3) }, // At least 3 months old
    },
    include: {
      payments: true,
      contract: { include: { application: true } },
    },
  });

  for (const lease of leases) {
    const monthsTracked = differenceInMonths(new Date(), lease.startDate);
    const totalPayments = lease.payments.length;
    const latePayments = lease.payments.filter(p =>
      p.paymentDate > addDays(new Date(p.periodYear, p.periodMonth - 1, lease.paymentDay), 5)
    );

    // Determine outcome
    let outcome: string;
    if (lease.status === 'TERMINATED' && latePayments.length > 5) {
      outcome = 'APPROVED_DEFAULTED';
    } else if (latePayments.length === 0 && monthsTracked >= 6) {
      outcome = 'APPROVED_PAID_ON_TIME';
    } else if (latePayments.length <= 3 && monthsTracked >= 6) {
      outcome = 'APPROVED_LATE_PAYMENTS';
    } else if (monthsTracked < 3) {
      outcome = 'APPROVED_PENDING'; // Not enough data
    } else {
      outcome = 'APPROVED_MIXED'; // Complex case
    }

    // Update or create prediction log
    await this.prisma.predictionLog.upsert({
      where: { applicationId: lease.contract.applicationId },
      create: {
        applicationId: lease.contract.applicationId,
        leaseId: lease.id,
        predictedScore: 0, // Will be filled from RiskScoreResult if exists
        predictedLevel: 'D',
        actualOutcome: outcome,
        monthsTracked,
        latePaymentCount: latePayments.length,
        outcomeUpdatedAt: new Date(),
      },
      update: {
        actualOutcome: outcome,
        monthsTracked,
        latePaymentCount: latePayments.length,
        outcomeUpdatedAt: new Date(),
      },
    });
  }

  this.logger.log(`Updated outcomes for ${leases.length} leases`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Application data as training source | Feature snapshots at prediction time | 2020+ (feature stores) | Prevents label leakage, ensures reproducibility |
| Binary outcomes (approve/reject) | Multi-class outcomes (on-time/late/default) | 2018+ (real-world ML) | Better aligns with business goals, more nuanced models |
| Custom CSV exports | Columnar formats (Parquet) | 2019+ (big data) | 3x compression, faster reads, but not needed yet for this scale |
| Manual feature tracking | Algorithm version tagging | 2017+ (MLOps) | Enables A/B testing, prevents version mismatch |

**Deprecated/outdated:**
- **Storing only final outcomes:** Modern approach tracks outcome evolution over time (3mo, 6mo, 12mo checkpoints)
- **Using current state for training:** Point-in-time correctness is now standard in feature stores
- **Hand-rolling time-series storage:** PostgreSQL native partitioning is mature (v10+), no need for custom rotation

## Open Questions

1. **What constitutes a "successful" tenant outcome?**
   - What we know: Research shows landlords value on-time payments most ([ResidentScore® vs Traditional Credit Score](https://www.mysmartmove.com/blog/residentscore-tailored-tenant-screening))
   - What's unclear: Exact threshold - is 1 late payment in 12 months "good" or "bad"?
   - Recommendation: Start with 3 categories (excellent: 0 late, good: 1-3 late, poor: 4+ late or default), refine based on landlord feedback

2. **How long to observe before finalizing outcome?**
   - What we know: TransUnion analyzes outcomes across "millions of lease terms" ([ResidentScore®](https://www.mysmartmove.com/blog/residentscore-tailored-tenant-screening))
   - What's unclear: Colombian lease terms average 12 months - is 6 months enough to predict full-term behavior?
   - Recommendation: Track outcomes at 3mo, 6mo, 12mo milestones. Start training after 6mo minimum observation period.

3. **Should we track near-misses (rejected but might have been good)?**
   - What we know: Selective labels problem is well-documented ([The Selective Labels Problem](https://pmc.ncbi.nlm.nih.gov/pmc/articles/PMC5958915/))
   - What's unclear: Feasibility of A/B testing (randomly approving low-score applicants) in production
   - Recommendation: Phase 22 just logs rejection reasons. Consider A/B testing in future phase after model validation.

4. **Data retention policy?**
   - What we know: GDPR/privacy laws may require data deletion after tenant moves out
   - What's unclear: Colombian data protection laws for tenant screening data
   - Recommendation: Legal review before Phase 22 implementation. May need to anonymize exported training data.

## Sources

### Primary (HIGH confidence)
- [Databricks: What is a Feature Store?](https://www.databricks.com/blog/what-feature-store-complete-guide-ml-feature-engineering) - Feature store architecture, point-in-time correctness
- [AWS SageMaker Feature Store](https://aws.amazon.com/sagemaker/ai/feature-store/) - Offline storage patterns, point-in-time queries
- [Neptune.ai: Building ML Systems with Feature Store](https://neptune.ai/blog/building-ml-systems-with-feature-store) - Feature management best practices
- [Timescale TimescaleDB](https://www.timescale.com/) - PostgreSQL time-series extension capabilities
- [Supabase: TimescaleDB Extension](https://supabase.com/docs/guides/database/extensions/timescaledb) - Supabase-specific TimescaleDB integration

### Secondary (MEDIUM confidence)
- [Lakera: Feedback Loop in ML](https://www.lakera.ai/ml-glossary/feedback-loop-in-ml) - Prediction-outcome feedback patterns
- [PNAS: Methods for correcting inference based on outcomes predicted by ML](https://www.pnas.org/doi/10.1073/pnas.2001238117) - Avoiding data leakage
- [PMC: The Selective Labels Problem](https://pmc.ncbi.nlm.nih.gov/pmc/articles/PMC5958915/) - Selective labeling in predictions
- [ResidentScore® vs Traditional Credit Score](https://www.mysmartmove.com/blog/residentscore-tailored-tenant-screening) - Tenant screening prediction performance
- [Tandfonline: Which Information Matters?](https://www.tandfonline.com/doi/full/10.1080/10511482.2022.2113815) - Landlord assessment of tenant screening

### Tertiary (LOW confidence - context only)
- [DataCamp: Apache Parquet Explained](https://www.datacamp.com/tutorial/apache-parquet) - Parquet format benefits (future consideration)
- [Dagster: ML Pipelines Best Practices](https://dagster.io/learn/ml) - ML pipeline monitoring patterns
- [Deephaven: Batch process with Parquet](https://deephaven.io/blog/2022/04/27/batch-process-data/) - CSV vs Parquet performance comparison

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PostgreSQL JSON + Prisma already proven in Phases 1-21
- Architecture patterns: HIGH - Feature snapshot + outcome tracking are well-documented ML patterns
- Pitfalls: HIGH - Selective labels, data leakage, version mismatch are known issues in scoring systems
- Open questions: MEDIUM - Outcome definitions need business validation, data retention needs legal review

**Research date:** 2026-02-15
**Valid until:** 90 days (stable domain, unlikely to change rapidly)
