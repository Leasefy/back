import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for requesting additional information from candidate.
 * Message specifies what info is needed.
 */
export class RequestInfoDto {
  @ApiProperty({
    description: 'Message specifying what information is needed',
    example: 'Please provide your most recent bank statement (last 3 months).',
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  message!: string;
}
