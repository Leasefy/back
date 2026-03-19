import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CobroStatus } from '../../common/enums/cobro-status.enum.js';
import { ConsignacionAvailability } from '../../common/enums/consignacion-availability.enum.js';
import { ConsignacionStatus } from '../../common/enums/consignacion-status.enum.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';
import { RenovacionStatus } from '../../common/enums/renovacion-status.enum.js';
import { DispersionStatus } from '../../common/enums/dispersion-status.enum.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyMemberStatus } from '../../common/enums/agency-member-status.enum.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return dashboard KPIs matching the InmobiliariaDashboardKPIs frontend interface.
   */
  async getKpis(agencyId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // ── Portfolio ──────────────────────────────────────────────────────────
    const activeStatuses = { in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING] };

    const [totalProperties, propertiesAvailable, propertiesRented] = await Promise.all([
      this.prisma.consignacion.count({ where: { agencyId, status: activeStatuses } }),
      this.prisma.consignacion.count({ where: { agencyId, status: activeStatuses, availability: ConsignacionAvailability.AVAILABLE } }),
      this.prisma.consignacion.count({ where: { agencyId, status: activeStatuses, availability: ConsignacionAvailability.RENTED } }),
    ]);

    const propertiesInProcess = await this.prisma.pipelineItem.count({
      where: { agencyId, stage: { notIn: [PipelineStage.COMPLETED, PipelineStage.LOST] } },
    });

    const occupancyRate = totalProperties > 0
      ? Math.round((propertiesRented / totalProperties) * 100 * 100) / 100
      : 0;

    // ── Financial (current month) ──────────────────────────────────────────
    const cobrosThisMonth = await this.prisma.cobro.findMany({
      where: { agencyId, month: currentMonth },
      select: { paidAmount: true, totalAmount: true, status: true, pendingAmount: true },
    });

    const expectedRevenue = cobrosThisMonth.reduce((sum, c) => sum + c.totalAmount, 0);
    const collectedRevenue = cobrosThisMonth.reduce((sum, c) => sum + c.paidAmount, 0);
    const pendingCollections = cobrosThisMonth
      .filter(c => c.status === CobroStatus.COBRO_PENDING)
      .reduce((sum, c) => sum + c.pendingAmount, 0);
    const lateCollections = cobrosThisMonth
      .filter(c => c.status === CobroStatus.LATE || c.status === CobroStatus.DEFAULTED)
      .reduce((sum, c) => sum + c.pendingAmount, 0);
    const collectionRate = expectedRevenue > 0
      ? Math.round((collectedRevenue / expectedRevenue) * 100 * 100) / 100
      : 0;

    const commissionsAgg = await this.prisma.dispersion.aggregate({
      where: { agencyId, month: currentMonth },
      _sum: { totalCommission: true },
    });
    const totalCommissions = commissionsAgg._sum.totalCommission ?? 0;

    // ── Pipeline ───────────────────────────────────────────────────────────
    const [activeLeads, closedThisMonth] = await Promise.all([
      this.prisma.pipelineItem.count({
        where: { agencyId, stage: { notIn: [PipelineStage.COMPLETED, PipelineStage.LOST] } },
      }),
      this.prisma.pipelineItem.count({
        where: { agencyId, stage: PipelineStage.COMPLETED, updatedAt: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
    ]);

    // ── Avg days to close ──────────────────────────────────────────────────
    const completedPipeline = await this.prisma.pipelineItem.findMany({
      where: { agencyId, stage: PipelineStage.COMPLETED },
      select: { createdAt: true, updatedAt: true },
    });
    let avgDaysToClose = 0;
    if (completedPipeline.length > 0) {
      const totalDays = completedPipeline.reduce((sum, item) => {
        return sum + Math.floor((item.updatedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToClose = Math.round(totalDays / completedPipeline.length);
    }

    // ── Team ───────────────────────────────────────────────────────────────
    const totalAgents = await this.prisma.agencyMember.count({
      where: { agencyId, role: AgencyMemberRole.AGENTE, status: AgencyMemberStatus.ACTIVE },
    });

    // ── Owners & Dispersions ───────────────────────────────────────────────
    const [totalPropietarios, pendingDispersions] = await Promise.all([
      this.prisma.propietario.count({ where: { agencyId } }),
      this.prisma.dispersion.count({ where: { agencyId, status: DispersionStatus.DISP_PENDING } }),
    ]);

    return {
      // Portfolio
      totalProperties,
      propertiesAvailable,
      propertiesRented,
      propertiesInProcess,
      occupancyRate,
      // Financial
      expectedRevenue,
      collectedRevenue,
      pendingCollections,
      lateCollections,
      collectionRate,
      totalCommissions,
      // Pipeline
      activeLeads,
      scheduledVisits: 0,      // cross-module: visits are platform-level
      pendingApplications: 0,  // cross-module: applications are platform-level
      contractsInProgress: 0,  // cross-module: contracts are platform-level
      // Team
      totalAgents,
      closedThisMonth,
      avgDaysToClose,
      // Owners
      totalPropietarios,
      pendingDispersions,
    };
  }

  /**
   * Return chart data: revenueByMonth, occupancyByZone, collectionStatus, pipelineByStage.
   */
  async getCharts(agencyId: string) {
    const now = new Date();

    // 1. Revenue by month (last 6 months)
    const monthsList: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsList.push(`${yyyy}-${mm}`);
    }

    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        month: { in: monthsList },
        status: { in: [CobroStatus.PAID, CobroStatus.PARTIAL] },
      },
      select: { month: true, paidAmount: true },
    });

    const revenueMap = new Map<string, number>();
    for (const c of cobros) {
      revenueMap.set(c.month, (revenueMap.get(c.month) ?? 0) + c.paidAmount);
    }
    const revenueByMonth = monthsList.map((m) => ({
      month: m,
      value: revenueMap.get(m) ?? 0,
    }));

    // 2. Occupancy by zone
    const consignaciones = await this.prisma.consignacion.findMany({
      where: {
        agencyId,
        status: { in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING] },
      },
      select: { propertyCity: true, availability: true },
    });

    const zoneMap = new Map<
      string,
      { total: number; rented: number }
    >();
    for (const c of consignaciones) {
      const zone = c.propertyCity || 'Sin ciudad';
      const entry = zoneMap.get(zone) ?? { total: 0, rented: 0 };
      entry.total += 1;
      if (c.availability === ConsignacionAvailability.RENTED) {
        entry.rented += 1;
      }
      zoneMap.set(zone, entry);
    }
    const occupancyByZone = Array.from(zoneMap.entries()).map(
      ([zone, { total, rented }]) => ({ zone, total, rented }),
    );

    // 3. Collection status: cobro counts grouped by status
    const collectionGroups = await this.prisma.cobro.groupBy({
      by: ['status'],
      where: { agencyId },
      _count: { id: true },
    });
    const collectionStatus = collectionGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    // 4. Pipeline by stage
    const pipelineGroups = await this.prisma.pipelineItem.groupBy({
      by: ['stage'],
      where: { agencyId },
      _count: { id: true },
    });
    const pipelineByStage = pipelineGroups.map((g) => ({
      stage: g.stage,
      count: g._count.id,
    }));

    return {
      revenueByMonth,
      occupancyByZone,
      collectionStatus,
      pipelineByStage,
    };
  }

  /**
   * Return monthly data points for a given metric over the last 12 months.
   */
  async getTrend(agencyId: string, metricId: string) {
    const now = new Date();
    const points: Array<{ date: string; value: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const month = `${yyyy}-${mm}`;

      const value = await this.getMetricForMonth(agencyId, metricId, month);
      points.push({ date: month, value });
    }

    return { metricId, points };
  }

  /**
   * Simple linear projection: take last 6 months of the metric,
   * calculate trend line, project 3 months forward.
   */
  async getForecast(agencyId: string, metricId: string) {
    const now = new Date();
    const historical: Array<{ date: string; value: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const month = `${yyyy}-${mm}`;
      const value = await this.getMetricForMonth(agencyId, metricId, month);
      historical.push({ date: month, value });
    }

    // Linear regression on historical data
    const n = historical.length;
    const xs = historical.map((_, idx) => idx);
    const ys = historical.map((h) => h.value);

    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, idx) => a + x * ys[idx], 0);
    const sumX2 = xs.reduce((a, x) => a + x * x, 0);

    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    // Project 3 months forward
    const projected: Array<{ date: string; value: number }> = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const month = `${yyyy}-${mm}`;
      const projectedValue = Math.max(
        0,
        Math.round(intercept + slope * (n - 1 + i)),
      );
      projected.push({ date: month, value: projectedValue });
    }

    return { metricId, historical, projected };
  }

  /**
   * Helper: get a single metric value for a given month.
   * Supports: ingresosDelMes, tasaOcupacion, recaudoDelMes, carteraVencida,
   * productividadAgentes, totalPropietarios.
   */
  private async getMetricForMonth(
    agencyId: string,
    metricId: string,
    month: string,
  ): Promise<number> {
    switch (metricId) {
      case 'ingresosDelMes': {
        const cobros = await this.prisma.cobro.findMany({
          where: { agencyId, month },
          select: { paidAmount: true },
        });
        return cobros.reduce((sum, c) => sum + c.paidAmount, 0);
      }

      case 'recaudoDelMes': {
        const cobros = await this.prisma.cobro.findMany({
          where: { agencyId, month },
          select: { paidAmount: true, totalAmount: true },
        });
        const paid = cobros.reduce((s, c) => s + c.paidAmount, 0);
        const total = cobros.reduce((s, c) => s + c.totalAmount, 0);
        return total > 0
          ? Math.round((paid / total) * 100 * 100) / 100
          : 0;
      }

      case 'carteraVencida': {
        // Sum of pendingAmount from LATE/DEFAULTED cobros for the month
        const cobros = await this.prisma.cobro.findMany({
          where: {
            agencyId,
            month,
            status: { in: [CobroStatus.LATE, CobroStatus.DEFAULTED] },
          },
          select: { pendingAmount: true },
        });
        return cobros.reduce((sum, c) => sum + c.pendingAmount, 0);
      }

      case 'tasaOcupacion': {
        // Current snapshot (not truly historical, but best approximation)
        const total = await this.prisma.consignacion.count({
          where: {
            agencyId,
            status: {
              in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING],
            },
          },
        });
        const rented = await this.prisma.consignacion.count({
          where: {
            agencyId,
            status: {
              in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING],
            },
            availability: ConsignacionAvailability.RENTED,
          },
        });
        return total > 0
          ? Math.round((rented / total) * 100 * 100) / 100
          : 0;
      }

      case 'productividadAgentes': {
        const startOfMonth = new Date(`${month}-01T00:00:00Z`);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        const completed = await this.prisma.pipelineItem.count({
          where: {
            agencyId,
            stage: PipelineStage.COMPLETED,
            updatedAt: { gte: startOfMonth, lt: endOfMonth },
          },
        });
        const agents = await this.prisma.pipelineItem.findMany({
          where: { agencyId, agenteUserId: { not: null } },
          distinct: ['agenteUserId'],
          select: { agenteUserId: true },
        });
        const count = agents.length;
        return count > 0
          ? Math.round((completed / count) * 100) / 100
          : 0;
      }

      case 'totalPropietarios': {
        return this.prisma.propietario.count({ where: { agencyId } });
      }

      default:
        return 0;
    }
  }
}
