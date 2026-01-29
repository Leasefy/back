import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../common/enums/index.js';

/**
 * DTO for document upload metadata.
 * File itself comes via multipart/form-data.
 */
export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document being uploaded',
    example: 'ID_DOCUMENT',
  })
  @IsEnum(DocumentType)
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
