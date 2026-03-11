import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for invitation info endpoint (public, no auth required).
 * Returns enough context for the invitee to decide whether to accept.
 */
export class InvitationInfoResponseDto {
  @ApiProperty({ description: 'Agency name', example: 'ABC Inmobiliaria' })
  agencyName!: string;

  @ApiProperty({ description: 'Agency city', example: 'Bogotá' })
  agencyCity!: string;

  @ApiProperty({ description: 'Role assigned to the invitee', example: 'AGENTE' })
  role!: string;

  @ApiProperty({
    description: 'Email address the invitation was sent to',
    example: 'juan@example.com',
  })
  invitedEmail!: string;

  @ApiProperty({ description: 'Token expiry date' })
  expiresAt!: Date;
}
