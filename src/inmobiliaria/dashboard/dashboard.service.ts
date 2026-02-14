import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CobroStatus } from '../../common/enums/cobro-status.enum.js';
import { ConsignacionAvailability } from '../../common/enums/consignacion-availability.enum.js';
import { ConsignacionStatus } from '../../common/enums/consignacion-status.enum.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';
import { DispersionStatus } from '../../common/enums/dispersion-status.enum.js';
import { MantenimientoPriority } from '../../common/enums/mantenimiento-priority.enum.js';
import { MantenimientoStatus } from '../../common/enums/mantenimiento-status.enum.js';
import { ActaStatus } from '../../common/enums/acta-status.enum.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyMemberStatus } from '../../common/enums/agency-member-status.enum.js';
import { RenovacionStatus } from '../../common/enums/renovacion-status.enum.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregated KPIs for the main dashboard view.
   */
  async getDashboardKpis(agencyId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Property counts by availability
    const consignacionCounts = await this.prisma.consignacion.groupBy({
      by: ['availability'],
      where: {
        agencyId,
        status: { in: [ConsignacionStatus.ACTIVE, ConsignacionStatus.PENDING] },
      },
      _count: { id: true },
    });

    let totalProperties = 0;
    let propertiesAvailable = 0;
    let propertiesRented = 0;
    let propertiesInProcess = 0;

    for (const row of consignacionCounts) {
      totalProperties += row._count.id;
      if (row.availability === ConsignacionAvailability.AVAILABLE) {
        propertiesAvailable = row._count.id;
      } else if (row.availability === ConsignacionAvailability.RENTED) {
        propertiesRented = row._count.id;
      } else if (row.availability === ConsignacionAvailability.IN_PROCESS) {
        propertiesInProcess = row._count.id;
      }
    }

    const occupancyRate =
      totalProperties > 0
        ? Math.round((propertiesRented / totalProperties) * 100 * 100) / 100
        : 0;

    // Revenue KPIs from cobros this month
    const cobrosThisMonth = await this.prisma.cobro.findMany({
      where: { agencyId, month: currentMonth },
      select: {
        totalAmount: true,
        paidAmount: true,
        pendingAmount: true,
        status: true,
      },
    });

    const expectedRevenue = cobrosThisMonth.reduce(
      (sum, c) => sum + c.totalAmount,
      0,
    );
    const collectedRevenue = cobrosThisMonth.reduce(
      (sum, c) => sum + c.paidAmount,
      0,
    );
    const pendingCollections = cobrosThisMonth
      .filter((c) => c.status === CobroStatus.COBRO_PENDING)
      .reduce((sum, c) => sum + c.pendingAmount, 0);
    const lateCollections = cobrosThisMonth
      .filter(
        (c) =>
          c.status === CobroStatus.LATE || c.status === CobroStatus.DEFAULTED,
      )
      .reduce((sum, c) => sum + c.pendingAmount, 0);
    const collectionRate =
      expectedRevenue > 0
        ? Math.round((collectedRevenue / expectedRevenue) * 100 * 100) / 100
        : 0;

    // Commissions: sum from dispersiones this month
    const dispersiones = await this.prisma.dispersion.findMany({
      where: { agencyId, month: currentMonth },
      select: { totalCommission: true },
    });
    const totalCommissions = dispersiones.reduce(
      (sum, d) => sum + d.totalCommission,
      0,
    );

    // Pipeline stage counts
    const pipelineCounts = await this.prisma.pipelineItem.groupBy({
      by: ['stage'],
      where: { agencyId },
      _count: { id: true },
    });

    const pipelineMap = new Map<string, number>();
    for (const row of pipelineCounts) {
      pipelineMap.set(row.stage, row._count.id);
    }

    const activeLeads = pipelineMap.get(PipelineStage.LEAD) ?? 0;
    const scheduledVisits =
      pipelineMap.get(PipelineStage.VISIT_SCHEDULED) ?? 0;
    const pendingApplications =
      pipelineMap.get(PipelineStage.APPLICATION) ?? 0;
    const contractsInProgress =
      pipelineMap.get(PipelineStage.CONTRACT) ?? 0;

    // Closed this month
    const closedThisMonth = await this.prisma.pipelineItem.count({
      where: {
        agencyId,
        stage: PipelineStage.COMPLETED,
        updatedAt: { gte: startOfMonth, lt: endOfMonth },
      },
    });

    // Total agents (active AGENTE members)
    const totalAgents = await this.prisma.agencyMember.count({
      where: {
        agencyId,
        role: AgencyMemberRole.AGENTE,
        status: AgencyMemberStatus.ACTIVE,
      },
    });

    // Total propietarios
    const totalPropietarios = await this.prisma.propietario.count({
      where: { agencyId },
    });

    // Pending dispersiones
    const pendingDispersiones = await this.prisma.dispersion.count({
      where: { agencyId, status: DispersionStatus.DISP_PENDING },
    });

    return {
      totalProperties,
      propertiesAvailable,
      propertiesRented,
      propertiesInProcess,
      occupancyRate,
      expectedRevenue,
      collectedRevenue,
      pendingCollections,
      lateCollections,
      collectionRate,
      totalCommissions,
      activeLeads,
      scheduledVisits,
      pendingApplications,
      contractsInProgress,
      totalAgents,
      closedThisMonth,
      totalPropietarios,
      pendingDispersiones,
    };
  }

  /**
   * Quick stats: urgent counts requiring attention.
   */
  async getQuickStats(agencyId: string) {
    // Emergency maintenance requests
    const urgentMaintenance = await this.prisma.solicitudMantenimiento.count({
      where: {
        agencyId,
        priority: MantenimientoPriority.EMERGENCY,
        status: {
          notIn: [
            MantenimientoStatus.MAINT_COMPLETED,
            MantenimientoStatus.MAINT_CANCELLED,
          ],
        },
      },
    });

    // Pending acta signatures
    const pendingSignatures = await this.prisma.actaEntrega.count({
      where: {
        agencyId,
        status: ActaStatus.PENDING_SIGNATURES,
      },
    });

    // Leases ending within 30 days
    const endingLeases30d = await this.prisma.renovacion.count({
      where: {
        agencyId,
        daysUntilExpiry: { lte: 30 },
        status: {
          notIn: [
            RenovacionStatus.RENOV_COMPLETED,
            RenovacionStatus.RENOV_TERMINATED,
          ],
        },
      },
    });

    // Overdue (LATE) cobros
    const overduePayments = await this.prisma.cobro.count({
      where: {
        agencyId,
        status: CobroStatus.LATE,
      },
    });

    return {
      urgentMaintenance,
      pendingSignatures,
      endingLeases30d,
      overduePayments,
    };
  }

  /**
   * Recent activity across cobros, pipeline, and maintenance.
   * Returns a mixed list sorted by most recent first.
   */
  async getRecentActivity(agencyId: string, limit = 10) {
    // Fetch recent changes from multiple tables in parallel
    const [recentCobros, recentPipeline, recentMantenimiento] =
      await Promise.all([
        this.prisma.cobro.findMany({
          where: { agencyId },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            propertyTitle: true,
            tenantName: true,
            status: true,
            paidAmount: true,
            month: true,
            updatedAt: true,
          },
        }),
        this.prisma.pipelineItem.findMany({
          where: { agencyId },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            candidateName: true,
            stage: true,
            nextAction: true,
            updatedAt: true,
          },
        }),
        this.prisma.solicitudMantenimiento.findMany({
          where: { agencyId },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            propertyTitle: true,
            title: true,
            type: true,
            priority: true,
            status: true,
            updatedAt: true,
          },
        }),
      ]);

    // Normalize to a common shape
    type ActivityItem = {
      id: string;
      type: 'cobro' | 'pipeline' | 'mantenimiento';
      title: string;
      description: string;
      status: string;
      date: Date;
    };

    const activities: ActivityItem[] = [];

    for (const c of recentCobros) {
      activities.push({
        id: c.id,
        type: 'cobro',
        title: `Cobro ${c.month} - ${c.propertyTitle}`,
        description: c.tenantName
          ? `Tenant: ${c.tenantName} | Paid: ${c.paidAmount}`
          : `Paid: ${c.paidAmount}`,
        status: c.status,
        date: c.updatedAt,
      });
    }

    for (const p of recentPipeline) {
      activities.push({
        id: p.id,
        type: 'pipeline',
        title: `Pipeline - ${p.candidateName}`,
        description: p.nextAction ?? `Stage: ${p.stage}`,
        status: p.stage,
        date: p.updatedAt,
      });
    }

    for (const m of recentMantenimiento) {
      activities.push({
        id: m.id,
        type: 'mantenimiento',
        title: `Mantenimiento - ${m.propertyTitle}`,
        description: `${m.title} (${m.type}, ${m.priority})`,
        status: m.status,
        date: m.updatedAt,
      });
    }

    // Sort by date descending and take the limit
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    return activities.slice(0, limit);
  }
}
