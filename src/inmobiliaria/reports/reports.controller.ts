import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
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
import { ReportsService } from './reports.service.js';

/**
 * Controller for inmobiliaria reports.
 * All endpoints scoped to agency via AgencyMemberGuard.
 */
@ApiTags('inmobiliaria/reports')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /inmobiliaria/reports/extracto/:propietarioId
   * Owner monthly statement for a given month.
   */
  @Get('extracto/:propietarioId')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Owner monthly statement (extracto)' })
  @ApiOkResponse({ description: 'Owner statement with line items and totals' })
  @ApiQuery({ name: 'month', required: true, example: '2026-02' })
  async getExtractoPropietario(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('propietarioId', ParseUUIDPipe) propietarioId: string,
    @Query('month') month: string,
  ) {
    return this.reportsService.getExtractoPropietario(
      agencyId,
      propietarioId,
      month,
    );
  }

  /**
   * GET /inmobiliaria/reports/cartera
   * Aging analysis of pending/late collections.
   */
  @Get('cartera')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Aging/cartera report' })
  @ApiOkResponse({ description: 'Aging analysis with buckets' })
  async getCarteraReport(@CurrentAgency('agencyId') agencyId: string) {
    return this.reportsService.getCarteraReport(agencyId);
  }

  /**
   * GET /inmobiliaria/reports/comisiones
   * Agent commission report for a given month.
   */
  @Get('comisiones')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Agent commissions report' })
  @ApiOkResponse({ description: 'Commission totals per agent' })
  @ApiQuery({ name: 'month', required: true, example: '2026-02' })
  async getComisionesReport(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('month') month: string,
  ) {
    return this.reportsService.getComisionesReport(agencyId, month);
  }

  /**
   * GET /inmobiliaria/reports/ocupacion
   * Property occupancy report grouped by zone/city.
   */
  @Get('ocupacion')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Property occupancy report' })
  @ApiOkResponse({ description: 'Occupancy rates by zone' })
  async getOcupacionReport(@CurrentAgency('agencyId') agencyId: string) {
    return this.reportsService.getOcupacionReport(agencyId);
  }

  /**
   * GET /inmobiliaria/reports/vencimientos
   * Contract/lease expiry report with aging buckets.
   */
  @Get('vencimientos')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Contract expiry report' })
  @ApiOkResponse({ description: 'Lease expirations with bucket summary' })
  async getVencimientosReport(@CurrentAgency('agencyId') agencyId: string) {
    return this.reportsService.getVencimientosReport(agencyId);
  }

  /**
   * GET /inmobiliaria/reports/flujo-caja
   * Cash flow report for the last N months.
   */
  @Get('flujo-caja')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Cash flow report' })
  @ApiOkResponse({ description: 'Monthly income, disbursements, and commissions' })
  @ApiQuery({ name: 'period', required: false, example: 'semester' })
  @ApiQuery({ name: 'months', required: false, example: 6 })
  async getFlujoCajaReport(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('period') period?: string,
    @Query('months') months?: string,
  ) {
    const parsedMonths = months ? parseInt(months, 10) : 6;
    return this.reportsService.getFlujoCajaReport(
      agencyId,
      period ?? 'semester',
      parsedMonths,
    );
  }

  /**
   * GET /inmobiliaria/reports/rendimiento-agentes
   * Agent performance report for a given month.
   */
  @Get('rendimiento-agentes')
  @RequirePermission('reportes', 'view')
  @ApiOperation({ summary: 'Agent performance report' })
  @ApiOkResponse({ description: 'Performance metrics per agent' })
  @ApiQuery({ name: 'month', required: true, example: '2026-02' })
  async getRendimientoAgentesReport(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('month') month: string,
  ) {
    return this.reportsService.getRendimientoAgentesReport(agencyId, month);
  }
}
