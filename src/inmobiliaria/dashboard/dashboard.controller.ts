import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../agency/guards/agency-member.guard.js';
import { AgencyPermissionGuard } from '../agency/guards/agency-permission.guard.js';
import { RequirePermission } from '../agency/decorators/require-permission.decorator.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { DashboardService } from './dashboard.service.js';

/**
 * Controller for the main inmobiliaria dashboard.
 * All endpoints scoped to agency via AgencyMemberGuard.
 */
@ApiTags('inmobiliaria/dashboard')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /inmobiliaria/dashboard/kpis
   * Aggregated dashboard KPIs (properties, revenue, pipeline, agents).
   */
  @Get('kpis')
  @RequirePermission('dashboard', 'view')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiOkResponse({ description: 'Aggregated dashboard metrics' })
  async getDashboardKpis(@CurrentAgency('agencyId') agencyId: string) {
    return this.dashboardService.getDashboardKpis(agencyId);
  }

  /**
   * GET /inmobiliaria/dashboard/quick-stats
   * Urgent counts requiring attention (maintenance, signatures, expirations, overdue).
   */
  @Get('quick-stats')
  @RequirePermission('dashboard', 'view')
  @ApiOperation({ summary: 'Get quick stats (urgent counts)' })
  @ApiOkResponse({ description: 'Counts of items requiring attention' })
  async getQuickStats(@CurrentAgency('agencyId') agencyId: string) {
    return this.dashboardService.getQuickStats(agencyId);
  }

  /**
   * GET /inmobiliaria/dashboard/activity
   * Recent activity across cobros, pipeline, and maintenance.
   */
  @Get('activity')
  @RequirePermission('dashboard', 'view')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiOkResponse({ description: 'Mixed list of recent changes sorted by date' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getRecentActivity(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentActivity(agencyId, parsedLimit);
  }
}
