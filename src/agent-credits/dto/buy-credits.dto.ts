import { IsInt, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PseSubscriptionPaymentDto } from '../../subscriptions/dto/subscription-payment.dto.js';
import { VALID_PACK_SIZES } from '../constants/credit-packs.js';

export class BuyCreditsDto {
  @ApiProperty({
    enum: [1, 5, 10, 20],
    description: 'Cantidad de creditos a comprar',
    example: 5,
  })
  @IsInt()
  @IsIn([...VALID_PACK_SIZES])
  packSize!: number;

  @ApiProperty({
    type: PseSubscriptionPaymentDto,
    description: 'Datos de pago PSE',
  })
  @ValidateNested()
  @Type(() => PseSubscriptionPaymentDto)
  psePaymentData!: PseSubscriptionPaymentDto;
}
