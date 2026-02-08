# Phase 18: Dashboard & Activity Log - Research

**Researched:** 2026-02-08
**Domain:** Dashboard aggregation, KPI metrics, activity feed persistence
**Confidence:** HIGH

## Summary

Phase 18 implements two core features: (1) aggregated dashboard endpoints that compute real-time KPIs for landlords and tenants, and (2) a persistent activity log system that tracks significant events across applications, payments, visits, and contracts. Unlike traditional dashboard systems that pre-compute and cache metrics, this implementation computes statistics on-demand from existing database models, ensuring data freshness while leveraging Prisma's efficient aggregation capabilities and PostgreSQL indexes.

The implementation builds upon existing infrastructure established in Phases 6-11:
- **ApplicationEvent** already persists application-level events (submitted, approved, rejected, info requested)
- **NotificationLog** tracks notification delivery but is separate from user activity
- **LandlordService.getCandidates()** demonstrates score-based aggregation patterns
- **LeasesService** shows payment count aggregation with `_count`
- **VisitStateMachine** and **ApplicationStateMachine** emit events that should be captured

Key insight: The dashboard aggregates data from existing models without duplicating state. The activity log creates a unified, chronological feed of events across multiple domains, enabling the "Recent Activity" widget and future audit capabilities.

**Primary recommendation:** Create a `DashboardModule` with separate services for landlord and tenant dashboards. Add a new `ActivityLog` model with polymorphic references (application/payment/visit/contract events). Use Prisma aggregations with proper indexes for dashboard queries. Implement activity logging via event listeners that capture domain events into the unified log.

## Standard Stack

### Core (Already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | 7.x | Database ORM with aggregations | Already in project, excellent aggregation API |
| @nestjs/common | 11.x | Framework | Existing codebase |
| @nestjs/event-emitter | 3.x | Event-driven activity capture | Already configured in project |

### Supporting (Already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-validator | 0.14.x | DTO validation | Query parameter validation |
| @nestjs/swagger | 11.x | API documentation | Dashboard endpoint docs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| On-demand aggregation | Pre-computed materialized views | Real-time data vs. query performance (indexes sufficient for our scale) |
| Unified ActivityLog table | Separate tables per domain | Single feed query vs. domain isolation (unified feed is priority) |
| Polymorphic references | Separate foreign keys per type | Flexibility vs. referential integrity (using resourceType + resourceId pattern) |
| Event-driven capture | Manual activity.create() calls | Consistency vs. explicit control (event-driven ensures completeness) |

**Installation:**
```bash
# No new dependencies required - all infrastructure exists
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── dashboard/
│   ├── dashboard.module.ts
│   ├── landlord-dashboard.controller.ts
│   ├── tenant-dashboard.controller.ts
│   ├── services/
│   │   ├── landlord-dashboard.service.ts
│   │   ├── tenant-dashboard.service.ts
│   │   └── kpi-calculator.service.ts
│   └── dto/
│       ├── landlord-dashboard-response.dto.ts
│       ├── tenant-dashboard-response.dto.ts
│       └── index.ts
│
├── activity-log/
│   ├── activity-log.module.ts
│   ├── activity-log.controller.ts        # GET /activities
│   ├── activity-log.service.ts           # Query & pagination
│   ├── listeners/
│   │   ├── application-activity.listener.ts
│   │   ├── payment-activity.listener.ts
│   │   ├── visit-activity.listener.ts
│   │   └── contract-activity.listener.ts
│   └── dto/
│       ├── get-activities.dto.ts         # Query params
│       └── activity-response.dto.ts
```

### Pattern 1: Dashboard KPI Aggregation with Prisma
**What:** Use Prisma's `_count`, `_sum`, `_avg` aggregations with proper where clauses
**When to use:** Computing dashboard statistics on-demand
**Example:**
```typescript
// Financial stats for landlord dashboard
async getLandlordFinancialStats(landlordId: string) {
  const currentMonth = startOfMonth(new Date());

  // Get active leases for this landlord
  const activeLeases = await this.prisma.lease.findMany({
    where: {
      landlordId,
      status: { in: ['ACTIVE', 'ENDING_SOON'] },
    },
    select: { id: true, monthlyRent: true },
  });

  const leaseIds = activeLeases.map(l => l.id);

  // Payments for current month (parallel queries)
  const [receivedPayments, expectedRevenue, latePayments] = await Promise.all([
    // Total received this month
    this.prisma.payment.aggregate({
      where: {
        leaseId: { in: leaseIds },
        paymentDate: { gte: currentMonth },
      },
      _sum: { amount: true },
    }),

    // Expected monthly revenue (sum of all active lease rents)
    activeLeases.reduce((sum, lease) => sum + lease.monthlyRent, 0),

    // Late/pending payments (no payment for current period)
    this.getLatePaymentsCount(leaseIds, currentMonth),
  ]);

  const received = receivedPayments._sum.amount ?? 0;
  const collectionRate = expectedRevenue > 0
    ? (received / expectedRevenue) * 100
    : 0;

  return {
    monthlyIncome: received,
    expectedIncome: expectedRevenue,
    collectionRate: Math.round(collectionRate * 10) / 10,
    pendingPayments: expectedRevenue - received,
    latePayments,
  };
}
```

