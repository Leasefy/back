import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../agency/guards/agency-member.guard.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { AgentesService } from './agentes.service.js';

/**
 * Controller for inmobiliaria agent management.
 * Returns Agente objects with computed metrics for the frontend dashboard.
 */
@ApiTags('inmobiliaria/agentes')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard)
@Controller('inmobiliaria/agentes')
export class AgentesController {
  constructor(private readonly agentesService: AgentesService) {}

  /**
   * GET /inmobiliaria/agentes
   * List all active agents in the agency with metrics.
   */
  @Get()
  @ApiOperation({ summary: 'List all agents with metrics' })
  @ApiOkResponse({ description: 'Array of agents wrapped in { data }' })
  async findAll(@CurrentAgency('agencyId') agencyId: string) {
    const data = await this.agentesService.findAll(agencyId);
    return { data };
  }

  /**
   * GET /inmobiliaria/agentes/leaderboard
   * List agents sorted by commissions this month (descending).
   * Must be defined BEFORE /:id to avoid route conflict.
   */
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get agent leaderboard sorted by commissions' })
  @ApiOkResponse({ description: 'Array of agents wrapped in { data }' })
  async getLeaderboard(@CurrentAgency('agencyId') agencyId: string) {
    const data = await this.agentesService.getLeaderboard(agencyId);
    return { data };
  }

  /**
   * GET /inmobiliaria/agentes/:id
   * Get a single agent with full metrics.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get agent detail' })
  @ApiOkResponse({ description: 'Agent with metrics' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentesService.findOne(agencyId, id);
  }

  /**
   * GET /inmobiliaria/agentes/:id/metrics
   * Get computed metrics for a specific agent.
   */
  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get agent metrics' })
  @ApiOkResponse({ description: 'Agent metrics object' })
  async getMetrics(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentesService.getMetrics(agencyId, id);
  }

  /**
   * GET /inmobiliaria/agentes/:id/consignaciones
   * Get all property consignations assigned to the agent.
   */
  @Get(':id/consignaciones')
  @ApiOperation({ summary: 'Get consignaciones assigned to agent' })
  @ApiOkResponse({ description: 'Array of consignaciones wrapped in { data }' })
  async getConsignaciones(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.agentesService.getConsignaciones(agencyId, id);
    return { data };
  }

  /**
   * GET /inmobiliaria/agentes/:id/pipeline
   * Get pipeline items assigned to the agent.
   */
  @Get(':id/pipeline')
  @ApiOperation({ summary: 'Get pipeline items assigned to agent' })
  @ApiOkResponse({ description: 'Array of pipeline items wrapped in { data }' })
  async getPipeline(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.agentesService.getPipeline(agencyId, id);
    return { data };
  }
}
