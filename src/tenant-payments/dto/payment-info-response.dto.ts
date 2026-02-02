import { ApiProperty } from '@nestjs/swagger';
import type { LandlordPaymentMethod } from '@prisma/client';

/**
 * Response DTO for payment information.
 *
 * Returns all info needed for tenant to make a payment:
 * - Lease details (ID, monthly rent, payment day)
 * - Landlord's configured payment methods
 * - Current period (auto-calculated from today)
 *
 * Requirements: TPAY-05
 */
export class PaymentInfoResponseDto {
  @ApiProperty({
    description: 'Lease ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  leaseId!: string;

  @ApiProperty({
    description: 'Monthly rent amount in COP',
    example: 1500000,
  })
  monthlyRent!: number;

  @ApiProperty({
    description: 'Day of month rent is due (1-28)',
    example: 5,
  })
  paymentDay!: number;

  @ApiProperty({
    description: 'Landlord configured payment methods',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        bankName: { type: 'string' },
        accountType: { type: 'string', enum: ['AHORROS', 'CORRIENTE'] },
        accountNumber: { type: 'string' },
        holderName: { type: 'string' },
        phoneNumber: { type: 'string', nullable: true },
        methodType: { type: 'string' },
        instructions: { type: 'string', nullable: true },
      },
    },
  })
  paymentMethods!: Array<{
    id: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    phoneNumber: string | null;
    methodType: string;
    instructions: string | null;
  }>;

  @ApiProperty({
    description: 'Current payment period based on today',
    type: 'object',
    properties: {
      month: { type: 'number', example: 2 },
      year: { type: 'number', example: 2026 },
    },
  })
  currentPeriod!: {
    month: number;
    year: number;
  };
}