### Pattern 2: Urgent Actions Count Aggregation
**What:** Count items requiring landlord attention across domains
**When to use:** "Urgent Actions" dashboard widget
**Example:**
```typescript
async getLandlordUrgentActions(landlordId: string) {
  // Get properties owned or managed by user
  const propertyIds = await this.getAccessiblePropertyIds(landlordId);

  // Parallel count queries
  const [
    pendingApplications,
    pendingSignatures,
    pendingVisits,
    endingLeases,
  ] = await Promise.all([
    // Applications needing review
    this.prisma.application.count({
      where: {
        propertyId: { in: propertyIds },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
    }),

    // Contracts waiting for landlord signature
    this.prisma.contract.count({
      where: {
        landlordId,
        status: 'PENDING_SIGNATURES',
        landlordSignedAt: null,
      },
    }),

    // Visit requests needing response
    this.prisma.propertyVisit.count({
      where: {
        propertyId: { in: propertyIds },
        status: 'PENDING',
      },
    }),

    // Leases ending within 30 days
    this.prisma.lease.count({
      where: {
        landlordId,
        status: 'ENDING_SOON',
      },
    }),
  ]);

  return {
    totalUrgent: pendingApplications + pendingSignatures + pendingVisits + endingLeases,
    pendingApplications,
    pendingSignatures,
    pendingVisits,
    endingLeases,
  };
}
```

### Pattern 3: Risk Distribution Aggregation
**What:** Group candidates by risk level for dashboard chart
**When to use:** Landlord dashboard candidate overview
**Example:**
```typescript
async getCandidateRiskDistribution(landlordId: string) {
  const propertyIds = await this.getAccessiblePropertyIds(landlordId);

  // Get all active candidates with scores
  const candidates = await this.prisma.application.findMany({
    where: {
      propertyId: { in: propertyIds },
      status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PREAPPROVED'] },
      riskScore: { isNot: null },
    },
    include: {
      riskScore: { select: { level: true } },
    },
  });

  // Group by risk level (in-memory - small dataset)
  const distribution = candidates.reduce((acc, app) => {
    const level = app.riskScore?.level ?? 'UNKNOWN';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    low: distribution.LOW ?? 0,
    medium: distribution.MEDIUM ?? 0,
    high: distribution.HIGH ?? 0,
    critical: distribution.CRITICAL ?? 0,
  };
}
```

### Pattern 4: Tenant Dashboard Summary
**What:** Single query with nested includes for tenant lease + payment info
**When to use:** Tenant dashboard overview
**Example:**
```typescript
async getTenantDashboard(tenantId: string) {
  // Get active lease with payments
  const lease = await this.prisma.lease.findFirst({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'ENDING_SOON'] },
    },
    include: {
      property: {
        select: { title: true, address: true, city: true },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 3,
      },
      _count: { select: { payments: true } },
    },
  });

  if (!lease) {
    return { hasActiveLease: false };
  }

  // Calculate payment status
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const currentPayment = lease.payments.find(
    p => p.periodMonth === currentMonth && p.periodYear === currentYear
  );

  // Upcoming visit
  const upcomingVisit = await this.prisma.propertyVisit.findFirst({
    where: {
      tenantId,
      status: { in: ['PENDING', 'ACCEPTED'] },
      visitDate: { gte: new Date() },
    },
    orderBy: { visitDate: 'asc' },
  });

  return {
    hasActiveLease: true,
    lease: {
      propertyTitle: lease.property.title,
      monthlyRent: lease.monthlyRent,
      paymentDay: lease.paymentDay,
      endDate: lease.endDate,
      status: lease.status,
    },
    payment: {
      currentMonthPaid: !!currentPayment,
      lastPaymentDate: lease.payments[0]?.paymentDate,
      totalPayments: lease._count.payments,
    },
    upcomingVisit: upcomingVisit ? {
      date: upcomingVisit.visitDate,
      startTime: upcomingVisit.startTime,
      status: upcomingVisit.status,
    } : null,
  };
}
```

### Pattern 5: Unified Activity Log Schema
**What:** Single polymorphic table capturing all activity types
**When to use:** Activity feed across all domains
**Example:**
```typescript
// Prisma schema for ActivityLog
enum ActivityType {
  APPLICATION_SUBMITTED
  APPLICATION_STATUS_CHANGED
  APPLICATION_INFO_REQUESTED
  PAYMENT_RECORDED
  PAYMENT_REQUEST_SUBMITTED
  PAYMENT_REQUEST_APPROVED
  PAYMENT_REQUEST_REJECTED
  VISIT_REQUESTED
  VISIT_ACCEPTED
  VISIT_REJECTED
  VISIT_CANCELLED
  VISIT_COMPLETED
  CONTRACT_CREATED
  CONTRACT_SIGNED
  CONTRACT_ACTIVATED
  LEASE_CREATED
  LEASE_ENDING_SOON
}

model ActivityLog {
  id           String       @id @default(uuid()) @db.Uuid
  userId       String       @map("user_id") @db.Uuid
  actorId      String       @map("actor_id") @db.Uuid
  type         ActivityType

  // Polymorphic reference
  resourceType String       @map("resource_type") @db.VarChar(50)  // 'application', 'payment', 'visit', 'contract', 'lease'
  resourceId   String       @map("resource_id") @db.Uuid

  // Contextual data
  metadata     Json         @default("{}")  // { propertyTitle, tenantName, amount, etc. }

  createdAt    DateTime     @default(now()) @map("created_at")

  // Relations
  user         User         @relation("UserActivities", fields: [userId], references: [id])
  actor        User         @relation("ActorActivities", fields: [actorId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@index([createdAt(sort: Desc)])
  @@map("activity_logs")
}
```

