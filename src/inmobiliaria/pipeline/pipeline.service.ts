import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';
import { CreatePipelineItemDto } from './dto/create-pipeline-item.dto.js';
import { UpdatePipelineItemDto } from './dto/update-pipeline-item.dto.js';
import { MoveStageDto } from './dto/move-stage.dto.js';
import { LogActionDto } from './dto/log-action.dto.js';

const CONSIGNACION_INCLUDE = {
  consignacion: {
    select: {
      id: true,
      propertyTitle: true,
      propertyAddress: true,
      propertyCity: true,
      propertyType: true,
      monthlyRent: true,
    },
  },
};

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new pipeline item for a prospect.
   * Verifies the consignacion belongs to the agency.
   */
  async create(agencyId: string, dto: CreatePipelineItemDto) {
    // Verify consignacion belongs to the agency
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id: dto.consignacionId, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${dto.consignacionId} not found in this agency`,
      );
    }

    return this.prisma.pipelineItem.create({
      data: {
        agencyId,
        consignacionId: dto.consignacionId,
        agenteUserId: dto.agenteUserId,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        candidatePhone: dto.candidatePhone,
        candidateAvatar: dto.candidateAvatar,
        riskScore: dto.riskScore,
        riskLevel: dto.riskLevel,
        stage: dto.stage ?? PipelineStage.LEAD,
        nextAction: dto.nextAction,
        nextActionDate: dto.nextActionDate
          ? new Date(dto.nextActionDate)
          : undefined,
        notes: dto.notes,
      },
      include: CONSIGNACION_INCLUDE,
    });
  }

  /**
   * List pipeline items for the agency with optional filters.
   * Supports filtering by stage, agent, search term, and consignacion.
   */
  async findAll(
    agencyId: string,
    query?: {
      stage?: PipelineStage;
      agenteUserId?: string;
      search?: string;
      consignacionId?: string;
    },
  ) {
    const where: Record<string, unknown> = { agencyId };

    if (query?.stage) {
      where.stage = query.stage;
    }

    if (query?.agenteUserId) {
      where.agenteUserId = query.agenteUserId;
    }

    if (query?.consignacionId) {
      where.consignacionId = query.consignacionId;
    }

    if (query?.search) {
      where.OR = [
        { candidateName: { contains: query.search, mode: 'insensitive' } },
        { candidateEmail: { contains: query.search, mode: 'insensitive' } },
        { candidatePhone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.pipelineItem.findMany({
      where,
      include: CONSIGNACION_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single pipeline item by ID, scoped to the agency.
   */
  async findOne(agencyId: string, id: string) {
    const item = await this.prisma.pipelineItem.findFirst({
      where: { id, agencyId },
      include: CONSIGNACION_INCLUDE,
    });

    if (!item) {
      throw new NotFoundException(
        `Pipeline item with ID ${id} not found in this agency`,
      );
    }

    return item;
  }

  /**
   * Update a pipeline item's fields.
   */
  async update(agencyId: string, id: string, dto: UpdatePipelineItemDto) {
    const item = await this.prisma.pipelineItem.findFirst({
      where: { id, agencyId },
    });

    if (!item) {
      throw new NotFoundException(
        `Pipeline item with ID ${id} not found in this agency`,
      );
    }

    const data: Record<string, unknown> = { ...dto };

    // Convert date strings to Date objects
    if (dto.nextActionDate) {
      data.nextActionDate = new Date(dto.nextActionDate);
    }

    return this.prisma.pipelineItem.update({
      where: { id },
      data,
      include: CONSIGNACION_INCLUDE,
    });
  }

  /**
   * Move a pipeline item to a new stage.
   * Calculates daysInStage from the previous enteredStageAt.
   * Sets lostReason when moving to LOST.
   */
  async moveStage(agencyId: string, id: string, dto: MoveStageDto) {
    const item = await this.prisma.pipelineItem.findFirst({
      where: { id, agencyId },
    });

    if (!item) {
      throw new NotFoundException(
        `Pipeline item with ID ${id} not found in this agency`,
      );
    }

    const now = new Date();
    const daysInStage = Math.floor(
      (now.getTime() - item.enteredStageAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const data: Record<string, unknown> = {
      stage: dto.stage,
      enteredStageAt: now,
      daysInStage,
    };

    if (dto.stage === PipelineStage.LOST && dto.lostReason) {
      data.lostReason = dto.lostReason;
    }

    return this.prisma.pipelineItem.update({
      where: { id },
      data,
      include: CONSIGNACION_INCLUDE,
    });
  }

  /**
   * Log a contact action on a pipeline item.
   * Updates nextAction, nextActionDate, lastContactDate, and appends notes.
   */
  async logAction(agencyId: string, id: string, dto: LogActionDto) {
    const item = await this.prisma.pipelineItem.findFirst({
      where: { id, agencyId },
    });

    if (!item) {
      throw new NotFoundException(
        `Pipeline item with ID ${id} not found in this agency`,
      );
    }

    const now = new Date();
    const existingNotes = item.notes ?? '';
    const timestamp = now.toISOString().slice(0, 10);
    const newEntry = `[${timestamp}] ${dto.action}${dto.notes ? ` - ${dto.notes}` : ''}`;
    const updatedNotes = existingNotes
      ? `${newEntry}\n${existingNotes}`
      : newEntry;

    return this.prisma.pipelineItem.update({
      where: { id },
      data: {
        nextAction: dto.action,
        nextActionDate: dto.nextActionDate
          ? new Date(dto.nextActionDate)
          : null,
        lastContactDate: now,
        notes: updatedNotes,
      },
      include: CONSIGNACION_INCLUDE,
    });
  }

  /**
   * Get pipeline statistics for the agency.
   * Returns counts per stage, total active, closed this month, and conversion rate.
   */
  async getStats(agencyId: string) {
    const allItems = await this.prisma.pipelineItem.groupBy({
      by: ['stage'],
      where: { agencyId },
      _count: { id: true },
    });

    const stageCountsMap: Record<string, number> = {};
    let totalAll = 0;
    let totalCompleted = 0;
    let totalLost = 0;

    for (const row of allItems) {
      stageCountsMap[row.stage] = row._count.id;
      totalAll += row._count.id;
      if (row.stage === PipelineStage.COMPLETED) {
        totalCompleted = row._count.id;
      }
      if (row.stage === PipelineStage.LOST) {
        totalLost = row._count.id;
      }
    }

    // Build ordered stage counts
    const stageCounts = Object.values(PipelineStage).map((stage) => ({
      stage,
      count: stageCountsMap[stage] ?? 0,
    }));

    const totalActive = totalAll - totalCompleted - totalLost;

    // Closed this month (COMPLETED or LOST updated this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const closedThisMonth = await this.prisma.pipelineItem.count({
      where: {
        agencyId,
        stage: { in: [PipelineStage.COMPLETED, PipelineStage.LOST] },
        updatedAt: { gte: startOfMonth },
      },
    });

    const conversionRate =
      totalAll > 0
        ? Math.round((totalCompleted / totalAll) * 100 * 100) / 100
        : 0;

    return {
      stageCounts,
      totalAll,
      totalActive,
      totalCompleted,
      totalLost,
      closedThisMonth,
      conversionRate,
    };
  }

  /**
   * Delete a pipeline item.
   */
  async remove(agencyId: string, id: string) {
    const item = await this.prisma.pipelineItem.findFirst({
      where: { id, agencyId },
    });

    if (!item) {
      throw new NotFoundException(
        `Pipeline item with ID ${id} not found in this agency`,
      );
    }

    await this.prisma.pipelineItem.delete({ where: { id } });
  }
}
