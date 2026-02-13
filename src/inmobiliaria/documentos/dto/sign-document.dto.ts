import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class SignDocumentDto {
  @ApiProperty({ example: 'Juan Perez', description: 'Name of the signer' })
  @IsString()
  signerName!: string;

  @ApiProperty({ example: 'juan@example.com', description: 'Email of the signer' })
  @IsEmail()
  signerEmail!: string;
}
