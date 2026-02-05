import { IsUUID, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../common/enums/index.js';
import { PseSubscriptionPaymentDto } from './subscription-payment.dto.js';

/**
 * DTO for creating a new subscription.
 * For FREE plans, no PSE data is needed.
 * For paid plans, psePaymentData is required.
 */
export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Plan config ID (UUID)' })
  @IsUUID()
  planId!: string;

  @ApiProperty({
    enum: BillingCycle,
    description: 'Billing cycle: MONTHLY or ANNUAL',
  })
  @IsEnum(BillingCycle)
  cycle!: BillingCycle;

  @ApiPropertyOptional({
    type: PseSubscriptionPaymentDto,
    description: 'PSE payment data (required for paid plans)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PseSubscriptionPaymentDto)
  psePaymentData?: PseSubscriptionPaymentDto;
}