### Pattern 6: Event-Driven Activity Capture
**What:** Listeners respond to domain events and create activity log entries
**When to use:** All significant domain actions
**Example:**
```typescript
// application-activity.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationStatusChangedEvent } from '../../notifications/events/application.events.js';
import { ActivityLogService } from '../activity-log.service.js';
import { ActivityType } from '../../common/enums/index.js';

@Injectable()
export class ApplicationActivityListener {
  constructor(private readonly activityLog: ActivityLogService) {}

  @OnEvent('application.statusChanged')
  async handleStatusChanged(event: ApplicationStatusChangedEvent): Promise<void> {
    await this.activityLog.create({
      userId: event.tenantId,  // Activity appears in tenant's feed
      actorId: event.landlordId,  // Who performed the action
      type: ActivityType.APPLICATION_STATUS_CHANGED,
      resourceType: 'application',
      resourceId: event.applicationId,
      metadata: {
        propertyTitle: event.propertyTitle,
        newStatus: event.newStatus,
        actorName: event.actorName,
      },
    });

    // Also create entry in landlord's feed (they performed action)
    await this.activityLog.create({
      userId: event.landlordId,
      actorId: event.landlordId,
      type: ActivityType.APPLICATION_STATUS_CHANGED,
      resourceType: 'application',
      resourceId: event.applicationId,
      metadata: {
        propertyTitle: event.propertyTitle,
        newStatus: event.newStatus,
        tenantName: 'Tenant',  // Could fetch from event
      },
    });
  }
}
```

### Pattern 7: Activity Feed Pagination with Filters
**What:** Cursor-based pagination with optional filtering by resource type/property
**When to use:** GET /activities endpoint
**Example:**
```typescript
async getActivities(
  userId: string,
  dto: GetActivitiesDto,
): Promise<PaginatedActivitiesResponse> {
  const limit = dto.limit ?? 20;
  const cursor = dto.cursor;

  const where: Prisma.ActivityLogWhereInput = {
    userId,
    ...(dto.propertyId && {
      // Filter by property - use metadata query
      metadata: {
        path: ['propertyId'],
        equals: dto.propertyId,
      },
    }),
    ...(dto.types && {
      type: { in: dto.types },
    }),
    ...(cursor && {
      createdAt: { lt: new Date(cursor) },
    }),
  };

  const activities = await this.prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,  // Fetch one extra to detect hasMore
    include: {
      actor: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  const hasMore = activities.length > limit;
  const items = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items: items.map(this.formatActivity),
    nextCursor,
    hasMore,
  };
}
```

### Anti-Patterns to Avoid
- **Caching dashboard stats:** Don't cache unless performance tests show it's needed - on-demand is simpler and fresher
- **Separate activity tables per domain:** Keep unified ActivityLog for simple feed queries
- **Storing user-facing text in ActivityLog:** Store IDs/types and format text client-side (i18n friendly)
- **Not using indexes on activity queries:** userId + createdAt DESC is critical for feed performance
- **Duplicating ApplicationEvent logic:** ActivityLog is user-facing feed, ApplicationEvent is audit trail - different purposes
- **Synchronous activity logging:** Use event-driven to avoid blocking main operations

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Aggregation queries | Manual SQL | Prisma aggregations (_count, _sum, _avg) | Type-safe, tested, optimized |
| Date range queries | Manual date math | date-fns or native Date with clear helpers | Timezone handling, edge cases |
| Pagination | Offset-based | Cursor-based with createdAt | Better performance at scale |
| Event bus | Custom pub/sub | @nestjs/event-emitter | Already configured, works with existing patterns |
| JSON path queries | String manipulation | Prisma JSON filters | Database-level filtering |

**Key insight:** The dashboard aggregates existing normalized data - don't create denormalized summary tables unless profiling shows it's necessary. The activity log is the only new persistent model, and it's intentionally simple (single table, polymorphic references, event-driven).

## Common Pitfalls

### Pitfall 1: N+1 Queries in Dashboard Aggregations
**What goes wrong:** Looping through leases/properties and querying payments individually
**Why it happens:** Not using parallel Promise.all or proper includes
**How to avoid:** Batch queries with `where: { id: { in: [...] } }` and Promise.all for independent aggregations
**Warning signs:** Dashboard endpoint takes >500ms with modest data

### Pitfall 2: Missing Indexes on Activity Log Queries
**What goes wrong:** Activity feed slows down as log grows
**Why it happens:** Forgot compound index on (userId, createdAt DESC)
**How to avoid:** Add indexes in schema: `@@index([userId, createdAt(sort: Desc)])`
**Warning signs:** Slow query warnings from Prisma, increasing response times

