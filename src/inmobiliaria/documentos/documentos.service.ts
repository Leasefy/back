import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AgencyDocumentStatus } from '../../common/enums/agency-document-status.enum.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { GenerateDocumentDto } from './dto/generate-document.dto.js';
import { SignDocumentDto } from './dto/sign-document.dto.js';

@Injectable()
export class DocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Templates ──────────────────────────────────────────────

  /**
   * List all active templates for an agency.
   * Optionally filter by category.
   */
  async getTemplates(agencyId: string, category?: string) {
    return this.prisma.agencyDocumentTemplate.findMany({
      where: {
        agencyId,
        isActive: true,
        ...(category ? { category: category as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single template by ID, scoped to agency.
   */
  async getTemplate(agencyId: string, id: string) {
    const template = await this.prisma.agencyDocumentTemplate.findFirst({
      where: { id, agencyId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Create a new document template for the agency.
   */
  async createTemplate(agencyId: string, dto: CreateTemplateDto) {
    return this.prisma.agencyDocumentTemplate.create({
      data: {
        agencyId,
        name: dto.name,
        category: dto.category,
        version: dto.version ?? '1.0',
        content: dto.content,
        variables: dto.variables ?? [],
      },
    });
  }

  /**
   * Update an existing template. Only provided fields are updated.
   */
  async updateTemplate(
    agencyId: string,
    id: string,
    dto: Partial<CreateTemplateDto>,
  ) {
    const template = await this.prisma.agencyDocumentTemplate.findFirst({
      where: { id, agencyId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return this.prisma.agencyDocumentTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
      },
    });
  }

  /**
   * Soft-delete a template by setting isActive to false.
   */
  async deleteTemplate(agencyId: string, id: string) {
    const template = await this.prisma.agencyDocumentTemplate.findFirst({
      where: { id, agencyId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return this.prisma.agencyDocumentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Documents ──────────────────────────────────────────────

  /**
   * List generated documents for an agency.
   * Optionally filter by consignacionId and/or status.
   */
  async getDocuments(
    agencyId: string,
    query?: { consignacionId?: string; status?: string },
  ) {
    return this.prisma.agencyDocument.findMany({
      where: {
        agencyId,
        ...(query?.consignacionId
          ? { consignacionId: query.consignacionId }
          : {}),
        ...(query?.status ? { status: query.status as any } : {}),
      },
      include: {
        template: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single document by ID, scoped to agency.
   */
  async getDocument(agencyId: string, id: string) {
    const document = await this.prisma.agencyDocument.findFirst({
      where: { id, agencyId },
      include: {
        template: { select: { id: true, name: true, category: true } },
        consignacion: {
          select: { id: true, propertyTitle: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  /**
   * Generate a document from a template or raw content.
   * If templateId is provided, the template content is used as the base.
   * Otherwise, the raw content from the DTO is used.
   */
  async generateDocument(agencyId: string, dto: GenerateDocumentDto) {
    let content = dto.content ?? '';

    // If a template is specified, use its content as the base
    if (dto.templateId) {
      const template = await this.prisma.agencyDocumentTemplate.findFirst({
        where: { id: dto.templateId, agencyId },
      });

      if (!template) {
        throw new NotFoundException(
          `Template with ID ${dto.templateId} not found`,
        );
      }

      content = template.content;
    }

    return this.prisma.agencyDocument.create({
      data: {
        agencyId,
        templateId: dto.templateId ?? null,
        consignacionId: dto.consignacionId ?? null,
        name: dto.name,
        content,
        status: AgencyDocumentStatus.DOC_DRAFT,
        signatures: [],
      },
      include: {
        template: { select: { id: true, name: true, category: true } },
      },
    });
  }

  /**
   * Add a signature to a document's signatures JSON array.
   * If after adding the signature, the count reaches 2 (typical: both parties),
   * the document status is updated to DOC_SIGNED.
   */
  async signDocument(agencyId: string, id: string, dto: SignDocumentDto) {
    const document = await this.prisma.agencyDocument.findFirst({
      where: { id, agencyId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const signatures = (document.signatures as any[]) || [];
    const newSignature = {
      signerName: dto.signerName,
      signerEmail: dto.signerEmail,
      signedAt: new Date().toISOString(),
    };
    signatures.push(newSignature);

    // If 2 or more signatures, consider it fully signed
    const newStatus =
      signatures.length >= 2
        ? AgencyDocumentStatus.DOC_SIGNED
        : AgencyDocumentStatus.PENDING_SIGNATURE;

    return this.prisma.agencyDocument.update({
      where: { id },
      data: {
        signatures,
        status: newStatus,
      },
    });
  }
}
