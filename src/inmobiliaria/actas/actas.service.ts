import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ActaStatus } from '../../common/enums/acta-status.enum.js';
import { CreateActaDto } from './dto/create-acta.dto.js';
import { UpdateActaDto } from './dto/update-acta.dto.js';
import { SignActaDto } from './dto/sign-acta.dto.js';

@Injectable()
export class ActasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new acta (delivery/return act).
   * Auto-fills propietarioName from the propietario lookup.
   */
  async create(agencyId: string, dto: CreateActaDto) {
    // Lookup propietario to get their name
    const propietario = await this.prisma.propietario.findFirst({
      where: { id: dto.propietarioId, agencyId },
    });

    if (!propietario) {
      throw new NotFoundException(
        `Propietario with ID ${dto.propietarioId} not found`,
      );
    }

    return this.prisma.actaEntrega.create({
      data: {
        agencyId,
        type: dto.type,
        consignacionId: dto.consignacionId ?? null,
        leaseId: dto.leaseId ?? null,
        propietarioId: dto.propietarioId,
        agenteUserId: dto.agenteUserId ?? null,
        propertyTitle: dto.propertyTitle,
        propertyAddress: dto.propertyAddress,
        tenantName: dto.tenantName ?? null,
        propietarioName: propietario.name,
        generalCondition: dto.generalCondition ?? 'GOOD',
        generalObservations: dto.generalObservations ?? null,
        depositAmount: dto.depositAmount ?? null,
        status: ActaStatus.ACTA_DRAFT,
        signatures: [],
      },
    });
  }

  /**
   * List actas for the agency with optional filters.
   */
  async findAll(
    agencyId: string,
    query?: { type?: string; status?: string; consignacionId?: string },
  ) {
    return this.prisma.actaEntrega.findMany({
      where: {
        agencyId,
        ...(query?.type ? { type: query.type as any } : {}),
        ...(query?.status ? { status: query.status as any } : {}),
        ...(query?.consignacionId
          ? { consignacionId: query.consignacionId }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single acta by ID, scoped to agency.
   */
  async findOne(agencyId: string, id: string) {
    const acta = await this.prisma.actaEntrega.findFirst({
      where: { id, agencyId },
      include: {
        consignacion: {
          select: { id: true, propertyTitle: true },
        },
        propietario: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!acta) {
      throw new NotFoundException(`Acta with ID ${id} not found`);
    }

    return acta;
  }

  /**
   * Update an acta's fields.
   * If rooms or items are being set, transitions status from ACTA_DRAFT to ACTA_IN_PROGRESS.
   */
  async update(agencyId: string, id: string, dto: UpdateActaDto) {
    const acta = await this.prisma.actaEntrega.findFirst({
      where: { id, agencyId },
    });

    if (!acta) {
      throw new NotFoundException(`Acta with ID ${id} not found`);
    }

    // Determine if we should transition to IN_PROGRESS
    const shouldProgress =
      acta.status === ActaStatus.ACTA_DRAFT &&
      (dto.rooms !== undefined || dto.items !== undefined);

    return this.prisma.actaEntrega.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.consignacionId !== undefined && {
          consignacionId: dto.consignacionId,
        }),
        ...(dto.leaseId !== undefined && { leaseId: dto.leaseId }),
        ...(dto.propietarioId !== undefined && {
          propietarioId: dto.propietarioId,
        }),
        ...(dto.agenteUserId !== undefined && {
          agenteUserId: dto.agenteUserId,
        }),
        ...(dto.propertyTitle !== undefined && {
          propertyTitle: dto.propertyTitle,
        }),
        ...(dto.propertyAddress !== undefined && {
          propertyAddress: dto.propertyAddress,
        }),
        ...(dto.tenantName !== undefined && { tenantName: dto.tenantName }),
        ...(dto.generalCondition !== undefined && {
          generalCondition: dto.generalCondition,
        }),
        ...(dto.generalObservations !== undefined && {
          generalObservations: dto.generalObservations,
        }),
        ...(dto.depositAmount !== undefined && {
          depositAmount: dto.depositAmount,
        }),
        ...(dto.rooms !== undefined && { rooms: dto.rooms }),
        ...(dto.items !== undefined && { items: dto.items }),
        ...(dto.meterReadings !== undefined && {
          meterReadings: dto.meterReadings,
        }),
        ...(dto.keysDelivered !== undefined && {
          keysDelivered: dto.keysDelivered,
        }),
        ...(dto.deductions !== undefined && { deductions: dto.deductions }),
        ...(dto.depositToReturn !== undefined && {
          depositToReturn: dto.depositToReturn,
        }),
        ...(dto.photoUrls !== undefined && { photoUrls: dto.photoUrls }),
        ...(shouldProgress && { status: ActaStatus.ACTA_IN_PROGRESS }),
      },
    });
  }

  /**
   * Add a signature to the acta's signatures JSON array.
   * - First signature: set status to PENDING_SIGNATURES.
   * - When 2+ signatures: set status to ACTA_COMPLETED.
   */
  async sign(agencyId: string, id: string, dto: SignActaDto) {
    const acta = await this.prisma.actaEntrega.findFirst({
      where: { id, agencyId },
    });

    if (!acta) {
      throw new NotFoundException(`Acta with ID ${id} not found`);
    }

    const signatures = (acta.signatures as any[]) || [];
    const newSignature = {
      signerName: dto.signerName,
      signerEmail: dto.signerEmail,
      signerRole: dto.signerRole ?? null,
      signedAt: new Date().toISOString(),
    };
    signatures.push(newSignature);

    // Determine new status based on signature count
    let newStatus: ActaStatus;
    if (signatures.length >= 2) {
      newStatus = ActaStatus.ACTA_COMPLETED;
    } else {
      newStatus = ActaStatus.PENDING_SIGNATURES;
    }

    return this.prisma.actaEntrega.update({
      where: { id },
      data: {
        signatures,
        status: newStatus,
      },
    });
  }

  /**
   * Delete an acta. Only allowed if status is ACTA_DRAFT.
   */
  async remove(agencyId: string, id: string) {
    const acta = await this.prisma.actaEntrega.findFirst({
      where: { id, agencyId },
    });

    if (!acta) {
      throw new NotFoundException(`Acta with ID ${id} not found`);
    }

    if (acta.status !== ActaStatus.ACTA_DRAFT) {
      throw new BadRequestException(
        'Only draft actas can be deleted',
      );
    }

    return this.prisma.actaEntrega.delete({
      where: { id },
    });
  }
}
