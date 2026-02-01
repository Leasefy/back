import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, MaxLength, Equals } from 'class-validator';

/**
 * SignContractDto
 *
 * DTO for contract signature operations.
 * Captures consent information required for Ley 527/1999 compliance.
 *
 * Requirements: CONT-06, CONT-07, CONT-08
 */
export class SignContractDto {
  @ApiProperty({
    description: 'User explicitly accepts contract terms (must be true)',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the contract terms' })
  acceptedTerms!: boolean;

  @ApiProperty({
    description: 'Consent text shown to and accepted by user',
    example: 'Acepto los terminos y condiciones de este contrato de arrendamiento y confirmo que la informacion proporcionada es veridica.',
  })
  @IsString()
  @MaxLength(500)
  consentText!: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded drawn signature image (optional)',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  @IsString()
  @IsOptional()
  signatureData?: string;
}
