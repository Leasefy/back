import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ReceiptStorageService
 *
 * Handles receipt file uploads to Supabase Storage.
 * Follows DocumentsService pattern for validation and storage.
 *
 * Key features:
 * - Magic number validation via file-type library
 * - Private bucket with signed URL access
 * - Organized storage: receipts/{leaseId}/{requestId}-{timestamp}.{ext}
 *
 * Requirements: TPAY-06, TPAY-09
 */
@Injectable()
export class ReceiptStorageService {
  private supabase: SupabaseClient;

  private readonly BUCKET_NAME = 'application-documents';
  private readonly RECEIPT_FOLDER = 'receipts';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private readonly URL_EXPIRY_SECONDS = 3600; // 1 hour

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  /**
   * Upload a receipt file to Supabase Storage.
   *
   * @param leaseId - The lease this payment is for
   * @param requestId - The payment request ID
   * @param file - The uploaded file (Multer)
   * @returns Storage path for the uploaded file
   */
  async upload(
    leaseId: string,
    requestId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // 1. Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Receipt file must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // 2. Validate MIME type using magic numbers (not extension)
    const detectedMime = await this.detectMimeType(file.buffer);
    if (!detectedMime || !this.ALLOWED_MIME_TYPES.includes(detectedMime)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: PDF, JPEG, PNG, WebP. Detected: ${detectedMime ?? 'unknown'}`,
      );
    }

    // 3. Generate storage path: receipts/{leaseId}/{requestId}-{timestamp}.{ext}
    const ext = this.getExtensionFromMime(detectedMime);
    const timestamp = Date.now();
    const storagePath = `${this.RECEIPT_FOLDER}/${leaseId}/${requestId}-${timestamp}.${ext}`;

    // 4. Upload to Supabase Storage (private bucket)
    const { error: uploadError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        `Failed to upload receipt: ${uploadError.message}`,
      );
    }

    // 5. Return storage path
    return storagePath;
  }

  /**
   * Generate a signed URL for receipt access.
   *
   * @param storagePath - The storage path of the receipt
   * @returns Signed URL and expiration date
   */
  async getSignedUrl(
    storagePath: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(storagePath, this.URL_EXPIRY_SECONDS);

    if (error || !data) {
      throw new BadRequestException(
        `Failed to generate receipt URL: ${error?.message}`,
      );
    }

    const expiresAt = new Date(Date.now() + this.URL_EXPIRY_SECONDS * 1000);

    return {
      url: data.signedUrl,
      expiresAt,
    };
  }

  /**
   * Delete a receipt from storage.
   *
   * @param storagePath - The storage path to delete
   */
  async delete(storagePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error('Failed to delete receipt from storage:', error);
      // Don't throw - storage cleanup is best effort
    }
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
