import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../../common/enums/index.js';

export class ActivityResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: ActivityType, example: ActivityType.APPLICATION_SUBMITTED })
  type!: ActivityType;

  @ApiProperty({ example: 'Application' })
  resourceType!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  resourceId!: string;

  @ApiProperty({ example: 'Juan Perez' })
  actorName!: string;

  @ApiProperty({ example: { propertyId: '...', status: 'SUBMITTED' } })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2026-02-08T12:00:00.000Z' })
  createdAt!: Date;
}

export class PaginatedActivitiesResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] })
  items!: ActivityResponseDto[];

  @ApiProperty({ example: '2026-02-08T11:59:00.000Z', nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}
