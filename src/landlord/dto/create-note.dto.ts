import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating/updating a private landlord note.
 * Notes are only visible to the landlord, not tenants.
 */
export class CreateNoteDto {
  @ApiProperty({
    description: 'Note content (private, not visible to tenant)',
    example: 'Good candidate, stable income. Follow up on Tuesday.',
    maxLength: 5000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content!: string;
}
