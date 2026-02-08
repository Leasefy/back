import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import { Role } from '../common/enums/index.js';
import { LandlordDashboardService } from './services/landlord-dashboard.service.js';
import { LandlordDashboardResponseDto } from './dto/landlord-dashboard-response.dto.js';

/**
 * LandlordDashboardController
 *
 * Endpoint for landlord dashboard aggregated statistics.
 * Agents get access via RolesGuard automatic AGENT->LANDLORD mapping.
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('landlord/dashboard')
@Roles(Role.LANDLORD)
export class LandlordDashboardController {
  constructor(
    private readonly landlordDashboardService: LandlordDashboardService,
  ) {}

  /**
   * Get landlord dashboard aggregated stats.
   * Returns financial stats, urgent actions, and candidate risk distribution.
   */
  @Get()
  @ApiOperation({ summary: 'Get landlord dashboard aggregated stats' })
  @ApiOkResponse({
    description: 'Landlord dashboard data',
    type: LandlordDashboardResponseDto,
  })
  async getDashboard(
    @CurrentUser('id') landlordId: string,
  ): Promise<LandlordDashboardResponseDto> {
    return this.landlordDashboardService.getDashboard(landlordId);
  }
}
