import { IsUUID, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../common/enums/index.js';
import { PseSubscriptionPaymentDto } from './subscription-payment.dto.js';

/**
 * DTO for changing subscription plan mid-cycle.
 * PSE payment data is needed when upgrading to a paid plan.
 */
export class ChangePlanDto {
  @ApiProperty({ description: 'New plan config ID (UUID)' })
  @IsUUID()
  newPlanId!: string;

  @ApiProperty({
    enum: BillingCycle,
    description: 'Billing cycle: MONTHLY or ANNUAL',
  })
  @IsEnum(BillingCycle)
  cycle!: BillingCycle;

  @ApiPropertyOptional({
    type: PseSubscriptionPaymentDto,
    description: 'PSE payment data (required if upgrading to paid plan)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PseSubscriptionPaymentDto)
  psePaymentData?: PseSubscriptionPaymentDto;
}
