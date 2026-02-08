import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ActivityLogService } from './activity-log.service.js';
import { GetActivitiesDto, PaginatedActivitiesResponseDto } from './dto/index.js';

/**
 * Controller for the unified activity feed.
 * Any authenticated user can view their own activity log.
 * No @Roles() decorator - all roles have access.
 */
@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * GET /activities
   * Returns a paginated activity feed for the authenticated user.
   * Supports cursor-based pagination and filtering by propertyId and activity types.
   */
  @Get()
  @ApiOperation({ summary: 'Obtener feed de actividades del usuario autenticado' })
  @ApiOkResponse({
    description: 'Lista paginada de actividades con cursor',
    type: PaginatedActivitiesResponseDto,
  })
  async getActivities(
    @CurrentUser('id') userId: string,
    @Query() dto: GetActivitiesDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    return this.activityLogService.getActivities(userId, dto);
  }
}
