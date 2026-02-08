import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import { Role } from '../common/enums/index.js';
import { TenantDashboardService } from './services/tenant-dashboard.service.js';
import { TenantDashboardResponseDto } from './dto/tenant-dashboard-response.dto.js';

/**
 * TenantDashboardController
 *
 * Endpoint for tenant dashboard aggregated statistics.
 * Returns lease summary, payment status, upcoming visit, and pending applications.
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('tenants/me/dashboard')
@Roles(Role.TENANT)
export class TenantDashboardController {
  constructor(
    private readonly tenantDashboardService: TenantDashboardService,
  ) {}

  /**
   * Get tenant dashboard aggregated stats.
   * Returns lease info, payment status, upcoming visit, and pending applications.
   * Handles tenants without active lease gracefully.
   */
  @Get()
  @ApiOperation({ summary: 'Get tenant dashboard aggregated stats' })
  @ApiOkResponse({
    description: 'Tenant dashboard data',
    type: TenantDashboardResponseDto,
  })
  async getDashboard(
    @CurrentUser('id') tenantId: string,
  ): Promise<TenantDashboardResponseDto> {
    return this.tenantDashboardService.getDashboard(tenantId);
  }
}
