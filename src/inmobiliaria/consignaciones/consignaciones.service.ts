import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateConsignacionDto } from './dto/create-consignacion.dto.js';
import { UpdateConsignacionDto } from './dto/update-consignacion.dto.js';

@Injectable()
export class ConsignacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new consignacion.
   * Verifies that the propietarioId belongs to the same agency.
   */
  async create(agencyId: string, dto: CreateConsignacionDto) {
    // Verify propietario belongs to this agency
    const propietario = await this.prisma.propietario.findFirst({
      where: { id: dto.propietarioId, agencyId },
    });

    if (!propietario) {
      throw new BadRequestException(
        `Propietario with ID ${dto.propietarioId} not found in this agency`,
      );
    }

    return this.prisma.consignacion.create({
      data: {
        agencyId,
        propietarioId: dto.propietarioId,
        propertyId: dto.propertyId,
        agenteUserId: dto.agenteUserId,
        propertyTitle: dto.propertyTitle,
        propertyAddress: dto.propertyAddress,
        propertyCity: dto.propertyCity,
        propertyZone: dto.propertyZone,
        propertyType: dto.propertyType as never,
        propertyThumbnail: dto.propertyThumbnail,
        monthlyRent: dto.monthlyRent,
        adminFee: dto.adminFee ?? 0,
        commissionPercent: dto.commissionPercent,
        contractDate: new Date(dto.contractDate),
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : undefined,
        minimumTerm: dto.minimumTerm,
      },
      include: {
        propietario: true,
      },
    });
  }

  /**
   * List consignaciones for the agency with optional filters.
   */
  async findAll(
    agencyId: string,
    query?: {
      status?: string;
      availability?: string;
      agenteUserId?: string;
      search?: string;
    },
  ) {
    const where: Record<string, unknown> = { agencyId };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.availability) {
      where.availability = query.availability;
    }

    if (query?.agenteUserId) {
      where.agenteUserId = query.agenteUserId;
    }

    if (query?.search) {
      where.OR = [
        { propertyTitle: { contains: query.search, mode: 'insensitive' } },
        { propertyAddress: { contains: query.search, mode: 'insensitive' } },
        { propertyCity: { contains: query.search, mode: 'insensitive' } },
        { currentTenantName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.consignacion.findMany({
      where,
      include: {
        propietario: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single consignacion with propietario included.
   */
  async findOne(agencyId: string, id: string) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id, agencyId },
      include: {
        propietario: true,
      },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${id} not found in this agency`,
      );
    }

    return consignacion;
  }

  /**
   * Update a consignacion. Verifies it belongs to the agency.
   */
  async update(agencyId: string, id: string, dto: UpdateConsignacionDto) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${id} not found in this agency`,
      );
    }

    const data: Record<string, unknown> = { ...dto };

    // Convert date strings to Date objects if present
    if (dto.contractDate) {
      data.contractDate = new Date(dto.contractDate);
    }
    if (dto.contractEndDate) {
      data.contractEndDate = new Date(dto.contractEndDate);
    }
    if (dto.leaseEndDate) {
      data.leaseEndDate = new Date(dto.leaseEndDate);
    }

    return this.prisma.consignacion.update({
      where: { id },
      data,
      include: {
        propietario: true,
      },
    });
  }

  /**
   * Delete a consignacion. Verifies it belongs to the agency.
   */
  async remove(agencyId: string, id: string): Promise<void> {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${id} not found in this agency`,
      );
    }

    await this.prisma.consignacion.delete({
      where: { id },
    });
  }

  /**
   * Assign an agent to a consignacion.
   */
  async assignAgent(agencyId: string, id: string, agenteUserId: string) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${id} not found in this agency`,
      );
    }

    return this.prisma.consignacion.update({
      where: { id },
      data: { agenteUserId },
      include: {
        propietario: true,
      },
    });
  }

  /**
   * Get cobros history for a consignacion.
   */
  async getLeaseHistory(agencyId: string, id: string) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${id} not found in this agency`,
      );
    }

    return this.prisma.cobro.findMany({
      where: {
        consignacionId: id,
        agencyId,
      },
      orderBy: { month: 'desc' },
    });
  }

  /**
   * Get maintenance requests for a consignacion.
   */
  async getMaintenanceRequests(agencyId: string, consignacionId: string) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id: consignacionId, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${consignacionId} not found in this agency`,
      );
    }

    return this.prisma.solicitudMantenimiento.findMany({
      where: {
        consignacionId,
        agencyId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
