import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { RecommendationsService } from './recommendations.service.js';
import { GetRecommendationsDto } from './dto/index.js';

/**
 * Controller for tenant property recommendations.
 * All endpoints require TENANT role.
 *
 * Provides personalized property recommendations based on:
 * - Affordability (rent-to-income ratio)
 * - Risk fit (tenant risk score)
 * - Profile strength (completeness)
 * - Preferences (city, bedrooms, type, budget)
 */
@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * GET /recommendations
   * Get personalized property recommendations with match scores.
   * Supports sorting, probability filtering, and pagination.
   *
   * Only properties with matchScore >= 40 are returned.
   * Only AVAILABLE properties are included (excludes DRAFT, PENDING, RENTED).
   */
  @Get()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get personalized property recommendations' })
  @ApiOkResponse({
    description: 'Paginated list of recommended properties with match data',
  })
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @Query() query: GetRecommendationsDto,
  ) {
    return this.recommendationsService.getRecommendations(userId, query);
  }

  /**
   * GET /recommendations/top
   * Get the single best matching property.
   * Returns null if no properties meet minimum threshold (>=40).
   *
   * IMPORTANT: This route must come BEFORE any :id params to avoid routing conflicts.
   */
  @Get('top')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get top recommendation (best match)' })
  @ApiOkResponse({
    description: 'Single best matching property or null',
  })
  async getTopRecommendation(@CurrentUser('id') userId: string) {
    return this.recommendationsService.getTopRecommendation(userId);
  }

  /**
   * GET /recommendations/property/:propertyId/match-score
   * Get match score and breakdown for a specific property.
   *
   * Useful for showing detailed match analysis on property detail pages.
   */
  @Get('property/:propertyId/match-score')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get match score for specific property' })
  @ApiOkResponse({
    description: 'Match result with score, probability, factors, and recommendation',
  })
  async getPropertyMatchScore(
    @CurrentUser('id') userId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.recommendationsService.getPropertyMatchScore(
      userId,
      propertyId,
    );
  }
}
