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
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { DispersionesService } from './dispersiones.service.js';
import { GenerateDispersionDto, ProcessDispersionDto } from './dto/index.js';

/**
 * Controller for owner disbursements (dispersiones).
 * All endpoints scoped to agency via AgencyMemberGuard.
 */
@ApiTags('inmobiliaria/dispersiones')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard)
@Controller('inmobiliaria/dispersiones')
export class DispersionesController {
  constructor(private readonly dispersionesService: DispersionesService) {}

  /**
   * POST /inmobiliaria/dispersiones/generate
   * Generate dispersiones from paid cobros for the given month.
   * NOTE: This route MUST be defined before /:id to avoid path conflicts.
   */
  @Post('generate')
  @ApiOperation({ summary: 'Generate dispersiones for a month' })
  @ApiCreatedResponse({ description: 'Dispersiones generated successfully' })
  async generate(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: GenerateDispersionDto,
  ) {
    return this.dispersionesService.generate(agencyId, dto.month);
  }

  /**
   * GET /inmobiliaria/dispersiones
   * List dispersiones with optional filters.
   */
  @Get()
  @ApiOperation({ summary: 'List dispersiones with filters' })
  @ApiOkResponse({ description: 'List of dispersiones with items' })
  @ApiQuery({ name: 'month', required: false, example: '2026-02' })
  @ApiQuery({ name: 'status', required: false, example: 'DISP_PENDING' })
  @ApiQuery({ name: 'propietarioId', required: false })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('propietarioId') propietarioId?: string,
  ) {
    return this.dispersionesService.findAll(agencyId, { month, status, propietarioId });
  }

  /**
   * GET /inmobiliaria/dispersiones/:id
   * Get a single dispersion with items and propietario details.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get dispersion by ID' })
  @ApiOkResponse({ description: 'Dispersion details with items and propietario' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispersionesService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/dispersiones/:id/approve
   * Approve a dispersion for processing.
   * Gets userId from @CurrentUser to track who approved.
   */
  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve a dispersion' })
  @ApiOkResponse({ description: 'Dispersion approved and set to PROCESSING' })
  async approve(
    @CurrentAgency('agencyId') agencyId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispersionesService.approve(agencyId, id, userId);
  }

  /**
   * PUT /inmobiliaria/dispersiones/:id/process
   * Mark a dispersion as completed with transfer reference.
   */
  @Put(':id/process')
  @ApiOperation({ summary: 'Process a dispersion (mark as completed)' })
  @ApiOkResponse({ description: 'Dispersion processed successfully' })
  async process(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessDispersionDto,
  ) {
    return this.dispersionesService.process(agencyId, id, dto.transferReference);
  }
}
