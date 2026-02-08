import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaseDocumentType } from '../../common/enums/index.js';

/**
 * DTO for lease document upload metadata.
 * File itself comes via multipart/form-data.
 */
export class UploadLeaseDocumentDto {
  @ApiProperty({
    enum: LeaseDocumentType,
    description: 'Type of document being uploaded',
    example: 'DELIVERY_INVENTORY',
  })
  @IsEnum(LeaseDocumentType)
  type!: LeaseDocumentType;
}