### Pitfall 3: Activity Log Grows Unbounded
**What goes wrong:** Database size grows indefinitely, queries slow down
**Why it happens:** No retention policy or archival strategy
**How to avoid:** Document retention plan (e.g., keep 90 days, archive older), add createdAt to partitioning strategy if needed
**Warning signs:** Database size growing faster than expected

### Pitfall 4: Timezone Confusion in "This Month" Calculations
**What goes wrong:** Financial stats show wrong month's data for Colombian users
**Why it happens:** Using server timezone instead of Colombia timezone (UTC-5)
**How to avoid:** Use `TZDate` from date-fns for Colombia timezone, or store timezone in user profile
**Warning signs:** Metrics shift at midnight UTC instead of midnight Bogota time

### Pitfall 5: Stale Data After Lease Status Change
**What goes wrong:** Dashboard shows ACTIVE lease count but lease just ended
**Why it happens:** Lease status update is lazy (on-read) not automatic
**How to avoid:** Either (1) compute "active" from dates in query, or (2) add scheduled job to update statuses
**Warning signs:** Count mismatches between dashboard and manual queries

### Pitfall 6: Exposing Sensitive Data in Activity Metadata
**What goes wrong:** Full credit card info, cedula numbers in activity log
**Why it happens:** Storing entire payment/application object in metadata JSON
**How to avoid:** Only store IDs and display-safe fields (amounts, names) - never store PII
**Warning signs:** Privacy audit flags activity log as containing sensitive data

### Pitfall 7: Missing Activity Entries for Some Events
**What goes wrong:** Incomplete activity feed, users see gaps
**Why it happens:** Forgot to emit event or add listener for a domain action
**How to avoid:** Audit all state transitions (ApplicationStateMachine, VisitStateMachine, etc.) and ensure events emitted
**Warning signs:** Users report missing actions in timeline

## Code Examples

### ActivityLog Model (Prisma)
```prisma
/// Type of activity event in the unified activity log
enum ActivityType {
  // Application events
  APPLICATION_SUBMITTED
  APPLICATION_STATUS_CHANGED
  APPLICATION_INFO_REQUESTED
  APPLICATION_DOCUMENT_UPLOADED

  // Payment events
  PAYMENT_RECORDED
  PAYMENT_REQUEST_SUBMITTED
  PAYMENT_REQUEST_APPROVED
  PAYMENT_REQUEST_REJECTED
  PAYMENT_DISPUTE_OPENED

  // Visit events
  VISIT_REQUESTED
  VISIT_ACCEPTED
  VISIT_REJECTED
  VISIT_CANCELLED
  VISIT_COMPLETED
  VISIT_RESCHEDULED

  // Contract events
  CONTRACT_CREATED
  CONTRACT_SIGNED
  CONTRACT_ACTIVATED

  // Lease events
  LEASE_CREATED
  LEASE_ENDING_SOON
  LEASE_ENDED
}

/// Unified activity log for user timelines and feeds
/// Captures significant events across all domains
model ActivityLog {
  id           String       @id @default(uuid()) @db.Uuid
  userId       String       @map("user_id") @db.Uuid
  actorId      String       @map("actor_id") @db.Uuid
  type         ActivityType

  // Polymorphic reference to resource
  resourceType String       @map("resource_type") @db.VarChar(50)
  resourceId   String       @map("resource_id") @db.Uuid

  // Contextual data (property title, amounts, names, etc.)
  // NEVER store sensitive PII (full cedula, bank accounts)
  metadata     Json         @default("{}")

  createdAt    DateTime     @default(now()) @map("created_at")

  // Relations
  user         User         @relation("UserActivities", fields: [userId], references: [id], onDelete: Cascade)
  actor        User         @relation("ActorActivities", fields: [actorId], references: [id])

  // Critical indexes for feed queries
  @@index([userId, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@index([createdAt(sort: Desc)])
  @@map("activity_logs")
}
```

### User Model Updates (Add Relations)
```prisma
model User {
  // ... existing fields ...

  // Activity log relations
  userActivities  ActivityLog[] @relation("UserActivities")
  actorActivities ActivityLog[] @relation("ActorActivities")
}
```

