import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationDocument } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { DocumentType, ApplicationStatus } from '../common/enums/index.js';
import { ApplicationEventService } from '../applications/events/application-event.service.js';

/**
 * Service for document operations.
 * Handles upload, validation, storage, and signed URL generation.
 */
@Injectable()
export class DocumentsService {
  private supabase: SupabaseClient;

  private readonly BUCKET_NAME = 'application-documents';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private readonly URL_EXPIRY_SECONDS = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventService: ApplicationEventService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  /**
   * Upload a document for an application.
   * Validates ownership, status, file type (magic numbers), and size.
   */
  async upload(
    applicationId: string,
    tenantId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ): Promise<ApplicationDocument> {
    // Get application and validate
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    if (application.tenantId !== tenantId) {
      throw new ForbiddenException('You do not own this application');
    }

    // Allow upload in DRAFT (initial wizard) or NEEDS_INFO (landlord requested more docs)
    const allowedStatuses: string[] = [ApplicationStatus.DRAFT, ApplicationStatus.NEEDS_INFO];
    if (!allowedStatuses.includes(application.status)) {
      throw new BadRequestException(
        'Can only upload documents to draft or needs-info applications',
      );
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate file type using magic numbers (not extension)
    const detectedMime = await this.detectMimeType(file.buffer);
    if (!detectedMime || !this.ALLOWED_MIME_TYPES.includes(detectedMime)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: PDF, JPEG, PNG, WebP. Detected: ${detectedMime ?? 'unknown'}`,
      );
    }

    // Generate storage path: applicationId/documentType/timestamp-random.ext
    const ext = this.getExtensionFromMime(detectedMime);
    const storagePath = `${applicationId}/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage (private bucket)
    const { error: uploadError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(`Failed to upload document: ${uploadError.message}`);
    }

    // Create database record
    const document = await this.prisma.applicationDocument.create({
      data: {
        applicationId,
        type,
        storagePath,
        originalName: file.originalname,
        mimeType: detectedMime,
        size: file.size,
      },
    });

    // Update application currentStep if on step 5
    if (application.currentStep <= 5) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { currentStep: 5 },
      });
    }

    // Log event
    await this.eventService.logDocumentUploaded(applicationId, tenantId, type, document.id);

    return document;
  }

  /**
   * Delete a document from an application.
   */
  async delete(
    applicationId: string,
    documentId: string,
    tenantId: string,
  ): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    if (application.tenantId !== tenantId) {
      throw new ForbiddenException('You do not own this application');
    }

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('Can only delete documents from draft applications');
    }

    const document = await this.prisma.applicationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.applicationId !== applicationId) {
      throw new NotFoundException('Document not found');
    }

    // Delete from storage
    const { error: deleteError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([document.storagePath]);

    if (deleteError) {
      console.error('Failed to delete from storage:', deleteError);
      // Continue to delete from database anyway
    }

    // Delete from database
    await this.prisma.applicationDocument.delete({
      where: { id: documentId },
    });

    // Log event
    await this.eventService.logDocumentDeleted(applicationId, tenantId, documentId);
  }

  /**
   * Get a signed URL for document access.
   * Only tenant owner or property landlord can access.
   */
  async getSignedUrl(
    applicationId: string,
    documentId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: { landlordId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Only tenant or landlord can access documents
    const isOwner = application.tenantId === userId;
    const isLandlord = application.property.landlordId === userId;

    if (!isOwner && !isLandlord) {
      throw new ForbiddenException('You do not have access to this document');
    }

    const document = await this.prisma.applicationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.applicationId !== applicationId) {
      throw new NotFoundException('Document not found');
    }

    // Generate signed URL
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(document.storagePath, this.URL_EXPIRY_SECONDS);

    if (error || !data) {
      throw new BadRequestException(`Failed to generate document URL: ${error?.message}`);
    }

    const expiresAt = new Date(Date.now() + this.URL_EXPIRY_SECONDS * 1000);

    return {
      url: data.signedUrl,
      expiresAt,
    };
  }

  /**
   * Get all documents for an application.
   */
  async findByApplication(applicationId: string): Promise<ApplicationDocument[]> {
    return this.prisma.applicationDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Detect MIME type from file buffer using magic numbers.
   * Uses dynamic import for ESM-only file-type library.
   */
  private async detectMimeType(buffer: Buffer): Promise<string | undefined> {
    const { fileTypeFromBuffer } = await import('file-type');
    const result = await fileTypeFromBuffer(buffer);
    return result?.mime;
  }

  /**
   * Get file extension from MIME type.
   */
  private getExtensionFromMime(mime: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return mimeToExt[mime] ?? 'bin';
  }
}
