import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/enums/index.js';

/**
 * Response DTO for payment data
 */
export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  id!: string;

  @ApiProperty({ description: 'Lease ID' })
  leaseId!: string;

  @ApiProperty({ description: 'Amount in COP' })
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used' })
  method!: PaymentMethod;

  @ApiProperty({ description: 'Payment reference number' })
  referenceNumber!: string;

  @ApiProperty({ description: 'Date payment was made' })
  paymentDate!: Date;

  @ApiProperty({ description: 'Month this payment covers (1-12)' })
  periodMonth!: number;

  @ApiProperty({ description: 'Year this payment covers' })
  periodYear!: number;

  @ApiPropertyOptional({ description: 'Optional notes' })
  notes?: string | null;

  @ApiProperty({ description: 'Who recorded this payment' })
  recordedBy!: string;

  @ApiProperty({ description: 'When payment was recorded' })
  createdAt!: Date;
}
