import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class DispersionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate dispersiones for a given month.
   * For each propietario with paid/partial cobros in the month:
   * aggregate cobros, calculate commission, create Dispersion + DispersionItems.
   * Skips if dispersion already exists (@@unique propietarioId+month).
   */
  async generate(agencyId: string, month: string) {
    // Get all paid or partial cobros for this agency+month
    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        month,
        status: { in: ['PAID', 'PARTIAL'] },
      },
      include: {
        consignacion: true,
      },
    });

    // Group cobros by propietarioId
    const byPropietario = new Map<
      string,
      typeof cobros
    >();

    for (const cobro of cobros) {
      const existing = byPropietario.get(cobro.propietarioId) ?? [];
      existing.push(cobro);
      byPropietario.set(cobro.propietarioId, existing);
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const [propietarioId, propCobros] of byPropietario) {
      // Check if dispersion already exists for this propietario+month
      const existing = await this.prisma.dispersion.findUnique({
        where: {
          propietarioId_month: {
            propietarioId,
            month,
          },
        },
      });

      if (existing) {
        skipped.push(propietarioId);
        continue;
      }

      // Get propietario info for denormalization
      const propietario = await this.prisma.propietario.findUnique({
        where: { id: propietarioId },
      });

      if (!propietario) continue;

      // Calculate totals
      let totalCollected = 0;
      let totalCommission = 0;

      const items: Array<{
        cobroId: string;
        propertyTitle: string;
        rentCollected: number;
        commissionPercent: number;
        commissionAmount: number;
        netAmount: number;
      }> = [];

      for (const cobro of propCobros) {
        const rentCollected = cobro.paidAmount;
        const commissionPercent = cobro.consignacion.commissionPercent;
        const commissionAmount = Math.round(
          cobro.rentAmount * (commissionPercent / 100),
        );
        const netAmount = rentCollected - commissionAmount;

        totalCollected += rentCollected;
        totalCommission += commissionAmount;

        items.push({
          cobroId: cobro.id,
          propertyTitle: cobro.propertyTitle,
          rentCollected,
          commissionPercent,
          commissionAmount,
          netAmount,
        });
      }

      const netToPropietario = totalCollected - totalCommission;

      await this.prisma.dispersion.create({
        data: {
          agencyId,
          propietarioId,
          propietarioName: propietario.name,
          propietarioBankName: propietario.bankName,
          propietarioBankAccount: propietario.bankAccountNumber,
          month,
          totalCollected,
          totalCommission,
          netToPropietario,
          items: {
            create: items,
          },
        },
      });

      created.push(propietarioId);
    }

    return {
      month,
      totalPropietarios: byPropietario.size,
      created: created.length,
      skipped: skipped.length,
    };
  }

  /**
   * List dispersiones with optional filters and items included.
   */
  async findAll(
    agencyId: string,
    query?: {
      month?: string;
      status?: string;
      propietarioId?: string;
    },
  ) {
    return this.prisma.dispersion.findMany({
      where: {
        agencyId,
        ...(query?.month && { month: query.month }),
        ...(query?.status && { status: query.status as any }),
        ...(query?.propietarioId && { propietarioId: query.propietarioId }),
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single dispersion by ID with items and propietario details.
   */
  async findOne(agencyId: string, id: string) {
    const dispersion = await this.prisma.dispersion.findFirst({
      where: { id, agencyId },
      include: {
        items: true,
        propietario: true,
      },
    });

    if (!dispersion) {
      throw new NotFoundException(`Dispersion with ID ${id} not found`);
    }

    return dispersion;
  }

  /**
   * Approve a dispersion for processing.
   * Sets status to PROCESSING with approval metadata.
   */
  async approve(agencyId: string, id: string, approvedByUserId: string) {
    const dispersion = await this.prisma.dispersion.findFirst({
      where: { id, agencyId },
    });

    if (!dispersion) {
      throw new NotFoundException(`Dispersion with ID ${id} not found`);
    }

    if (dispersion.status !== 'DISP_PENDING') {
      throw new BadRequestException(
        `Dispersion is in status ${dispersion.status}, only DISP_PENDING can be approved`,
      );
    }

    return this.prisma.dispersion.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        approvedBy: approvedByUserId,
        approvedAt: new Date(),
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Process a dispersion (mark as completed with transfer reference).
   * On error, set status to FAILED with failureReason.
   */
  async process(agencyId: string, id: string, transferReference: string) {
    const dispersion = await this.prisma.dispersion.findFirst({
      where: { id, agencyId },
    });

    if (!dispersion) {
      throw new NotFoundException(`Dispersion with ID ${id} not found`);
    }

    if (dispersion.status !== 'PROCESSING') {
      throw new BadRequestException(
        `Dispersion is in status ${dispersion.status}, only PROCESSING can be completed`,
      );
    }

    try {
      return await this.prisma.dispersion.update({
        where: { id },
        data: {
          status: 'DISP_COMPLETED',
          processedAt: new Date(),
          transferReference,
        },
        include: {
          items: true,
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown error during processing';

      await this.prisma.dispersion.update({
        where: { id },
        data: {
          status: 'FAILED',
          failureReason: reason,
        },
      });

      throw error;
    }
  }
}
