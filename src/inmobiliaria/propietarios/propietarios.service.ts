import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ConsignacionAvailability } from '../../common/enums/consignacion-availability.enum.js';
import { CreatePropietarioDto } from './dto/create-propietario.dto.js';
import { UpdatePropietarioDto } from './dto/update-propietario.dto.js';

@Injectable()
export class PropietariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new propietario linked to the agency.
   */
  async create(agencyId: string, dto: CreatePropietarioDto) {
    return this.prisma.propietario.create({
      data: {
        agencyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        address: dto.address,
        city: dto.city,
        bankName: dto.bankName,
        bankAccountType: dto.bankAccountType,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountHolder: dto.bankAccountHolder,
        notes: dto.notes,
        tags: dto.tags ?? [],
      },
    });
  }

  /**
   * List all propietarios for the agency with computed fields:
   * - propertyCount: number of consignaciones
   * - activeLeases: number of consignaciones with availability RENTED
   * - totalMonthlyRent: sum of monthlyRent for RENTED consignaciones
   */
  async findAll(agencyId: string, query?: { search?: string }) {
    const where: Record<string, unknown> = { agencyId };

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { documentNumber: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const propietarios = await this.prisma.propietario.findMany({
      where,
      include: {
        consignaciones: {
          select: {
            id: true,
            availability: true,
            monthlyRent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return propietarios.map((p) => {
      const { consignaciones, ...rest } = p;
      const propertyCount = consignaciones.length;
      const rentedConsignaciones = consignaciones.filter(
        (c) => c.availability === ConsignacionAvailability.RENTED,
      );
      const activeLeases = rentedConsignaciones.length;
      const totalMonthlyRent = rentedConsignaciones.reduce(
        (sum, c) => sum + c.monthlyRent,
        0,
      );

      return {
        ...rest,
        propertyCount,
        activeLeases,
        totalMonthlyRent,
      };
    });
  }

  /**
   * Get a single propietario with consignaciones included.
   */
  async findOne(agencyId: string, id: string) {
    const propietario = await this.prisma.propietario.findFirst({
      where: { id, agencyId },
      include: {
        consignaciones: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!propietario) {
      throw new NotFoundException(
        `Propietario with ID ${id} not found in this agency`,
      );
    }

    return propietario;
  }

  /**
   * Update a propietario. Verifies it belongs to the agency.
   */
  async update(agencyId: string, id: string, dto: UpdatePropietarioDto) {
    const propietario = await this.prisma.propietario.findFirst({
      where: { id, agencyId },
    });

    if (!propietario) {
      throw new NotFoundException(
        `Propietario with ID ${id} not found in this agency`,
      );
    }

    return this.prisma.propietario.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  /**
   * Delete a propietario. Verifies it belongs to the agency.
   */
  async remove(agencyId: string, id: string): Promise<void> {
    const propietario = await this.prisma.propietario.findFirst({
      where: { id, agencyId },
    });

    if (!propietario) {
      throw new NotFoundException(
        `Propietario with ID ${id} not found in this agency`,
      );
    }

    await this.prisma.propietario.delete({
      where: { id },
    });
  }

  /**
   * Generate an owner statement (extracto) for a given month.
   * Fetches all cobros for the owner's consignaciones in the specified month,
   * calculates totals, commissions, and net amounts.
   *
   * @param month - Format 'YYYY-MM' (e.g. '2026-02')
   */
  async getExtracto(agencyId: string, propietarioId: string, month: string) {
    const propietario = await this.prisma.propietario.findFirst({
      where: { id: propietarioId, agencyId },
    });

    if (!propietario) {
      throw new NotFoundException(
        `Propietario with ID ${propietarioId} not found in this agency`,
      );
    }

    // Get all cobros for this propietario's consignaciones in the given month
    const cobros = await this.prisma.cobro.findMany({
      where: {
        agencyId,
        propietarioId,
        month,
      },
      include: {
        consignacion: {
          select: {
            id: true,
            propertyTitle: true,
            propertyAddress: true,
            commissionPercent: true,
            monthlyRent: true,
            adminFee: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate line items
    const lineItems = cobros.map((cobro) => {
      const commission =
        cobro.paidAmount * (cobro.consignacion.commissionPercent / 100);
      const net = cobro.paidAmount - commission;

      return {
        cobroId: cobro.id,
        consignacionId: cobro.consignacionId,
        propertyTitle: cobro.consignacion.propertyTitle,
        propertyAddress: cobro.consignacion.propertyAddress,
        rentAmount: cobro.rentAmount,
        adminAmount: cobro.adminAmount,
        totalAmount: cobro.totalAmount,
        paidAmount: cobro.paidAmount,
        status: cobro.status,
        commissionPercent: cobro.consignacion.commissionPercent,
        commissionAmount: Math.round(commission),
        netAmount: Math.round(net),
      };
    });

    // Calculate totals
    const totalRent = lineItems.reduce((sum, li) => sum + li.rentAmount, 0);
    const totalAdmin = lineItems.reduce((sum, li) => sum + li.adminAmount, 0);
    const totalPaid = lineItems.reduce((sum, li) => sum + li.paidAmount, 0);
    const totalCommission = lineItems.reduce(
      (sum, li) => sum + li.commissionAmount,
      0,
    );
    const totalNet = lineItems.reduce((sum, li) => sum + li.netAmount, 0);

    return {
      propietarioId: propietario.id,
      propietarioName: propietario.name,
      month,
      generatedAt: new Date().toISOString(),
      lineItems,
      totals: {
        totalRent,
        totalAdmin,
        totalPaid,
        totalCommission,
        totalNet,
      },
      bankInfo: {
        bankName: propietario.bankName,
        bankAccountType: propietario.bankAccountType,
        bankAccountNumber: propietario.bankAccountNumber,
        bankAccountHolder: propietario.bankAccountHolder,
      },
    };
  }
}
