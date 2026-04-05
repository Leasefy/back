import { ApiProperty } from '@nestjs/swagger';

export class CanonTrackingItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() consignacionId!: string;
  @ApiProperty() canonAmount!: number;
  @ApiProperty() leasifyFee!: number;
  @ApiProperty() month!: string;
  @ApiProperty() source!: string;
  @ApiProperty({ nullable: true }) pseTransactionId!: string | null;
  @ApiProperty({ nullable: true }) paymentReference!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class FlexBillingDashboardDto {
  @ApiProperty({ description: 'Total canon administrado (COP)' })
  canonTotal!: number;

  @ApiProperty({ description: 'Total fee Leasify (1% del canon, COP)' })
  leasifyFeeTotal!: number;

  @ApiProperty({ description: 'Cobro estimado = leasifyFeeTotal' })
  estimatedCharge!: number;

  @ApiProperty({ description: 'Cantidad de registros de canon' })
  recordCount!: number;

  @ApiProperty({ type: [CanonTrackingItemDto], description: 'Historial reciente (hasta 12)' })
  history!: CanonTrackingItemDto[];
}
