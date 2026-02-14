import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RenovacionStatus } from '../../common/enums/renovacion-status.enum.js';
import { CreateRenovacionDto } from './dto/create-renovacion.dto.js';
import { UpdateRenovacionStageDto } from './dto/update-stage.dto.js';

/** Map from status to the timestamp field that should be set. */
const STATUS_TIMESTAMP_MAP: Partial<Record<RenovacionStatus, string>> = {
  [RenovacionStatus.NOTIFIED]: 'notifiedAt',
  [RenovacionStatus.RENOV_APPROVED]: 'approvedAt',
  [RenovacionStatus.RENOV_SIGNED]: 'signedAt',
  [RenovacionStatus.RENOV_COMPLETED]: 'completedAt',
};

@Injectable()
export class RenovacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a lease renewal record.
   * Auto-fills property/tenant/owner data from the consignacion and
   * calculates daysUntilExpiry from leaseEndDate.
   */
  async create(agencyId: string, dto: CreateRenovacionDto) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id: dto.consignacionId, agencyId },
      include: { propietario: true },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${dto.consignacionId} not found`,
      );
    }

    if (!consignacion.leaseEndDate) {
      throw new NotFoundException(
        `Consignacion ${dto.consignacionId} has no lease end date`,
      );
    }

    const now = new Date();
    const leaseEnd = new Date(consignacion.leaseEndDate);
    const diffMs = leaseEnd.getTime() - now.getTime();
    const daysUntilExpiry = Math.max(
      0,
      Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
    );

    // Use contractDate as lease start if no explicit lease start
    const leaseStartDate = consignacion.contractDate;
    const leaseEndDate = consignacion.leaseEndDate;

    return this.prisma.renovacion.create({
      data: {
        agencyId,
        consignacionId: dto.consignacionId,
        leaseId: dto.leaseId,
        propietarioId: consignacion.propietarioId,
        agenteUserId: dto.agenteUserId,
        propertyTitle: consignacion.propertyTitle,
        propertyAddress: consignacion.propertyAddress,
        tenantName: consignacion.currentTenantName,
        propietarioName: consignacion.propietario.name,
        currentRent: consignacion.monthlyRent,
        leaseStartDate,
        leaseEndDate,
        daysUntilExpiry,
      },
      include: { history: true },
    });
  }

  /**
   * List renovaciones with optional status and urgency filters.
   * Urgency buckets: '0-30', '31-60', '61-90', '90+'.
   */
  async findAll(
    agencyId: string,
    query?: { status?: string; urgency?: string },
  ) {
    const where: Record<string, unknown> = { agencyId };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.urgency) {
      const range = this.parseUrgencyRange(query.urgency);
      if (range) {
        where.daysUntilExpiry = range;
      }
    }

    return this.prisma.renovacion.findMany({
      where,
      orderBy: { daysUntilExpiry: 'asc' },
    });
  }

  /**
   * Get a single renovacion with its full history.
   */
  async findOne(agencyId: string, id: string) {
    const record = await this.prisma.renovacion.findFirst({
      where: { id, agencyId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });

    if (!record) {
      throw new NotFoundException(`Renovacion with ID ${id} not found`);
    }

    return record;
  }

  /**
   * Update the stage/status of a renovacion.
   * Sets the corresponding timestamp and optionally creates a history entry.
   */
  async updateStage(
    agencyId: string,
    id: string,
    dto: UpdateRenovacionStageDto,
  ) {
    await this.findOne(agencyId, id);

    const data: Record<string, unknown> = { status: dto.status };

    // Set the corresponding timestamp
    const timestampField = STATUS_TIMESTAMP_MAP[dto.status];
    if (timestampField) {
      data[timestampField] = new Date();
    }

    if (dto.ipcRate !== undefined) {
      data.ipcRate = dto.ipcRate;
    }
    if (dto.proposedRent !== undefined) {
      data.proposedRent = dto.proposedRent;
    }
    if (dto.negotiatedRent !== undefined) {
      data.negotiatedRent = dto.negotiatedRent;
    }

    const updated = await this.prisma.renovacion.update({
      where: { id },
      data,
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });

    // Create history entry if a note was provided
    if (dto.historyNote) {
      await this.prisma.renovacionHistory.create({
        data: {
          renovacionId: id,
          action: dto.status,
          description: dto.historyNote,
        },
      });
    }

    return updated;
  }

  /**
   * Get renovaciones expiring within the specified number of days.
   * Ordered by daysUntilExpiry ascending (most urgent first).
   */
  async getUpcoming(agencyId: string, days: number) {
    return this.prisma.renovacion.findMany({
      where: {
        agencyId,
        daysUntilExpiry: { lte: days },
        status: {
          notIn: [
            RenovacionStatus.RENOV_COMPLETED,
            RenovacionStatus.RENOV_TERMINATED,
          ],
        },
      },
      orderBy: { daysUntilExpiry: 'asc' },
    });
  }

  /**
   * Add a history entry to a renovacion.
   */
  async addHistory(
    agencyId: string,
    renovacionId: string,
    action: string,
    description: string,
    actorName?: string,
  ) {
    // Verify the renovacion belongs to this agency
    await this.findOne(agencyId, renovacionId);

    return this.prisma.renovacionHistory.create({
      data: {
        renovacionId,
        action,
        description,
        actorName,
      },
    });
  }

  /**
   * Parse an urgency string like '0-30' into a Prisma where clause.
   */
  private parseUrgencyRange(
    urgency: string,
  ): { gte?: number; lte?: number } | null {
    switch (urgency) {
      case '0-30':
        return { gte: 0, lte: 30 };
      case '31-60':
        return { gte: 31, lte: 60 };
      case '61-90':
        return { gte: 61, lte: 90 };
      case '90+':
        return { gte: 91 };
      default:
        return null;
    }
  }
}