### Landlord Dashboard Service
```typescript
// src/dashboard/services/landlord-dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PropertyAccessService } from '../../property-access/property-access.service.js';
import { LandlordDashboardResponseDto } from '../dto/landlord-dashboard-response.dto.js';
import { LeaseStatus, ApplicationStatus, VisitStatus } from '../../common/enums/index.js';
import { startOfMonth } from 'date-fns';

@Injectable()
export class LandlordDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccessService: PropertyAccessService,
  ) {}

  /**
   * Get aggregated dashboard stats for landlord.
   * Requirements: DASH-01, DASH-02, DASH-03
   */
  async getDashboard(landlordId: string): Promise<LandlordDashboardResponseDto> {
    // Get accessible property IDs (owned or managed)
    const propertyIds = await this.getAccessiblePropertyIds(landlordId);

    // Parallel aggregation queries
    const [
      financialStats,
      urgentActions,
      riskDistribution,
    ] = await Promise.all([
      this.getFinancialStats(landlordId, propertyIds),
      this.getUrgentActions(landlordId, propertyIds),
      getCandidateRiskDistribution(propertyIds),
    ]);

    return {
      financial: financialStats,
      urgentActions,
      candidates: riskDistribution,
    };
  }

  private async getAccessiblePropertyIds(landlordId: string): Promise<string[]> {
    const properties = await this.prisma.property.findMany({
      where: { landlordId },
      select: { id: true },
    });

    // Also include properties where user is assigned as agent
    const agentProperties = await this.prisma.propertyAgent.findMany({
      where: { agentId: landlordId },
      select: { propertyId: true },
    });

    return [
      ...properties.map(p => p.id),
      ...agentProperties.map(a => a.propertyId),
    ];
  }

  private async getFinancialStats(
    landlordId: string,
    propertyIds: string[],
  ) {
    const currentMonth = startOfMonth(new Date());

    // Get active leases
    const activeLeases = await this.prisma.lease.findMany({
      where: {
        landlordId,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.ENDING_SOON] },
      },
      select: { id: true, monthlyRent: true },
    });

    const leaseIds = activeLeases.map(l => l.id);
    const expectedIncome = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0);

    // Payments received this month
    const receivedPayments = await this.prisma.payment.aggregate({
      where: {
        leaseId: { in: leaseIds },
        paymentDate: { gte: currentMonth },
      },
      _sum: { amount: true },
    });

    const monthlyIncome = receivedPayments._sum.amount ?? 0;
    const collectionRate = expectedIncome > 0
      ? (monthlyIncome / expectedIncome) * 100
      : 0;

    // Count late/pending payments
    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth() + 1;

    const paidLeases = await this.prisma.payment.findMany({
      where: {
        leaseId: { in: leaseIds },
        periodYear: currentYear,
        periodMonth: currentMonthNum,
      },
      select: { leaseId: true },
    });

    const paidLeaseIds = new Set(paidLeases.map(p => p.leaseId));
    const latePayments = leaseIds.filter(id => !paidLeaseIds.has(id)).length;

    return {
      monthlyIncome,
      expectedIncome,
      collectionRate: Math.round(collectionRate * 10) / 10,
      pendingPayments: expectedIncome - monthlyIncome,
      latePayments,
    };
  }

  private async getUrgentActions(
    landlordId: string,
    propertyIds: string[],
  ) {
    const [
      pendingApplications,
      pendingSignatures,
      pendingVisits,
      endingLeases,
    ] = await Promise.all([
      this.prisma.application.count({
        where: {
          propertyId: { in: propertyIds },
          status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] },
        },
      }),

      this.prisma.contract.count({
        where: {
          landlordId,
          status: 'PENDING_SIGNATURES',
          landlordSignedAt: null,
        },
      }),

      this.prisma.propertyVisit.count({
        where: {
          propertyId: { in: propertyIds },
          status: VisitStatus.PENDING,
        },
      }),

      this.prisma.lease.count({
        where: {
          landlordId,
          status: LeaseStatus.ENDING_SOON,
        },
      }),
    ]);

    return {
      totalUrgent: pendingApplications + pendingSignatures + pendingVisits + endingLeases,
      pendingApplications,
      pendingSignatures,
      pendingVisits,
      endingLeases,
    };
  }

  private async getCandidateRiskDistribution(propertyIds: string[]) {
    const candidates = await this.prisma.application.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.PREAPPROVED,
        ]},
        riskScore: { isNot: null },
      },
      include: {
        riskScore: { select: { level: true } },
      },
    });

    const distribution = candidates.reduce((acc, app) => {
      const level = app.riskScore?.level ?? 'UNKNOWN';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      low: distribution.LOW ?? 0,
      medium: distribution.MEDIUM ?? 0,
      high: distribution.HIGH ?? 0,
      critical: distribution.CRITICAL ?? 0,
    };
  }
}
```

