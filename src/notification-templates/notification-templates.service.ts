import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { NotificationTemplate } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/index.js';

@Injectable()
export class NotificationTemplatesService {
  private readonly logger = new Logger(NotificationTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification template.
   */
  async create(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Check for duplicate code
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Template with code '${dto.code}' already exists`,
      );
    }

    const template = await this.prisma.notificationTemplate.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        emailSubject: dto.emailSubject,
        emailBody: dto.emailBody,
        pushTitle: dto.pushTitle,
        pushBody: dto.pushBody,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Created template: ${template.code}`);
    return template;
  }

  /**
   * Get all templates.
   */
  async findAll(): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get template by ID.
   */
  async findById(id: string): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return template;
  }

  /**
   * Get template by code.
   */
  async findByCode(code: string): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${code}`);
    }

    return template;
  }

  /**
   * Update a template.
   */
  async update(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    // Verify template exists
    await this.findById(id);

    // If code is being changed, check for conflicts
    if (dto.code) {
      const existing = await this.prisma.notificationTemplate.findFirst({
        where: {
          code: dto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Template with code '${dto.code}' already exists`,
        );
      }
    }

    const template = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.emailSubject && { emailSubject: dto.emailSubject }),
        ...(dto.emailBody && { emailBody: dto.emailBody }),
        ...(dto.pushTitle && { pushTitle: dto.pushTitle }),
        ...(dto.pushBody && { pushBody: dto.pushBody }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Updated template: ${template.code}`);
    return template;
  }

  /**
   * Delete a template.
   */
  async delete(id: string): Promise<void> {
    const template = await this.findById(id);

    await this.prisma.notificationTemplate.delete({
      where: { id },
    });

    this.logger.log(`Deleted template: ${template.code}`);
  }

  /**
   * Toggle template active status.
   */
  async toggleActive(id: string): Promise<NotificationTemplate> {
    const template = await this.findById(id);

    const updated = await this.prisma.notificationTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });

    this.logger.log(
      `Template ${updated.code} is now ${updated.isActive ? 'active' : 'inactive'}`,
    );
    return updated;
  }
}
