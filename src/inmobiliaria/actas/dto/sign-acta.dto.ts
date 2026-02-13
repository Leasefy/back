import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class SignActaDto {
  @ApiProperty({ example: 'Juan Perez', description: 'Name of the signer' })
  @IsString()
  signerName!: string;

  @ApiProperty({ example: 'juan@example.com', description: 'Email of the signer' })
  @IsEmail()
  signerEmail!: string;

  @ApiPropertyOptional({ example: 'propietario', description: 'Role of the signer (e.g., propietario, inquilino, agente)' })
  @IsOptional()
  @IsString()
  signerRole?: string;
}
