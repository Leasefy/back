import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for PSE mock payment response.
 * Contains transaction result and optional payment request ID.
 *
 * Requirement: TPAY-08
 */
export class PseMockResponseDto {
  @ApiProperty({ description: 'Transaction ID (PSE-timestamp-random)' })
  transactionId!: string;

  @ApiProperty({
    enum: ['SUCCESS', 'FAILURE', 'PENDING'],
    description: 'Transaction status',
  })
  status!: 'SUCCESS' | 'FAILURE' | 'PENDING';

  @ApiProperty({ description: 'Status message in Spanish' })
  message!: string;

  @ApiProperty({ description: 'Bank display name' })
  bankName!: string;

  @ApiProperty({ description: 'Transaction timestamp' })
  timestamp!: Date;

  @ApiPropertyOptional({
    description: 'Payment request ID if created (SUCCESS only)',
  })
  paymentRequestId?: string;
}
