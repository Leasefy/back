import { ApiProperty } from '@nestjs/swagger';
import { LeaseDocumentType } from '../../common/enums/index.js';

/**
 * Response DTO for lease document.
 */
export class LeaseDocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id!: string;

  @ApiProperty({ enum: LeaseDocumentType, description: 'Document type' })
  type!: LeaseDocumentType;

  @ApiProperty({ description: 'File name' })
  fileName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType!: string;

  @ApiProperty({ description: 'User ID who uploaded the document' })
  uploadedBy!: string;

  @ApiProperty({ description: 'When document was uploaded' })
  createdAt!: Date;
}

/**
 * Response DTO for signed URL.
 */
export class LeaseDocumentSignedUrlDto {
  @ApiProperty({ description: 'Signed URL for document access' })
  url!: string;

  @ApiProperty({ description: 'URL expiration time' })
  expiresAt!: Date;
}
