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
import { MantenimientoService } from './mantenimiento.service.js';
import { CreateMantenimientoDto, AddQuoteDto } from './dto/index.js';

/**
 * Controller for maintenance request management.
 * All endpoints require authentication and agency membership.
 */
@ApiTags('inmobiliaria/mantenimiento')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard)
@Controller('inmobiliaria/mantenimiento')
export class MantenimientoController {
  constructor(
    private readonly mantenimientoService: MantenimientoService,
  ) {}

  /**
   * POST /inmobiliaria/maintenance
   * Create a new maintenance request.
   */
  @Post()
  @ApiOperation({ summary: 'Create a maintenance request' })
  @ApiCreatedResponse({ description: 'Maintenance request created' })
  async create(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreateMantenimientoDto,
  ) {
    return this.mantenimientoService.create(agencyId, dto);
  }

  /**
   * GET /inmobiliaria/maintenance
   * List maintenance requests with optional filters.
   */
  @Get()
  @ApiOperation({ summary: 'List maintenance requests' })
  @ApiOkResponse({ description: 'List of maintenance requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'consignacionId', required: false })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('consignacionId') consignacionId?: string,
  ) {
    return this.mantenimientoService.findAll(agencyId, {
      status,
      priority,
      type,
      consignacionId,
    });
  }

  /**
   * GET /inmobiliaria/maintenance/:id
   * Get a single maintenance request with all quotes.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance request detail' })
  @ApiOkResponse({ description: 'Maintenance request with quotes' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mantenimientoService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/maintenance/:id
   * Update a maintenance request.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a maintenance request' })
  @ApiOkResponse({ description: 'Maintenance request updated' })
  async update(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateMantenimientoDto>,
  ) {
    return this.mantenimientoService.update(agencyId, id, dto);
  }

  /**
   * POST /inmobiliaria/maintenance/:id/quote
   * Add a vendor quote to a maintenance request.
   */
  @Post(':id/quote')
  @ApiOperation({ summary: 'Add a quote to a maintenance request' })
  @ApiCreatedResponse({ description: 'Quote added' })
  async addQuote(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddQuoteDto,
  ) {
    return this.mantenimientoService.addQuote(agencyId, id, dto);
  }

  /**
   * PUT /inmobiliaria/maintenance/:id/select-quote
   * Select a quote for the maintenance request.
   */
  @Put(':id/select-quote')
  @ApiOperation({ summary: 'Select a quote for a maintenance request' })
  @ApiOkResponse({ description: 'Quote selected' })
  async selectQuote(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { quoteId: string },
  ) {
    return this.mantenimientoService.selectQuote(agencyId, id, body.quoteId);
  }

  /**
   * PUT /inmobiliaria/maintenance/:id/approve
   * Approve a maintenance request.
   */
  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve a maintenance request' })
  @ApiOkResponse({ description: 'Maintenance request approved' })
  async approve(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mantenimientoService.approve(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/maintenance/:id/complete
   * Mark a maintenance request as completed.
   */
  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete a maintenance request' })
  @ApiOkResponse({ description: 'Maintenance request completed' })
  async complete(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { completionNotes?: string; completionPhotoUrls?: string[] },
  ) {
    return this.mantenimientoService.complete(
      agencyId,
      id,
      body.completionNotes,
      body.completionPhotoUrls,
    );
  }

  /**
   * PUT /inmobiliaria/maintenance/:id/cancel
   * Cancel a maintenance request.
   */
  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a maintenance request' })
  @ApiOkResponse({ description: 'Maintenance request cancelled' })
  async cancel(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mantenimientoService.cancel(agencyId, id);
  }
}
