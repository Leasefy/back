import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAgentDto {
  @ApiProperty({ description: 'User ID of the agent to assign' })
  @IsUUID()
  agenteUserId!: string;
}
