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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../agency/guards/agency-member.guard.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { RenovacionesService } from './renovaciones.service.js';
import { CreateRenovacionDto, UpdateRenovacionStageDto } from './dto/index.js';

/**
 * Controller for lease renewal (renovacion) management.
 * All endpoints require authentication and agency membership.
 */
@ApiTags('inmobiliaria/renovaciones')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard)
@Controller('inmobiliaria/renovaciones')
export class RenovacionesController {
  constructor(
    private readonly renovacionesService: RenovacionesService,
  ) {}

  /**
   * POST /inmobiliaria/renovaciones
   * Create a new lease renewal record.
   */
  @Post()
  @ApiOperation({ summary: 'Create a lease renewal' })
  @ApiCreatedResponse({ description: 'Lease renewal created' })
  async create(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreateRenovacionDto,
  ) {
    return this.renovacionesService.create(agencyId, dto);
  }

  /**
   * GET /inmobiliaria/renovaciones
   * List renovaciones with optional status and urgency filters.
   */
  @Get()
  @ApiOperation({ summary: 'List lease renewals' })
  @ApiOkResponse({ description: 'List of lease renewals' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'urgency', required: false, description: 'Urgency bucket: 0-30, 31-60, 61-90, 90+' })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
  ) {
    return this.renovacionesService.findAll(agencyId, { status, urgency });
  }

  /**
   * GET /inmobiliaria/renovaciones/upcoming
   * Get upcoming renewals within a number of days (default 90).
   * Must be declared BEFORE /:id to avoid route collision.
   */
  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming lease renewals' })
  @ApiOkResponse({ description: 'List of upcoming renewals' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look ahead (default 90)' })
  async getUpcoming(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 90;
    return this.renovacionesService.getUpcoming(agencyId, daysNum);
  }

  /**
   * GET /inmobiliaria/renovaciones/:id
   * Get a single renovacion with its full history.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get lease renewal detail' })
  @ApiOkResponse({ description: 'Lease renewal with history' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.renovacionesService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/renovaciones/:id/stage
   * Update the stage/status of a renovacion.
   */
  @Put(':id/stage')
  @ApiOperation({ summary: 'Update lease renewal stage' })
  @ApiOkResponse({ description: 'Lease renewal stage updated' })
  async updateStage(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRenovacionStageDto,
  ) {
    return this.renovacionesService.updateStage(agencyId, id, dto);
  }
}
