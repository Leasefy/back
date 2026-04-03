import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../agency/guards/agency-member.guard.js';
import { AgencyPermissionGuard } from '../agency/guards/agency-permission.guard.js';
import { RequirePermission } from '../agency/decorators/require-permission.decorator.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { AnalyticsService } from './analytics.service.js';

/**
 * Controller for inmobiliaria analytics.
 * All endpoints scoped to agency via AgencyMemberGuard.
 */
@ApiTags('inmobiliaria/analytics')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /inmobiliaria/analytics/kpis
   * Return 8 KPIs for the agency.
   */
  @Get('kpis')
  @RequirePermission('analytics', 'view')
  @ApiOperation({ summary: 'Get agency KPIs' })
  @ApiOkResponse({ description: 'Array of 8 KPI objects' })
  async getKpis(@CurrentAgency('agencyId') agencyId: string) {
    return this.analyticsService.getKpis(agencyId);
  }

  /**
   * GET /inmobiliaria/analytics/charts
   * Return chart data for revenue, occupancy, collections, and pipeline.
   */
  @Get('charts')
  @RequirePermission('analytics', 'view')
  @ApiOperation({ summary: 'Get chart data' })
  @ApiOkResponse({ description: 'Chart datasets for the agency' })
  async getCharts(@CurrentAgency('agencyId') agencyId: string) {
    return this.analyticsService.getCharts(agencyId);
  }

  /**
   * GET /inmobiliaria/analytics/trends/:metricId
   * Return monthly trend data for a specific metric over 12 months.
   */
  @Get('trends/:metricId')
  @RequirePermission('analytics', 'view')
  @ApiOperation({ summary: 'Get metric trend (12 months)' })
  @ApiOkResponse({ description: 'Monthly data points for the metric' })
  async getTrend(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('metricId') metricId: string,
  ) {
    return this.analyticsService.getTrend(agencyId, metricId);
  }

  /**
   * GET /inmobiliaria/analytics/forecast/:metricId
   * Simple linear projection: 6 months historical + 3 months projected.
   */
  @Get('forecast/:metricId')
  @RequirePermission('analytics', 'view')
  @ApiOperation({ summary: 'Get metric forecast (linear projection)' })
  @ApiOkResponse({ description: 'Historical and projected data points' })
  async getForecast(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('metricId') metricId: string,
  ) {
    return this.analyticsService.getForecast(agencyId, metricId);
  }
}
