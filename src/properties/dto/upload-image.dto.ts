import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for image upload operations.
 * Validation happens in multer file filter, not DTO.
 */
export class UploadImageResponseDto {
  @ApiProperty({ description: 'Unique image identifier' })
  id!: string;

  @ApiProperty({ description: 'Public URL of the uploaded image' })
  url!: string;

  @ApiProperty({ description: 'Order index (0 = thumbnail)' })
  order!: number;
}
