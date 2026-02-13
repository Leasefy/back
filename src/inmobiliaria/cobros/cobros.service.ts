import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RegisterPaymentDto } from './dto/index.js';

@Injectable()
export class CobrosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate cobros for all active consignaciones with availability=RENTED
   * for the given month. Skips if cobro already exists (@@unique consignacionId+month).
   */
  async generate(agencyId: string, month: string) {
    const consignaciones = await this.prisma.consignacion.findMany({
      where: {
        agencyId,
        status: 'ACTIVE',
        availability: 'RENTED',
      },
      include: {
        propietario: true,
      },
    });

    // Get agency config for dueDate calculation
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const consignacion of consignaciones) {
      // Check if cobro already exists for this consignacion+month
      const existing = await this.prisma.cobro.findUnique({
        where: {
          consignacionId_month: {
            consignacionId: consignacion.id,
            month,
          },
        },
      });

      if (existing) {
        skipped.push(consignacion.id);
        continue;
      }

      const rentAmount = consignacion.monthlyRent;
      const adminAmount = consignacion.adminFee;
      const totalAmount = rentAmount + adminAmount;
      const totalWithFees = totalAmount;
      const pendingAmount = totalAmount;

      // Calculate dueDate: agency.paymentDueDay of the given month
      const [year, monthNum] = month.split('-').map(Number);
      const dueDay = agency.paymentDueDay;
      const dueDate = new Date(year, monthNum - 1, dueDay);

      await this.prisma.cobro.create({
        data: {
          agencyId,
          consignacionId: consignacion.id,
          propietarioId: consignacion.propietarioId,
          agenteUserId: consignacion.agenteUserId,
          tenantName: consignacion.currentTenantName,
          propertyTitle: consignacion.propertyTitle,
          month,
          rentAmount,
          adminAmount,
          totalAmount,
          totalWithFees,
          pendingAmount,
          dueDate,
        },
      });

      created.push(consignacion.id);
    }

    return {
      month,
      total: consignaciones.length,
      created: created.length,
      skipped: skipped.length,
    };
  }

  /**
   * List cobros with optional filters.
   */
  async findAll(
    agencyId: string,
    query?: {
      month?: string;
      status?: string;
      consignacionId?: string;
      propietarioId?: string;
    },
  ) {
    return this.prisma.cobro.findMany({
      where: {
        agencyId,
        ...(query?.month && { month: query.month }),
        ...(query?.status && { status: query.status as any }),
        ...(query?.consignacionId && { consignacionId: query.consignacionId }),
        ...(query?.propietarioId && { propietarioId: query.propietarioId }),
      },
      include: {
        consignacion: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single cobro by ID with consignacion details.
   */
  async findOne(agencyId: string, id: string) {
    const cobro = await this.prisma.cobro.findFirst({
      where: { id, agencyId },
      include: {
        consignacion: true,
      },
    });

    if (!cobro) {
      throw new NotFoundException(`Cobro with ID ${id} not found`);
    }

    return cobro;
  }

  /**
   * Register a payment for a cobro.
   * Updates paidAmount, calculates pendingAmount, and sets status accordingly.
   */
  async registerPayment(
    agencyId: string,
    id: string,
    dto: RegisterPaymentDto,
  ) {
    const cobro = await this.prisma.cobro.findFirst({
      where: { id, agencyId },
    });

    if (!cobro) {
      throw new NotFoundException(`Cobro with ID ${id} not found`);
    }

    const paidAmount = dto.paidAmount;
    const pendingAmount = cobro.totalWithFees - paidAmount;

    let status: string;
    if (paidAmount >= cobro.totalAmount) {
      status = 'PAID';
    } else if (paidAmount > 0) {
      status = 'PARTIAL';
    } else {
      status = cobro.status;
    }

    const paidDate = dto.paidDate
      ? new Date(dto.paidDate)
      : new Date();

    return this.prisma.cobro.update({
      where: { id },
      data: {
        paidAmount,
        pendingAmount,
        paidDate,
        paymentMethod: dto.paymentMethod ?? cobro.paymentMethod,
        paymentReference: dto.paymentReference ?? cobro.paymentReference,
        status: status as any,
      },
      include: {
        consignacion: true,
      },
    });
  }

  /**
   * Get summary statistics for a given month.
   */
  async getSummary(agencyId: string, month: string) {
    const cobros = await this.prisma.cobro.findMany({
      where: { agencyId, month },
    });

    const totalExpected = cobros.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalCollected = cobros.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalPending = cobros.reduce((sum, c) => sum + c.pendingAmount, 0);
    const totalLate = cobros
      .filter((c) => c.status === 'LATE')
      .reduce((sum, c) => sum + c.pendingAmount, 0);

    const countByStatus: Record<string, number> = {};
    for (const cobro of cobros) {
      countByStatus[cobro.status] = (countByStatus[cobro.status] ?? 0) + 1;
    }

    return {
      month,
      totalCobros: cobros.length,
      totalExpected,
      totalCollected,
      totalPending,
      totalLate,
      countByStatus,
    };
  }

  /**
   * Update late fees for all pending cobros past their dueDate.
   * Calculates daysLate and applies lateFeePercent from agency config.
   */
  async updateLateFees(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }

    const now = new Date();

    const pendingCobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        status: 'COBRO_PENDING',
        dueDate: { lt: now },
      },
    });

    let updated = 0;

    for (const cobro of pendingCobros) {
      const dueDate = new Date(cobro.dueDate);
      const diffMs = now.getTime() - dueDate.getTime();
      const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysLate <= 0) continue;

      // Calculate months late (minimum 1 month for any lateness)
      const monthsLate = Math.max(1, Math.ceil(daysLate / 30));

      const lateFee = Math.round(
        cobro.totalAmount * (agency.defaultLateFeePercent / 100) * monthsLate,
      );
      const totalWithFees = cobro.totalAmount + lateFee;
      const pendingAmount = totalWithFees - cobro.paidAmount;

      await this.prisma.cobro.update({
        where: { id: cobro.id },
        data: {
          daysLate,
          lateFee,
          totalWithFees,
          pendingAmount,
          status: 'LATE',
        },
      });

      updated++;
    }

    return { updated, total: pendingCobros.length };
  }

  /**
   * Send a reminder for a cobro.
   * Increments remindersSent counter and sets lastReminderDate.
   */
  async sendReminder(agencyId: string, id: string) {
    const cobro = await this.prisma.cobro.findFirst({
      where: { id, agencyId },
    });

    if (!cobro) {
      throw new NotFoundException(`Cobro with ID ${id} not found`);
    }

    return this.prisma.cobro.update({
      where: { id },
      data: {
        remindersSent: { increment: 1 },
        lastReminderDate: new Date(),
      },
    });
  }
}