### Tenant Dashboard Service
```typescript
// src/dashboard/services/tenant-dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantDashboardResponseDto } from '../dto/tenant-dashboard-response.dto.js';
import { LeaseStatus, VisitStatus } from '../../common/enums/index.js';

@Injectable()
export class TenantDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get aggregated dashboard stats for tenant.
   * Requirements: DASH-04
   */
  async getDashboard(tenantId: string): Promise<TenantDashboardResponseDto> {
    // Get active lease with nested data
    const lease = await this.prisma.lease.findFirst({
      where: {
        tenantId,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.ENDING_SOON] },
      },
      include: {
        property: {
          select: { title: true, address: true, city: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 3,
        },
        _count: { select: { payments: true } },
      },
    });

    if (!lease) {
      return { hasActiveLease: false };
    }

    // Check current month payment
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentPayment = lease.payments.find(
      p => p.periodMonth === currentMonth && p.periodYear === currentYear
    );

    // Upcoming events
    const [upcomingVisit, upcomingPaymentDate] = await Promise.all([
      this.prisma.propertyVisit.findFirst({
        where: {
          tenantId,
          status: { in: [VisitStatus.PENDING, VisitStatus.ACCEPTED] },
          visitDate: { gte: now },
        },
        orderBy: { visitDate: 'asc' },
        include: {
          property: { select: { title: true, address: true } },
        },
      }),

      this.calculateNextPaymentDate(lease.paymentDay),
    ]);

    return {
      hasActiveLease: true,
      lease: {
        propertyTitle: lease.property.title,
        propertyAddress: `${lease.property.address}, ${lease.property.city}`,
        monthlyRent: lease.monthlyRent,
        paymentDay: lease.paymentDay,
        startDate: lease.startDate,
        endDate: lease.endDate,
        status: lease.status,
      },
      payment: {
        currentMonthPaid: !!currentPayment,
        lastPaymentDate: lease.payments[0]?.paymentDate,
        totalPayments: lease._count.payments,
        nextPaymentDue: upcomingPaymentDate,
      },
      upcomingVisit: upcomingVisit ? {
        propertyTitle: upcomingVisit.property.title,
        date: upcomingVisit.visitDate,
        startTime: upcomingVisit.startTime,
        status: upcomingVisit.status,
      } : null,
    };
  }

  private calculateNextPaymentDate(paymentDay: number): Date {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Next occurrence of paymentDay
    let nextDate = new Date(year, month, paymentDay);

    // If already passed this month, move to next month
    if (nextDate < now) {
      nextDate = new Date(year, month + 1, paymentDay);
    }

    return nextDate;
  }
}
```

### Activity Log Service
```typescript
// src/activity-log/activity-log.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ActivityType } from '../common/enums/index.js';
import { GetActivitiesDto, ActivityResponseDto, PaginatedActivitiesDto } from './dto/index.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create activity log entry.
   * Called by event listeners across domains.
   * Requirements: DASH-05
   */
  async create(data: {
    userId: string;
    actorId: string;
    type: ActivityType;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata ?? {},
      },
    });
  }

  /**
   * Get paginated activity feed for user.
   * Supports filtering by property, resource type, and activity types.
   * Requirements: DASH-06
   */
  async getActivities(
    userId: string,
    dto: GetActivitiesDto,
  ): Promise<PaginatedActivitiesDto> {
    const limit = dto.limit ?? 20;
    const cursor = dto.cursor;

    const where: Prisma.ActivityLogWhereInput = {
      userId,
      ...(dto.propertyId && {
        metadata: {
          path: ['propertyId'],
          equals: dto.propertyId,
        },
      }),
      ...(dto.types && {
        type: { in: dto.types },
      }),
      ...(cursor && {
        createdAt: { lt: new Date(cursor) },
      }),
    };

    const activities = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return {
      items: items.map(activity => this.formatActivity(activity)),
      nextCursor,
      hasMore,
    };
  }

  private formatActivity(activity: any): ActivityResponseDto {
    const actorName = [activity.actor.firstName, activity.actor.lastName]
      .filter(Boolean)
      .join(' ') || activity.actor.email;

    return {
      id: activity.id,
      type: activity.type,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      actorName,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
    };
  }
}
```

### Activity Listeners
```typescript
// src/activity-log/listeners/application-activity.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationStatusChangedEvent } from '../../notifications/events/application.events.js';
import { ActivityLogService } from '../activity-log.service.js';
import { ActivityType } from '../../common/enums/index.js';

@Injectable()
export class ApplicationActivityListener {
  private readonly logger = new Logger(ApplicationActivityListener.name);

  constructor(private readonly activityLog: ActivityLogService) {}

  @OnEvent('application.statusChanged')
  async handleStatusChanged(event: ApplicationStatusChangedEvent): Promise<void> {
    this.logger.log(`Logging activity for application ${event.applicationId} status change`);

    // Create activity for tenant (whose application changed)
    await this.activityLog.create({
      userId: event.tenantId,
      actorId: event.landlordId,
      type: ActivityType.APPLICATION_STATUS_CHANGED,
      resourceType: 'application',
      resourceId: event.applicationId,
      metadata: {
        propertyId: event.propertyId,
        propertyTitle: event.propertyTitle,
        newStatus: event.newStatus,
        actorName: event.actorName,
      },
    });

    // Create activity for landlord (who performed the action)
    await this.activityLog.create({
      userId: event.landlordId,
      actorId: event.landlordId,
      type: ActivityType.APPLICATION_STATUS_CHANGED,
      resourceType: 'application',
      resourceId: event.applicationId,
      metadata: {
        propertyId: event.propertyId,
        propertyTitle: event.propertyTitle,
        newStatus: event.newStatus,
      },
    });
  }

  @OnEvent('application.submitted')
  async handleSubmitted(event: any): Promise<void> {
    await this.activityLog.create({
      userId: event.tenantId,
      actorId: event.tenantId,
      type: ActivityType.APPLICATION_SUBMITTED,
      resourceType: 'application',
      resourceId: event.applicationId,
      metadata: {
        propertyId: event.propertyId,
        propertyTitle: event.propertyTitle,
      },
    });

    // Also create for landlord
    await this.activityLog.create({
      userId: event.landlordId,
      actorId: event.tenantId,
      type: ActivityType.APPLICATION_SUBMITTED,
      resourceType: 'application',
      resourceId: event.applicationId,
      metadata: {
        propertyId: event.propertyId,
        propertyTitle: event.propertyTitle,
        tenantName: event.tenantName,
      },
    });
  }
}

// src/activity-log/listeners/payment-activity.listener.ts

@Injectable()
export class PaymentActivityListener {
  constructor(private readonly activityLog: ActivityLogService) {}

  @OnEvent('payment.recorded')
  async handlePaymentRecorded(event: any): Promise<void> {
    // Create for tenant
    await this.activityLog.create({
      userId: event.tenantId,
      actorId: event.landlordId,
      type: ActivityType.PAYMENT_RECORDED,
      resourceType: 'payment',
      resourceId: event.paymentId,
      metadata: {
        leaseId: event.leaseId,
        amount: event.amount,
        periodMonth: event.periodMonth,
        periodYear: event.periodYear,
      },
    });

    // Create for landlord
    await this.activityLog.create({
      userId: event.landlordId,
      actorId: event.landlordId,
      type: ActivityType.PAYMENT_RECORDED,
      resourceType: 'payment',
      resourceId: event.paymentId,
      metadata: {
        leaseId: event.leaseId,
        amount: event.amount,
        periodMonth: event.periodMonth,
        periodYear: event.periodYear,
      },
    });
  }
}

// Similar listeners for visit, contract, lease events...
```

