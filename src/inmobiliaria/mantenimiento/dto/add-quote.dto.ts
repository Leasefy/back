import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddQuoteDto {
  @ApiProperty({ description: 'Name of the service provider' })
  @IsString()
  providerName!: string;

  @ApiPropertyOptional({ description: 'Provider phone number' })
  @IsOptional()
  @IsString()
  providerPhone?: string;

  @ApiProperty({ description: 'Quoted amount in COP', minimum: 0 })
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Description of the quoted work' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Estimated days to complete', minimum: 1 })
  @IsInt()
  @Min(1)
  estimatedDays!: number;
}
