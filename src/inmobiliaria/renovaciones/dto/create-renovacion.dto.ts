import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRenovacionDto {
  @ApiProperty({ description: 'Consignacion ID' })
  @IsUUID()
  consignacionId!: string;

  @ApiPropertyOptional({ description: 'Lease ID to link the renewal to' })
  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @ApiPropertyOptional({ description: 'Assigned agent user ID' })
  @IsOptional()
  @IsUUID()
  agenteUserId?: string;
}