### Dashboard Controllers
```typescript
// src/dashboard/landlord-dashboard.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LandlordDashboardService } from './services/landlord-dashboard.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('landlord/dashboard')
@Roles(Role.LANDLORD, Role.BOTH)
export class LandlordDashboardController {
  constructor(
    private readonly dashboardService: LandlordDashboardService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get landlord dashboard aggregated stats' })
  async getDashboard(@CurrentUser('id') landlordId: string) {
    return this.dashboardService.getDashboard(landlordId);
  }
}

// src/dashboard/tenant-dashboard.controller.ts

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('tenants/me/dashboard')
@Roles(Role.TENANT, Role.BOTH)
export class TenantDashboardController {
  constructor(
    private readonly dashboardService: TenantDashboardService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get tenant dashboard aggregated stats' })
  async getDashboard(@CurrentUser('id') tenantId: string) {
    return this.dashboardService.getDashboard(tenantId);
  }
}

// src/activity-log/activity-log.controller.ts

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated activity feed' })
  async getActivities(
    @CurrentUser('id') userId: string,
    @Query() dto: GetActivitiesDto,
  ) {
    return this.activityLogService.getActivities(userId, dto);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Get activity filtered by property' })
  async getPropertyActivities(
    @CurrentUser('id') userId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() dto: GetActivitiesDto,
  ) {
    return this.activityLogService.getActivities(userId, {
      ...dto,
      propertyId,
    });
  }
}
```

