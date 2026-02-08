import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { LeaseDocument } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { LeaseDocumentType } from '../common/enums/index.js';

/**
 * Service for lease document operations.
 * Handles upload, validation, storage, and signed URL generation for lease-related documents.
 */
@Injectable()
export class LeaseDocumentsService {
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
  private readonly STORAGE_FOLDER = 'lease-documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  /**
   * Upload a document for a lease.
   * Validates access (tenant or landlord), file type (magic numbers), and size.
   */
  async upload(
    leaseId: string,
    userId: string,
    type: LeaseDocumentType,
    file: Express.Multer.File,
  ): Promise<LeaseDocument> {
    // Get lease and validate
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found`);
    }

    // Verify user is tenant OR landlord of the lease
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this lease',
      );
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Validate file type using magic numbers (not extension)
    const detectedMime = await this.detectMimeType(file.buffer);
    if (!detectedMime || !this.ALLOWED_MIME_TYPES.includes(detectedMime)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: PDF, JPEG, PNG, WebP. Detected: ${detectedMime ?? 'unknown'}`,
      );
    }

    // Generate storage path: lease-documents/{leaseId}/{timestamp}-{random}.{ext}
    const ext = this.getExtensionFromMime(detectedMime);
    const storagePath = `${this.STORAGE_FOLDER}/${leaseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage (private bucket)
    const { error: uploadError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        `Failed to upload document: ${uploadError.message}`,
      );
    }

    // Create database record
    let document: LeaseDocument;
    try {
      document = await this.prisma.leaseDocument.create({
        data: {
          leaseId,
          uploadedBy: userId,
          type,
          fileName: file.originalname,
          filePath: storagePath,
          fileSize: file.size,
          mimeType: detectedMime,
        },
      });
    } catch (error) {
      // If DB insert fails, delete uploaded file from storage (error handling rollback)
      await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([storagePath]);
      throw error;
    }

    return document;
  }

  /**
   * Get all documents for a lease.
   * Only tenant or landlord can access.
   */
  async findByLease(leaseId: string, userId: string): Promise<LeaseDocument[]> {
    // Find lease and verify access
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found`);
    }

    // Verify user is tenant or landlord
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this lease',
      );
    }

    // Return all documents for lease
    return this.prisma.leaseDocument.findMany({
      where: { leaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a signed URL for document access.
   * Only tenant or landlord can access.
   */
  async getSignedUrl(
    leaseId: string,
    documentId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    // Find lease and verify access
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found`);
    }

    // Verify user is tenant or landlord
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this lease',
      );
    }

    // Find document and verify it belongs to the lease
    const document = await this.prisma.leaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.leaseId !== leaseId) {
      throw new NotFoundException('Document not found');
    }

    // Generate signed URL
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(document.filePath, this.URL_EXPIRY_SECONDS);

    if (error || !data) {
      throw new BadRequestException(
        `Failed to generate document URL: ${error?.message}`,
      );
    }

    const expiresAt = new Date(Date.now() + this.URL_EXPIRY_SECONDS * 1000);

    return {
      url: data.signedUrl,
      expiresAt,
    };
  }

  /**
   * Delete a document from a lease.
   * Only the uploader can delete, and only within 24 hours of upload.
   */
  async delete(
    leaseId: string,
    documentId: string,
    userId: string,
  ): Promise<void> {
    // Find lease (to verify document belongs to a valid lease)
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found`);
    }

    // Find document and verify it belongs to the lease
    const document = await this.prisma.leaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.leaseId !== leaseId) {
      throw new NotFoundException('Document not found');
    }

    // Verify user is the uploader
    if (document.uploadedBy !== userId) {
      throw new ForbiddenException('Only the uploader can delete this document');
    }

    // Check 24-hour deletion window
    const hoursSinceUpload =
      (Date.now() - document.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpload > 24) {
      throw new BadRequestException(
        'Documents can only be deleted within 24 hours of upload',
      );
    }

    // Delete from storage (log error but continue if storage delete fails)
    const { error: deleteError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([document.filePath]);

    if (deleteError) {
      console.error('Failed to delete from storage:', deleteError);
      // Continue to delete from database anyway
    }

    // Delete from database
    await this.prisma.leaseDocument.delete({
      where: { id: documentId },
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
