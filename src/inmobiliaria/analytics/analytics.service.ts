import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CobroStatus } from '../../common/enums/cobro-status.enum.js';
import { ConsignacionAvailability } from '../../common/enums/consignacion-availability.enum.js';
import { ConsignacionStatus } from '../../common/enums/consignacion-status.enum.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';
import { RenovacionStatus } from '../../common/enums/renovacion-status.enum.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return 8 KPIs for the agency dashboard analytics.
   */
  async getKpis(agencyId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Ingresos del mes: sum of paidAmount from cobros this month
    const cobrosThisMonth = await this.prisma.cobro.findMany({
      where: { agencyId, month: currentMonth },
      select: { paidAmount: true, totalAmount: true, status: true, pendingAmount: true },
    });

    const ingresosDelMes = cobrosThisMonth.reduce(
      (sum, c) => sum + c.paidAmount,
      0,
    );

    // 2. Tasa de ocupacion
    const totalActive = await this.prisma.consignacion.count({
      where: {
        agencyId,
        status: { in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING] },
      },
    });

    const totalRented = await this.prisma.consignacion.count({
      where: {
        agencyId,
        status: { in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING] },
        availability: ConsignacionAvailability.RENTED,
      },
    });

    const tasaOcupacion =
      totalActive > 0
        ? Math.round((totalRented / totalActive) * 100 * 100) / 100
        : 0;

    // 3. Recaudo del mes: (paidAmount / totalAmount) * 100
    const totalAmountThisMonth = cobrosThisMonth.reduce(
      (sum, c) => sum + c.totalAmount,
      0,
    );
    const recaudoDelMes =
      totalAmountThisMonth > 0
        ? Math.round(
            (ingresosDelMes / totalAmountThisMonth) * 100 * 100,
          ) / 100
        : 0;

    // 4. Dias promedio para arrendar (avg days from creation to COMPLETED for pipeline items)
    const completedPipeline = await this.prisma.pipelineItem.findMany({
      where: {
        agencyId,
        stage: PipelineStage.COMPLETED,
      },
      select: { daysInStage: true, createdAt: true, updatedAt: true },
    });

    let diasPromedioArrendar = 0;
    if (completedPipeline.length > 0) {
      const totalDays = completedPipeline.reduce((sum, item) => {
        const days = Math.floor(
          (item.updatedAt.getTime() - item.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return sum + days;
      }, 0);
      diasPromedioArrendar = Math.round(totalDays / completedPipeline.length);
    }

    // 5. Tasa de renovacion
    const totalRenovaciones = await this.prisma.renovacion.count({
      where: { agencyId },
    });
    const completedRenovaciones = await this.prisma.renovacion.count({
      where: { agencyId, status: RenovacionStatus.RENOV_COMPLETED },
    });
    const tasaRenovacion =
      totalRenovaciones > 0
        ? Math.round(
            (completedRenovaciones / totalRenovaciones) * 100 * 100,
          ) / 100
        : 0;

    // 6. Cartera vencida: sum of pendingAmount from LATE/DEFAULTED cobros
    const lateCobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        status: { in: [CobroStatus.LATE, CobroStatus.DEFAULTED] },
      },
      select: { pendingAmount: true },
    });
    const carteraVencida = lateCobros.reduce(
      (sum, c) => sum + c.pendingAmount,
      0,
    );

    // 7. Productividad de agentes: COMPLETED pipeline items / distinct agents
    const distinctAgents = await this.prisma.pipelineItem.findMany({
      where: {
        agencyId,
        agenteUserId: { not: null },
      },
      distinct: ['agenteUserId'],
      select: { agenteUserId: true },
    });
    const agentCount = distinctAgents.length;
    const productividadAgentes =
      agentCount > 0
        ? Math.round((completedPipeline.length / agentCount) * 100) / 100
        : 0;

    // 8. Total propietarios
    const totalPropietarios = await this.prisma.propietario.count({
      where: { agencyId },
    });

    return [
      {
        id: 'ingresosDelMes',
        label: 'Ingresos del mes',
        value: ingresosDelMes,
        category: 'financial' as const,
      },
      {
        id: 'tasaOcupacion',
        label: 'Tasa de ocupacion',
        value: tasaOcupacion,
        category: 'operational' as const,
      },
      {
        id: 'recaudoDelMes',
        label: 'Recaudo del mes',
        value: recaudoDelMes,
        category: 'financial' as const,
      },
      {
        id: 'diasPromedioArrendar',
        label: 'Dias promedio para arrendar',
        value: diasPromedioArrendar,
        category: 'operational' as const,
      },
      {
        id: 'tasaRenovacion',
        label: 'Tasa de renovacion',
        value: tasaRenovacion,
        category: 'operational' as const,
      },
      {
        id: 'carteraVencida',
        label: 'Cartera vencida',
        value: carteraVencida,
        category: 'financial' as const,
      },
      {
        id: 'productividadAgentes',
        label: 'Productividad de agentes',
        value: productividadAgentes,
        category: 'performance' as const,
      },
      {
        id: 'totalPropietarios',
        label: 'Total propietarios',
        value: totalPropietarios,
        category: 'performance' as const,
      },
    ];
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