### DTOs
```typescript
// src/dashboard/dto/landlord-dashboard-response.dto.ts

export class LandlordDashboardResponseDto {
  @ApiProperty({ description: 'Financial statistics' })
  financial!: {
    monthlyIncome: number;
    expectedIncome: number;
    collectionRate: number;
    pendingPayments: number;
    latePayments: number;
  };

  @ApiProperty({ description: 'Urgent actions requiring attention' })
  urgentActions!: {
    totalUrgent: number;
    pendingApplications: number;
    pendingSignatures: number;
    pendingVisits: number;
    endingLeases: number;
  };

  @ApiProperty({ description: 'Candidate risk distribution' })
  candidates!: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

// src/activity-log/dto/get-activities.dto.ts

export class GetActivitiesDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by property ID' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    enum: ActivityType,
    isArray: true,
    description: 'Filter by activity types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ActivityType, { each: true })
  types?: ActivityType[];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-computed dashboard tables | On-demand aggregation with indexes | 2020+ | Simpler, always fresh data |
| Separate audit tables per domain | Unified ActivityLog with polymorphic refs | ActivitySchema pattern | Single feed query |
| Offset pagination | Cursor-based pagination | Best practice | Better performance at scale |
| Manual activity logging | Event-driven capture | Modern event architectures | Consistency, completeness |
| Denormalized stats tables | Normalized with efficient aggregations | Modern ORMs (Prisma) | Simpler schema, type-safe queries |

**Current best practices:**
- [ActivitySchema](https://www.activityschema.com/) - Industry-standard pattern for unified activity modeling
- [Prisma aggregations](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing) - Type-safe aggregation queries
- Cursor-based pagination for activity feeds (better than offset at scale)
- Event-driven activity capture (consistency across domains)
- Compute dashboards on-demand (indexes make this fast enough)

## Open Questions

1. **Dashboard Cache Strategy**
   - What we know: On-demand queries with indexes are likely fast enough
   - What's unclear: Should we add Redis cache if dashboard queries exceed 500ms?
   - Recommendation: Start without cache, add only if profiling shows need

2. **Activity Log Retention**
   - What we know: Activity log will grow indefinitely
   - What's unclear: Keep all activities forever? Archive after 90 days?
   - Recommendation: Keep 90 days in main table, document archival strategy for future

3. **Real-Time Dashboard Updates**
   - What we know: Dashboard returns snapshot at query time
   - What's unclear: Should we add WebSocket push for real-time updates?
   - Recommendation: Start with polling (refresh on page load), add WebSockets later if requested

4. **Property-Level Dashboard for Agents**
   - What we know: Agents manage specific properties
   - What's unclear: Should agents see property-specific dashboard or just filtered landlord dashboard?
   - Recommendation: Use same landlord dashboard, filtered by accessible properties

5. **Activity Log Privacy**
   - What we know: ActivityLog is user-specific (userId field)
   - What's unclear: Should landlords see tenant's full activity (visits to other properties)?
   - Recommendation: Only show activities related to shared resources (applications, leases on landlord's properties)

## Sources

### Primary (HIGH confidence)
- Existing codebase: LandlordService.getCandidates() aggregation pattern
- Existing codebase: LeasesService.listForLandlord() with _count
- Existing codebase: ApplicationEvent, NotificationLog models
- [Prisma Aggregation Docs](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing) - Official aggregation API
- [ActivitySchema Framework](https://www.activityschema.com/) - Industry-standard activity modeling
- [Prisma Metrics Tutorial](https://www.prisma.io/blog/metrics-tutorial-prisma-pmoldgq10kz) - Database metrics patterns

### Secondary (MEDIUM confidence)
- [NestJS Aggregation Patterns](https://doug-martin.github.io/nestjs-query/docs/graphql/aggregations/) - nestjs-query aggregations
- [API with NestJS Aggregate Functions](http://wanago.io/2022/10/10/api-nestjs-aggregate-functions-sql/) - SQL aggregation examples
- [Vertabelo Activity Logging](https://vertabelo.com/blog/database-design-how-to-keep-track-of-what-the-users-do/) - User activity tracking patterns
- [Database Activity History](https://www.datasunrise.com/knowledge-center/database-activity-history/) - Activity monitoring best practices

### Tertiary (LOW confidence)
- [KPI Dashboard Guide 2026](https://improvado.io/blog/kpi-dashboard) - General dashboard concepts
- [Metabase PostgreSQL Dashboard](https://www.metabase.com/dashboards/postgresql-monitoring) - Dashboard visualization patterns

## Metadata

**Confidence breakdown:**
- Dashboard aggregation queries: HIGH - Prisma patterns verified in existing codebase
- ActivityLog schema: HIGH - Follows ActivitySchema industry standard
- Event-driven capture: HIGH - @nestjs/event-emitter already in use
- Dashboard performance: MEDIUM - Assumes indexes sufficient, may need cache later
- Activity retention: LOW - No policy defined yet

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - patterns are stable)

## Key Decisions for Planning

1. **New module:** Create `DashboardModule` with landlord/tenant services
2. **New module:** Create `ActivityLogModule` with listeners per domain
3. **New model:** `ActivityLog` with polymorphic references (resourceType + resourceId)
4. **No caching:** Start with on-demand aggregation, add cache only if needed
5. **Cursor pagination:** Use createdAt-based cursor for activity feed
6. **Event-driven:** All activity logging via event listeners
7. **Property filtering:** Dashboard queries filter by accessible property IDs (ownership + agent assignments)
8. **User relations:** Add ActivityLog relations to User model
9. **Retention:** Document 90-day retention recommendation, implement archival in future phase

## Requirements Mapping

| Requirement | Implementation |
|-------------|---------------|
| DASH-01: Landlord financial stats | LandlordDashboardService.getFinancialStats() with Payment aggregations |
| DASH-02: Landlord urgent actions | Count queries for PENDING applications, signatures, visits, ENDING_SOON leases |
| DASH-03: Risk distribution | Application.riskScore.level grouping for active candidates |
| DASH-04: Tenant dashboard | TenantDashboardService with active lease + payment status + upcoming events |
| DASH-05: Persist activity events | ActivityLog model with event listeners across domains |
| DASH-06: Paginated activity feed | GET /activities with cursor pagination, filtering by propertyId/types |

## API Endpoints

```
# Dashboard
GET    /landlord/dashboard           # Landlord aggregated stats
GET    /tenants/me/dashboard         # Tenant aggregated stats

# Activity Feed
GET    /activities                   # Paginated activity feed (authenticated)
GET    /activities?propertyId=X      # Activity filtered by property
GET    /activities?types=A,B         # Activity filtered by types
GET    /activities?cursor=X&limit=20 # Pagination
```

## Implementation Notes

**Dashboard queries should:**
- Use parallel Promise.all for independent aggregations
- Filter by accessible property IDs (owned + agent assignments)
- Include proper WHERE clauses (active statuses, date ranges)
- Return zero/empty values gracefully (no active leases, no payments)

**Activity log should:**
- Be populated via event listeners ONLY (not direct service calls)
- Store only non-sensitive metadata (IDs, titles, amounts - no PII)
- Use compound index (userId, createdAt DESC) for feed queries
- Support filtering by propertyId via JSON path query
- Return cursor for pagination (ISO timestamp of last item)

**Performance considerations:**
- All dashboard queries should complete <500ms (with proper indexes)
- Activity feed should complete <200ms for 20 items
- Add database indexes on: Lease.status, Application.status, PropertyVisit.status, Payment(leaseId, periodMonth, periodYear)
- Consider partitioning ActivityLog by createdAt if retention grows large
