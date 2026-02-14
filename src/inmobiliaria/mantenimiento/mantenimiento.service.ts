import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { MantenimientoStatus } from '../../common/enums/mantenimiento-status.enum.js';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto.js';
import { AddQuoteDto } from './dto/add-quote.dto.js';

@Injectable()
export class MantenimientoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a maintenance request.
   * Auto-fills propietarioId, propertyTitle, tenantName, propietarioName
   * from the associated consignacion.
   */
  async create(agencyId: string, dto: CreateMantenimientoDto) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id: dto.consignacionId, agencyId },
      include: { propietario: true },
    });

    if (!consignacion) {
      throw new NotFoundException(
        `Consignacion with ID ${dto.consignacionId} not found`,
      );
    }

    return this.prisma.solicitudMantenimiento.create({
      data: {
        agencyId,
        consignacionId: dto.consignacionId,
        propietarioId: consignacion.propietarioId,
        agenteUserId: dto.agenteUserId,
        propertyTitle: consignacion.propertyTitle,
        tenantName: consignacion.currentTenantName,
        propietarioName: consignacion.propietario.name,
        type: dto.type,
        priority: dto.priority,
        title: dto.title,
        description: dto.description,
        photoUrls: dto.photoUrls ?? [],
        paidBy: dto.paidBy,
      },
      include: { quotes: true },
    });
  }

  /**
   * List maintenance requests with optional filters.
   * Includes quote count for each request.
   */
  async findAll(
    agencyId: string,
    query?: {
      status?: string;
      priority?: string;
      type?: string;
      consignacionId?: string;
    },
  ) {
    const where: Record<string, unknown> = { agencyId };

    if (query?.status) {
      where.status = query.status;
    }
    if (query?.priority) {
      where.priority = query.priority;
    }
    if (query?.type) {
      where.type = query.type;
    }
    if (query?.consignacionId) {
      where.consignacionId = query.consignacionId;
    }

    return this.prisma.solicitudMantenimiento.findMany({
      where,
      include: {
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single maintenance request with all quotes.
   */
  async findOne(agencyId: string, id: string) {
    const record = await this.prisma.solicitudMantenimiento.findFirst({
      where: { id, agencyId },
      include: { quotes: { orderBy: { createdAt: 'asc' } } },
    });

    if (!record) {
      throw new NotFoundException(
        `Maintenance request with ID ${id} not found`,
      );
    }

    return record;
  }

  /**
   * Update a maintenance request.
   */
  async update(
    agencyId: string,
    id: string,
    dto: Partial<CreateMantenimientoDto>,
  ) {
    await this.findOne(agencyId, id);

    const { consignacionId: _c, ...updateData } = dto;

    return this.prisma.solicitudMantenimiento.update({
      where: { id },
      data: updateData,
      include: { quotes: true },
    });
  }

  /**
   * Add a vendor quote to a maintenance request.
   * If this is the first quote, the status moves to QUOTED.
   */
  async addQuote(agencyId: string, id: string, dto: AddQuoteDto) {
    const solicitud = await this.findOne(agencyId, id);

    const quote = await this.prisma.mantenimientoQuote.create({
      data: {
        solicitudId: id,
        providerName: dto.providerName,
        providerPhone: dto.providerPhone,
        amount: dto.amount,
        description: dto.description,
        estimatedDays: dto.estimatedDays,
      },
    });

    // Move to QUOTED if this is the first quote
    if (solicitud.status === MantenimientoStatus.REPORTED) {
      await this.prisma.solicitudMantenimiento.update({
        where: { id },
        data: { status: MantenimientoStatus.QUOTED },
      });
    }

    return quote;
  }

  /**
   * Select a quote for a maintenance request.
   * Sets selectedQuoteId and approvedAmount from the chosen quote.
   */
  async selectQuote(agencyId: string, id: string, quoteId: string) {
    await this.findOne(agencyId, id);

    const quote = await this.prisma.mantenimientoQuote.findFirst({
      where: { id: quoteId, solicitudId: id },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }

    return this.prisma.solicitudMantenimiento.update({
      where: { id },
      data: {
        selectedQuoteId: quoteId,
        approvedAmount: quote.amount,
      },
      include: { quotes: true },
    });
  }

  /**
   * Approve a maintenance request. Sets status to MAINT_APPROVED.
   */
  async approve(agencyId: string, id: string) {
    await this.findOne(agencyId, id);

    return this.prisma.solicitudMantenimiento.update({
      where: { id },
      data: { status: MantenimientoStatus.MAINT_APPROVED },
      include: { quotes: true },
    });
  }

  /**
   * Mark a maintenance request as completed.
   * Sets status to MAINT_COMPLETED and records completedAt timestamp.
   */
  async complete(
    agencyId: string,
    id: string,
    completionNotes?: string,
    completionPhotoUrls?: string[],
  ) {
    await this.findOne(agencyId, id);

    return this.prisma.solicitudMantenimiento.update({
      where: { id },
      data: {
        status: MantenimientoStatus.MAINT_COMPLETED,
        completedAt: new Date(),
        completionNotes,
        completionPhotoUrls: completionPhotoUrls ?? [],
      },
      include: { quotes: true },
    });
  }

  /**
   * Cancel a maintenance request. Sets status to MAINT_CANCELLED.
   */
  async cancel(agencyId: string, id: string) {
    await this.findOne(agencyId, id);

    return this.prisma.solicitudMantenimiento.update({
      where: { id },
      data: { status: MantenimientoStatus.MAINT_CANCELLED },
      include: { quotes: true },
    });
  }
}
