import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning an agent to a property.
 * The agent is identified by email address.
 */
export class AssignAgentDto {
  @ApiProperty({
    description: 'Email address of the agent to assign',
    example: 'agent@example.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email valido' })
  @IsNotEmpty({ message: 'El email del agente es requerido' })
  email!: string;
}
