import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for sending a chat message.
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hola, tengo algunas preguntas sobre el inmueble.',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacio' })
  @MinLength(1, { message: 'El mensaje debe tener al menos 1 caracter' })
  @MaxLength(2000, { message: 'El mensaje no puede exceder 2000 caracteres' })
  content!: string;
}
