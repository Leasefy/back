import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CobroStatus } from '../../common/enums/cobro-status.enum.js';
import { DispersionStatus } from '../../common/enums/dispersion-status.enum.js';
import { ConsignacionAvailability } from '../../common/enums/consignacion-availability.enum.js';
import { ConsignacionStatus } from '../../common/enums/consignacion-status.enum.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyMemberStatus } from '../../common/enums/agency-member-status.enum.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Owner monthly statement: rent collected, commission, and net per property.
   * Returns propietario info, line items per consignacion, and totals.
   */
  async getExtractoPropietario(
    agencyId: string,
    propietarioId: string,
    month: string,
  ) {
    const propietario = await this.prisma.propietario.findFirst({
      where: { id: propietarioId, agencyId },
    });

    if (!propietario) {
      return { propietario: null, items: [], totals: null };
    }

    // Get all cobros for this propietario's consignaciones in the given month
    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        propietarioId,
        month,
        status: { in: [CobroStatus.PAID, CobroStatus.PARTIAL] },
      },
      include: {
        consignacion: {
          select: {
            id: true,
            propertyTitle: true,
            propertyAddress: true,
            commissionPercent: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const items = cobros.map((cobro) => {
      const commission = Math.round(
        cobro.paidAmount * (cobro.consignacion.commissionPercent / 100),
      );
      const net = cobro.paidAmount - commission;
      return {
        consignacionId: cobro.consignacion.id,
        propertyTitle: cobro.consignacion.propertyTitle,
        propertyAddress: cobro.consignacion.propertyAddress,
        rentCollected: cobro.paidAmount,
        commissionPercent: cobro.consignacion.commissionPercent,
        commission,
        net,
      };
    });

    const totalCollected = items.reduce((s, i) => s + i.rentCollected, 0);
    const totalCommission = items.reduce((s, i) => s + i.commission, 0);
    const netToPropietario = totalCollected - totalCommission;

    return {
      propietario: {
        id: propietario.id,
        name: propietario.name,
        email: propietario.email,
        documentNumber: propietario.documentNumber,
        bankName: propietario.bankName,
        bankAccountNumber: propietario.bankAccountNumber,
      },
      month,
      items,
      totals: {
        totalCollected,
        totalCommission,
        netToPropietario,
      },
    };
  }

  /**
   * Aging analysis: bucket pending/late/partial cobros by days late.
   * Also includes monthly breakdown of collected vs overdue for last 12 months.
   */
  async getCarteraReport(agencyId: string) {
    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        status: {
          in: [
            CobroStatus.COBRO_PENDING,
            CobroStatus.LATE,
            CobroStatus.PARTIAL,
          ],
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    let bucket0to30 = 0;
    let bucket31to60 = 0;
    let bucket61to90 = 0;
    let bucket90plus = 0;
    let totalPending = 0;

    const items = cobros.map((cobro) => {
      const daysLate = Math.max(
        0,
        Math.floor(
          (now.getTime() - cobro.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const amount = cobro.pendingAmount;

      totalPending += amount;

      if (daysLate <= 30) {
        bucket0to30 += amount;
      } else if (daysLate <= 60) {
        bucket31to60 += amount;
      } else if (daysLate <= 90) {
        bucket61to90 += amount;
      } else {
        bucket90plus += amount;
      }

      return {
        cobroId: cobro.id,
        consignacionId: cobro.consignacionId,
        propertyTitle: cobro.propertyTitle,
        tenantName: cobro.tenantName,
        month: cobro.month,
        dueDate: cobro.dueDate,
        daysLate,
        totalAmount: cobro.totalWithFees,
        paidAmount: cobro.paidAmount,
        pendingAmount: cobro.pendingAmount,
        status: cobro.status,
      };
    });

    // Monthly breakdown: last 12 months, collected vs overdue
    const monthsList: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsList.push(`${yyyy}-${mm}`);
    }

    const monthlyCobros = await this.prisma.cobro.findMany({
      where: { agencyId, month: { in: monthsList } },
      select: {
        month: true,
        status: true,
        paidAmount: true,
        pendingAmount: true,
        totalWithFees: true,
      },
    });

    const byMonthMap = new Map<
      string,
      { collected: number; overdue: number; total: number; count: number }
    >();

    for (const m of monthsList) {
      byMonthMap.set(m, { collected: 0, overdue: 0, total: 0, count: 0 });
    }

    for (const c of monthlyCobros) {
      const entry = byMonthMap.get(c.month);
      if (!entry) continue;
      entry.collected += c.paidAmount;
      entry.total += c.totalWithFees;
      entry.count += 1;
      if (c.status === CobroStatus.LATE || c.status === CobroStatus.PARTIAL) {
        entry.overdue += c.pendingAmount;
      }
    }

    const byMonth = monthsList.map((m) => {
      const data = byMonthMap.get(m)!;
      const collectionRate =
        data.total > 0
          ? Math.round((data.collected / data.total) * 100 * 100) / 100
          : 0;
      return {
        month: m,
        collected: data.collected,
        overdue: data.overdue,
        total: data.total,
        cobroCount: data.count,
        collectionRate,
      };
    });

    return {
      items,
      summary: {
        totalPending,
        bucket0to30,
        bucket31to60,
        bucket61to90,
        bucket90plus,
      },
      byMonth,
    };
  }

  /**
   * Agent commissions report for a given month.
   * Sums commissions from cobros in each agent's assigned consignaciones.
   */
  async getComisionesReport(agencyId: string, month: string) {
    // Get all paid cobros for the month
    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        month,
        status: { in: [CobroStatus.PAID, CobroStatus.PARTIAL] },
      },
      include: {
        consignacion: {
          select: {
            agenteUserId: true,
            commissionPercent: true,
          },
        },
      },
    });

    // Get agency members with AGENTE role
    const agentes = await this.prisma.agencyMember.findMany({
      where: {
        agencyId,
        role: AgencyMemberRole.AGENTE,
        status: AgencyMemberStatus.ACTIVE,
      },
    });

    // Group commissions by agent
    const agentMap = new Map<
      string,
      { commissions: number; closedDeals: number }
    >();

    for (const agente of agentes) {
      agentMap.set(agente.userId, { commissions: 0, closedDeals: 0 });
    }

    for (const cobro of cobros) {
      const agenteId = cobro.consignacion.agenteUserId;
      if (!agenteId) continue;

      const entry = agentMap.get(agenteId) ?? {
        commissions: 0,
        closedDeals: 0,
      };
      const commission = Math.round(
        cobro.paidAmount * (cobro.consignacion.commissionPercent / 100),
      );
      entry.commissions += commission;
      entry.closedDeals += 1;
      agentMap.set(agenteId, entry);
    }

    // Also count completed pipeline items for each agent in the month
    const startOfMonth = new Date(`${month}-01T00:00:00Z`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const completedPipeline = await this.prisma.pipelineItem.groupBy({
      by: ['agenteUserId'],
      where: {
        agencyId,
        stage: PipelineStage.COMPLETED,
        updatedAt: { gte: startOfMonth, lt: endOfMonth },
      },
      _count: { id: true },
    });

    for (const row of completedPipeline) {
      if (!row.agenteUserId) continue;
      const entry = agentMap.get(row.agenteUserId);
      if (entry) {
        entry.closedDeals = Math.max(entry.closedDeals, row._count.id);
      }
    }

    let totalCommissions = 0;
    const agentesResult: Array<{
      userId: string;
      commissions: number;
      closedDeals: number;
    }> = [];

    for (const [userId, data] of agentMap.entries()) {
      totalCommissions += data.commissions;
      agentesResult.push({
        userId,
        commissions: data.commissions,
        closedDeals: data.closedDeals,
      });
    }

    // Sort by commissions descending
    agentesResult.sort((a, b) => b.commissions - a.commissions);

    return {
      period: month,
      totalCommissions,
      agentes: agentesResult,
      topAgentUserId: agentesResult.length > 0 ? agentesResult[0].userId : null,
    };
  }

  /**
   * Occupancy report: count consignaciones by availability, grouped by city/zone.
   * Also includes per-property breakdown and monthly occupancy trend (last 12 months).
   */
  async getOcupacionReport(agencyId: string) {
    const consignaciones = await this.prisma.consignacion.findMany({
      where: {
        agencyId,
        status: { in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING] },
      },
      select: {
        id: true,
        propertyTitle: true,
        propertyAddress: true,
        propertyCity: true,
        propertyZone: true,
        propertyType: true,
        monthlyRent: true,
        availability: true,
        currentTenantName: true,
        leaseEndDate: true,
      },
    });

    const totalProperties = consignaciones.length;
    const totalOccupied = consignaciones.filter(
      (c) => c.availability === ConsignacionAvailability.RENTED,
    ).length;
    const overallOccupancyRate =
      totalProperties > 0
        ? Math.round((totalOccupied / totalProperties) * 100 * 100) / 100
        : 0;

    // Group by city
    const zoneMap = new Map<
      string,
      { total: number; occupied: number }
    >();

    for (const c of consignaciones) {
      const zone = c.propertyCity || 'Sin ciudad';
      const entry = zoneMap.get(zone) ?? { total: 0, occupied: 0 };
      entry.total += 1;
      if (c.availability === ConsignacionAvailability.RENTED) {
        entry.occupied += 1;
      }
      zoneMap.set(zone, entry);
    }

    const zones = Array.from(zoneMap.entries()).map(
      ([zone, { total, occupied }]) => ({
        zone,
        total,
        occupied,
        rate:
          total > 0
            ? Math.round((occupied / total) * 100 * 100) / 100
            : 0,
      }),
    );

    // Per-property breakdown
    const byProperty = consignaciones.map((c) => ({
      consignacionId: c.id,
      propertyTitle: c.propertyTitle,
      propertyAddress: c.propertyAddress,
      propertyCity: c.propertyCity,
      propertyZone: c.propertyZone,
      propertyType: c.propertyType,
      monthlyRent: c.monthlyRent,
      availability: c.availability,
      tenantName: c.currentTenantName,
      leaseEndDate: c.leaseEndDate,
    }));

    // Monthly occupancy trend: derive from cobros (a property with a cobro in month X
    // was RENTED that month, since cobros are only generated for RENTED consignaciones).
    const now = new Date();
    const monthsList: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsList.push(`${yyyy}-${mm}`);
    }

    const historicalCobros = await this.prisma.cobro.findMany({
      where: { agencyId, month: { in: monthsList } },
      select: { month: true, consignacionId: true },
    });

    const occupiedByMonth = new Map<string, Set<string>>();
    for (const m of monthsList) {
      occupiedByMonth.set(m, new Set());
    }
    for (const c of historicalCobros) {
      occupiedByMonth.get(c.month)?.add(c.consignacionId);
    }

    const monthlyTrend = monthsList.map((m) => {
      const occupied = occupiedByMonth.get(m)?.size ?? 0;
      const rate =
        totalProperties > 0
          ? Math.round((occupied / totalProperties) * 100 * 100) / 100
          : 0;
      return {
        month: m,
        occupied,
        total: totalProperties,
        rate,
      };
    });

    return {
      totalProperties,
      totalOccupied,
      overallOccupancyRate,
      zones,
      byProperty,
      monthlyTrend,
    };
  }

  /**
   * Contract/lease expiry report: bucket consignaciones with leaseEndDate
   * by days until expiry.
   */
  async getVencimientosReport(agencyId: string) {
    const consignaciones = await this.prisma.consignacion.findMany({
      where: {
        agencyId,
        status: ConsignacionStatus.ACTIVE,
        availability: ConsignacionAvailability.RENTED,
        leaseEndDate: { not: null },
      },
      select: {
        id: true,
        propertyTitle: true,
        propertyAddress: true,
        propertyCity: true,
        currentTenantName: true,
        leaseEndDate: true,
        monthlyRent: true,
        agenteUserId: true,
      },
      orderBy: { leaseEndDate: 'asc' },
    });

    const now = new Date();
    let bucket0to30 = 0;
    let bucket31to60 = 0;
    let bucket61to90 = 0;
    let bucket90plus = 0;

    const items = consignaciones.map((c) => {
      const daysUntilExpiry = Math.floor(
        ((c.leaseEndDate as Date).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysUntilExpiry <= 30) {
        bucket0to30 += 1;
      } else if (daysUntilExpiry <= 60) {
        bucket31to60 += 1;
      } else if (daysUntilExpiry <= 90) {
        bucket61to90 += 1;
      } else {
        bucket90plus += 1;
      }

      return {
        consignacionId: c.id,
        propertyTitle: c.propertyTitle,
        propertyAddress: c.propertyAddress,
        propertyCity: c.propertyCity,
        tenantName: c.currentTenantName,
        leaseEndDate: c.leaseEndDate,
        daysUntilExpiry,
        monthlyRent: c.monthlyRent,
        agenteUserId: c.agenteUserId,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        bucket0to30,
        bucket31to60,
        bucket61to90,
        bucket90plus,
      },
    };
  }

  /**
   * Cash flow report: for last N months, aggregate cobro income and dispersiones outflow.
   */
  async getFlujoCajaReport(
    agencyId: string,
    period: string,
    months: number,
  ) {
    const now = new Date();
    const monthsList: string[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsList.push(`${yyyy}-${mm}`);
    }

    // Get cobros grouped by month
    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        month: { in: monthsList },
        status: { in: [CobroStatus.PAID, CobroStatus.PARTIAL] },
      },
      select: {
        month: true,
        paidAmount: true,
      },
    });

    // Get dispersiones grouped by month
    const dispersiones = await this.prisma.dispersion.findMany({
      where: {
        agencyId,
        month: { in: monthsList },
        status: {
          in: [DispersionStatus.DISP_COMPLETED, DispersionStatus.PROCESSING],
        },
      },
      select: {
        month: true,
        netToPropietario: true,
        totalCommission: true,
      },
    });

    // Build maps
    const cobroMap = new Map<string, number>();
    for (const c of cobros) {
      cobroMap.set(c.month, (cobroMap.get(c.month) ?? 0) + c.paidAmount);
    }

    const dispersionMap = new Map<string, number>();
    const commissionMap = new Map<string, number>();
    for (const d of dispersiones) {
      dispersionMap.set(
        d.month,
        (dispersionMap.get(d.month) ?? 0) + d.netToPropietario,
      );
      commissionMap.set(
        d.month,
        (commissionMap.get(d.month) ?? 0) + d.totalCommission,
      );
    }

    let totalIngresos = 0;
    let totalDispersiones = 0;
    let totalComisiones = 0;

    const monthsData = monthsList.map((m) => {
      const ingresos = cobroMap.get(m) ?? 0;
      const disp = dispersionMap.get(m) ?? 0;
      const comisiones = commissionMap.get(m) ?? 0;

      totalIngresos += ingresos;
      totalDispersiones += disp;
      totalComisiones += comisiones;

      return {
        month: m,
        ingresos,
        dispersiones: disp,
        comisiones,
      };
    });

    return {
      period,
      months: monthsData,
      totals: {
        ingresos: totalIngresos,
        dispersiones: totalDispersiones,
        comisiones: totalComisiones,
      },
    };
  }

  /**
   * Agent performance report for a given month.
   * For each agent: assigned consignaciones, active pipeline, completed deals,
   * average days to close.
   */
  async getRendimientoAgentesReport(agencyId: string, month: string) {
    // Get agents
    const agentes = await this.prisma.agencyMember.findMany({
      where: {
        agencyId,
        role: AgencyMemberRole.AGENTE,
        status: AgencyMemberStatus.ACTIVE,
      },
      select: {
        userId: true,
      },
    });

    const startOfMonth = new Date(`${month}-01T00:00:00Z`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const result: Array<{
      userId: string;
      assignedConsignaciones: number;
      activePipeline: number;
      activeLeads: number;
      completedDeals: number;
      lostDeals: number;
      conversionRate: number;
      avgDaysToClose: number;
    }> = [];

    for (const agente of agentes) {
      const uid = agente.userId;

      // Count assigned consignaciones
      const assignedConsignaciones = await this.prisma.consignacion.count({
        where: { agencyId, agenteUserId: uid },
      });

      // Count active pipeline items (not closed/lost)
      const activePipeline = await this.prisma.pipelineItem.count({
        where: {
          agencyId,
          agenteUserId: uid,
          stage: {
            notIn: [PipelineStage.COMPLETED, PipelineStage.LOST],
          },
        },
      });

      // Count completed pipeline items this month
      const completedItems = await this.prisma.pipelineItem.findMany({
        where: {
          agencyId,
          agenteUserId: uid,
          stage: PipelineStage.COMPLETED,
          updatedAt: { gte: startOfMonth, lt: endOfMonth },
        },
        select: { daysInStage: true, createdAt: true, updatedAt: true },
      });

      const completedDeals = completedItems.length;

      // Count lost pipeline items this month (for conversion rate denominator)
      const lostDeals = await this.prisma.pipelineItem.count({
        where: {
          agencyId,
          agenteUserId: uid,
          stage: PipelineStage.LOST,
          updatedAt: { gte: startOfMonth, lt: endOfMonth },
        },
      });

      // Conversion rate = completed / (completed + lost) this month
      const totalResolved = completedDeals + lostDeals;
      const conversionRate =
        totalResolved > 0
          ? Math.round((completedDeals / totalResolved) * 100 * 100) / 100
          : 0;

      // Average days to close (total lifecycle from created to completed)
      let avgDaysToClose = 0;
      if (completedItems.length > 0) {
        const totalDays = completedItems.reduce((sum, item) => {
          const days = Math.floor(
            (item.updatedAt.getTime() - item.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0);
        avgDaysToClose = Math.round(totalDays / completedItems.length);
      }

      result.push({
        userId: uid,
        assignedConsignaciones,
        activePipeline,
        activeLeads: activePipeline,
        completedDeals,
        lostDeals,
        conversionRate,
        avgDaysToClose,
      });
    }

    return {
      period: month,
      agentes: result,
    };
  }
}
