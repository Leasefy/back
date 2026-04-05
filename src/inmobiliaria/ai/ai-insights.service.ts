import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AiInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivity(agencyId: string, limit = 20) {
    const memberUserIds = await this.getAgencyMemberUserIds(agencyId);

    if (memberUserIds.length === 0) {
      return { activities: [], source: 'db' };
    }

    const evaluations = await this.prisma.evaluationResult.findMany({
      where: { requestedBy: { in: memberUserIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        application: {
          select: { id: true, personalInfo: true, property: { select: { title: true } } },
        },
      },
    });

    const activities = evaluations.map((ev) => {
      const personalInfo = ev.application.personalInfo as Record<string, unknown> | null;
      const applicantName = personalInfo?.fullName ?? personalInfo?.nombre ?? 'Aplicante';
      const propertyTitle = ev.application.property.title;

      const statusMap: Record<string, 'success' | 'pending' | 'failed'> = {
        COMPLETED: 'success',
        PENDING: 'pending',
        FAILED: 'failed',
      };

      const durationMs =
        ev.status === 'COMPLETED'
          ? ev.updatedAt.getTime() - ev.createdAt.getTime()
          : undefined;

      return {
        id: ev.id,
        agentId: 'tenant-scoring',
        agentName: 'Evaluacion de Inquilino',
        type: 'execution' as const,
        title: `Evaluacion: ${applicantName}`,
        description: `Propiedad: ${propertyTitle}`,
        status: statusMap[ev.status] ?? 'pending',
        timestamp: ev.createdAt,
        metadata: {
          applicationId: ev.applicationId,
          durationMs,
          result: ev.status === 'COMPLETED' ? 'Completada' : undefined,
        },
      };
    });

    return { activities, source: 'db' };
  }

  async getMetrics(agencyId: string) {
    const memberUserIds = await this.getAgencyMemberUserIds(agencyId);

    if (memberUserIds.length === 0) {
      return this.emptyMetrics();
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const memberFilter = { requestedBy: { in: memberUserIds } };

    const [monthCount, weekCount, completedThisMonth, failedThisMonth] =
      await Promise.all([
        this.prisma.evaluationResult.count({
          where: { ...memberFilter, createdAt: { gte: startOfMonth } },
        }),
        this.prisma.evaluationResult.count({
          where: { ...memberFilter, createdAt: { gte: startOfWeek } },
        }),
        this.prisma.evaluationResult.findMany({
          where: {
            ...memberFilter,
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
          select: { createdAt: true, updatedAt: true },
        }),
        this.prisma.evaluationResult.count({
          where: {
            ...memberFilter,
            status: 'FAILED',
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

    // Average time for completed evaluations
    let avgTimeMin = '< 1 min';
    if (completedThisMonth.length > 0) {
      const totalMs = completedThisMonth.reduce(
        (sum, ev) => sum + (ev.updatedAt.getTime() - ev.createdAt.getTime()),
        0,
      );
      const avgMs = totalMs / completedThisMonth.length;
      const avgMinutes = Math.round(avgMs / 60_000);
      avgTimeMin = avgMinutes < 1 ? '< 1 min' : `${avgMinutes} min`;
    }

    const escalationRate =
      monthCount > 0
        ? `${Math.round((failedThisMonth / monthCount) * 100)}%`
        : '0%';

    const accuracyRate =
      monthCount > 0
        ? `${Math.round((completedThisMonth.length / monthCount) * 100)}%`
        : '0%';

    return {
      scoring: {
        evaluationsThisMonth: monthCount,
        avgTimeMin,
        escalationRate,
        accuracyRate,
      },
      matching: {
        suggestionsSent: 0,
        conversionRate: '0%',
        candidatesRedirected: 0,
        avgCompatibility: '0%',
      },
      summary: {
        actionsThisWeek: weekCount,
        hoursSavedThisMonth:
          completedThisMonth.length > 0
            ? `${Math.round(completedThisMonth.length * 0.5)}h`
            : '0h',
      },
    };
  }

  private async getAgencyMemberUserIds(agencyId: string): Promise<string[]> {
    const members = await this.prisma.agencyMember.findMany({
      where: { agencyId, status: 'ACTIVE' },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private emptyMetrics() {
    return {
      scoring: {
        evaluationsThisMonth: 0,
        avgTimeMin: '< 1 min',
        escalationRate: '0%',
        accuracyRate: '0%',
      },
      matching: {
        suggestionsSent: 0,
        conversionRate: '0%',
        candidatesRedirected: 0,
        avgCompatibility: '0%',
      },
      summary: {
        actionsThisWeek: 0,
        hoursSavedThisMonth: '0h',
      },
    };
  }
}
