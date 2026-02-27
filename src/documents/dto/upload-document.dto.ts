import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  DocumentType,
  normalizeDocumentType,
} from '../../common/enums/document-type.enum.js';

/**
 * DTO for document upload metadata.
 * File itself comes via multipart/form-data.
 * Accepts both frontend lowercase (id_document) and backend uppercase (ID_DOCUMENT).
 */
export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document being uploaded',
    example: 'id_document',
  })
  @IsString()
  @Transform(({ value }) => normalizeDocumentType(value))
  type!: DocumentType;
}

/**
 * Response DTO for uploaded document.
 */
export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id!: string;

  @ApiProperty({ enum: DocumentType })
  type!: DocumentType;

  @ApiProperty({ description: 'Original filename' })
  originalName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  size!: number;

  @ApiProperty({ description: 'When document was uploaded' })
  createdAt!: Date;
}

/**
 * Response DTO for signed URL.
 */
export class SignedUrlResponseDto {
  @ApiProperty({ description: 'Signed URL for document access' })
  url!: string;

  @ApiProperty({ description: 'URL expiration time' })
  expiresAt!: Date;
}
