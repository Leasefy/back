import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { AiInsightsService } from './ai-insights.service.js';

@ApiTags('inmobiliaria/ai')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/ai')
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get('activity')
  @RequirePermission('dashboard', 'view')
  @ApiOperation({ summary: 'Historial de actividad de agentes AI' })
  @ApiOkResponse({ description: 'Lista de actividades recientes' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 20)' })
  async getActivity(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.aiInsightsService.getActivity(agencyId, parsedLimit);
  }

  @Get('metrics')
  @RequirePermission('dashboard', 'view')
  @ApiOperation({ summary: 'Metricas de agentes AI (scoring, matching, resumen)' })
  @ApiOkResponse({ description: 'Metricas agregadas de evaluaciones' })
  async getMetrics(
    @CurrentAgency('agencyId') agencyId: string,
  ) {
    return this.aiInsightsService.getMetrics(agencyId);
  }
}
