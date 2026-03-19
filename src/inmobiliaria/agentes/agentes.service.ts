import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyMemberStatus } from '../../common/enums/agency-member-status.enum.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';
import type { AgencyMember } from '@prisma/client';

export interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

export interface AgenteMetrics {
  assignedProperties: number;
  activeLeases: number;
  closedThisMonth: number;
  closedThisYear: number;
  totalCommissions: number;
  commissionsThisMonth: number;
  avgDaysToClose: number;
  conversionRate: number;
}

@Injectable()
export class AgentesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async computeMetrics(agencyId: string, userId: string): Promise<AgenteMetrics> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      assignedProperties,
      closedThisMonth,
      closedThisYear,
      allCompleted,
      allLeads,
      commissionsAgg,
      commissionsThisMonthAgg,
      completedItems,
    ] = await Promise.all([
      this.prisma.consignacion.count({ where: { agencyId, agenteUserId: userId } }),
      this.prisma.pipelineItem.count({
        where: {
          agencyId,
          agenteUserId: userId,
          stage: PipelineStage.COMPLETED,
          updatedAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      this.prisma.pipelineItem.count({
        where: { agencyId, agenteUserId: userId, stage: PipelineStage.COMPLETED, updatedAt: { gte: startOfYear } },
      }),
      this.prisma.pipelineItem.count({
        where: { agencyId, agenteUserId: userId, stage: PipelineStage.COMPLETED },
      }),
      this.prisma.pipelineItem.count({ where: { agencyId, agenteUserId: userId } }),
      this.prisma.dispersionItem.aggregate({
        where: { cobro: { agencyId, agenteUserId: userId } },
        _sum: { commissionAmount: true },
      }),
      this.prisma.dispersionItem.aggregate({
        where: { cobro: { agencyId, agenteUserId: userId, month: currentMonth } },
        _sum: { commissionAmount: true },
      }),
      this.prisma.pipelineItem.findMany({
        where: { agencyId, agenteUserId: userId, stage: PipelineStage.COMPLETED },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    let avgDaysToClose = 0;
    if (completedItems.length > 0) {
      const totalDays = completedItems.reduce(
        (sum, item) => sum + Math.floor((item.updatedAt.getTime() - item.createdAt.getTime()) / 86400000),
        0,
      );
      avgDaysToClose = Math.round(totalDays / completedItems.length);
    }

    return {
      assignedProperties,
      activeLeases: assignedProperties,
      closedThisMonth,
      closedThisYear,
      totalCommissions: commissionsAgg._sum.commissionAmount ?? 0,
      commissionsThisMonth: commissionsThisMonthAgg._sum.commissionAmount ?? 0,
      avgDaysToClose,
      conversionRate: allLeads > 0 ? Math.round((allCompleted / allLeads) * 100 * 100) / 100 : 0,
    };
  }

  private mapMember(member: AgencyMember, user: UserInfo | null, metrics: AgenteMetrics) {
    const name = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : 'Sin nombre';

    const rawStatus = member.agentStatus ?? 'ACTIVE';
    const status =
      rawStatus === 'ON_LEAVE' ? 'on_leave' : rawStatus.toLowerCase() as 'active' | 'inactive';

    return {
      id: member.id,
      name,
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      role: (member.agentRole ?? 'AGENT').toLowerCase() as 'agent' | 'coordinator' | 'director',
      status,
      commissionSplit: member.commissionSplit ?? 0,
      assignedPropertyIds: [] as string[],
      hireDate: member.hireDate?.toISOString().split('T')[0] ?? member.createdAt.toISOString().split('T')[0],
      zone: member.zone ?? undefined,
      specialization: member.specialization
        ? (member.specialization.toLowerCase() as 'residential' | 'commercial' | 'both')
        : undefined,
      metrics,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }

  private async getUsersMap(userIds: string[]): Promise<Map<string, UserInfo>> {
    if (userIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    return new Map(users.map((u) => [u.id, u]));
  }

  // ── Public methods ────────────────────────────────────────────────────────

  async findAll(agencyId: string) {
    const members = await this.prisma.agencyMember.findMany({
      where: { agencyId, role: AgencyMemberRole.AGENTE, status: AgencyMemberStatus.ACTIVE },
    });

    const usersMap = await this.getUsersMap(members.map((m) => m.userId));

    return Promise.all(
      members.map(async (m) => {
        const metrics = await this.computeMetrics(agencyId, m.userId);
        return this.mapMember(m, usersMap.get(m.userId) ?? null, metrics);
      }),
    );
  }

  async findOne(agencyId: string, id: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id, agencyId, role: AgencyMemberRole.AGENTE },
    });

    if (!member) throw new NotFoundException(`Agent with ID ${id} not found`);

    const usersMap = await this.getUsersMap([member.userId]);
    const metrics = await this.computeMetrics(agencyId, member.userId);
    return this.mapMember(member, usersMap.get(member.userId) ?? null, metrics);
  }

  async getMetrics(agencyId: string, id: string): Promise<AgenteMetrics> {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id, agencyId, role: AgencyMemberRole.AGENTE },
      select: { userId: true },
    });

    if (!member) throw new NotFoundException(`Agent with ID ${id} not found`);
    return this.computeMetrics(agencyId, member.userId);
  }

  async getConsignaciones(agencyId: string, id: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id, agencyId, role: AgencyMemberRole.AGENTE },
      select: { userId: true },
    });

    if (!member) throw new NotFoundException(`Agent with ID ${id} not found`);

    return this.prisma.consignacion.findMany({
      where: { agencyId, agenteUserId: member.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPipeline(agencyId: string, id: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id, agencyId, role: AgencyMemberRole.AGENTE },
      select: { userId: true },
    });

    if (!member) throw new NotFoundException(`Agent with ID ${id} not found`);

    return this.prisma.pipelineItem.findMany({
      where: { agencyId, agenteUserId: member.userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getLeaderboard(agencyId: string) {
    const agents = await this.findAll(agencyId);
    return agents.sort((a, b) => b.metrics.commissionsThisMonth - a.metrics.commissionsThisMonth);
  }
}
