import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

/**
 * DTO for reordering property images.
 * First image (index 0) becomes the thumbnail.
 */
export class ReorderImagesDto {
  @ApiProperty({
    example: ['uuid1', 'uuid2', 'uuid3'],
    description:
      'Array of image IDs in desired order. First becomes thumbnail.',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  imageIds!: string[];
}
