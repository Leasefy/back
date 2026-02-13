import { IsEnum, IsOptional, IsNumber, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RenovacionStatus } from '../../../common/enums/renovacion-status.enum.js';

export class UpdateRenovacionStageDto {
  @ApiProperty({ description: 'New renewal status', enum: RenovacionStatus })
  @IsEnum(RenovacionStatus)
  status!: RenovacionStatus;

  @ApiPropertyOptional({ description: 'IPC rate for rent adjustment' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ipcRate?: number;

  @ApiPropertyOptional({ description: 'Proposed new rent amount in COP' })
  @IsOptional()
  @IsInt()
  @Min(0)
  proposedRent?: number;

  @ApiPropertyOptional({ description: 'Negotiated rent amount in COP' })
  @IsOptional()
  @IsInt()
  @Min(0)
  negotiatedRent?: number;

  @ApiPropertyOptional({ description: 'Note to add to renewal history' })
  @IsOptional()
  @IsString()
  historyNote?: string;
}
