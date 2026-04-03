import {
  Controller,
  Get,
  Post,
  Put,
  Body,
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
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../agency/guards/agency-member.guard.js';
import { AgencyPermissionGuard } from '../agency/guards/agency-permission.guard.js';
import { RequirePermission } from '../agency/decorators/require-permission.decorator.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { CobrosService } from './cobros.service.js';
import { GenerateCobrosDto, RegisterPaymentDto } from './dto/index.js';

/**
 * Controller for monthly rent collections (cobros).
 * All endpoints scoped to agency via AgencyMemberGuard.
 */
@ApiTags('inmobiliaria/cobros')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/cobros')
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  /**
   * POST /inmobiliaria/cobros/generate
   * Auto-generate cobros for all active RENTED consignaciones for the given month.
   */
  @Post('generate')
  @RequirePermission('cobros', 'create')
  @ApiOperation({ summary: 'Generate cobros for a month' })
  @ApiCreatedResponse({ description: 'Cobros generated successfully' })
  async generate(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: GenerateCobrosDto,
  ) {
    return this.cobrosService.generate(agencyId, dto.month);
  }

  /**
   * GET /inmobiliaria/cobros/summary?month=2026-02
   * Get summary statistics for a month.
   * NOTE: This route MUST be defined before /:id to avoid path conflicts.
   */
  @Get('summary')
  @RequirePermission('cobros', 'view')
  @ApiOperation({ summary: 'Get cobros summary for a month' })
  @ApiOkResponse({ description: 'Monthly cobros summary' })
  @ApiQuery({ name: 'month', example: '2026-02', description: 'Month in YYYY-MM format' })
  async getSummary(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('month') month: string,
  ) {
    return this.cobrosService.getSummary(agencyId, month);
  }

  /**
   * GET /inmobiliaria/cobros/cartera-report
   * Aging report: updates late fees first, then returns summary.
   * NOTE: This route MUST be defined before /:id to avoid path conflicts.
   */
  @Get('cartera-report')
  @RequirePermission('cobros', 'view')
  @ApiOperation({ summary: 'Get cartera (aging) report' })
  @ApiOkResponse({ description: 'Cartera report with updated late fees' })
  async getCarteraReport(
    @CurrentAgency('agencyId') agencyId: string,
  ) {
    // Update late fees first, then return current-month summary
    const lateResult = await this.cobrosService.updateLateFees(agencyId);
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const summary = await this.cobrosService.getSummary(agencyId, month);
    return {
      ...summary,
      lateFeesUpdated: lateResult.updated,
    };
  }

  /**
   * GET /inmobiliaria/cobros
   * List cobros with optional filters.
   */
  @Get()
  @RequirePermission('cobros', 'view')
  @ApiOperation({ summary: 'List cobros with filters' })
  @ApiOkResponse({ description: 'List of cobros' })
  @ApiQuery({ name: 'month', required: false, example: '2026-02' })
  @ApiQuery({ name: 'status', required: false, example: 'COBRO_PENDING' })
  @ApiQuery({ name: 'consignacionId', required: false })
  @ApiQuery({ name: 'propietarioId', required: false })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('consignacionId') consignacionId?: string,
    @Query('propietarioId') propietarioId?: string,
  ) {
    return this.cobrosService.findAll(agencyId, { month, status, consignacionId, propietarioId });
  }

  /**
   * GET /inmobiliaria/cobros/:id
   * Get a single cobro with consignacion details.
   */
  @Get(':id')
  @RequirePermission('cobros', 'view')
  @ApiOperation({ summary: 'Get cobro by ID' })
  @ApiOkResponse({ description: 'Cobro details with consignacion' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cobrosService.findOne(agencyId, id);
  }

  /**
   * POST /inmobiliaria/cobros/:id/payment
   * Register a payment for a cobro.
   */
  @Post(':id/payment')
  @RequirePermission('cobros', 'edit')
  @ApiOperation({ summary: 'Register payment for a cobro' })
  @ApiOkResponse({ description: 'Payment registered successfully' })
  async registerPayment(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.cobrosService.registerPayment(agencyId, id, dto);
  }

  /**
   * PUT /inmobiliaria/cobros/:id/send-reminder
   * Send a reminder for a cobro.
   */
  @Put(':id/send-reminder')
  @RequirePermission('cobros', 'edit')
  @ApiOperation({ summary: 'Send reminder for a cobro' })
  @ApiOkResponse({ description: 'Reminder sent' })
  async sendReminder(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cobrosService.sendReminder(agencyId, id);
  }
}
