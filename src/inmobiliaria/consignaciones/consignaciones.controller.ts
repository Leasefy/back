import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../agency/guards/agency-member.guard.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { ConsignacionesService } from './consignaciones.service.js';
import {
  CreateConsignacionDto,
  UpdateConsignacionDto,
  AssignAgentDto,
} from './dto/index.js';

/**
 * Controller for managing property consignaciones within an agency.
 * All endpoints require authentication and active agency membership.
 */
@ApiTags('inmobiliaria/consignaciones')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard)
@Controller('inmobiliaria/consignaciones')
export class ConsignacionesController {
  constructor(
    private readonly consignacionesService: ConsignacionesService,
  ) {}

  /**
   * POST /inmobiliaria/consignaciones
   * Create a new consignacion.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new consignacion' })
  @ApiCreatedResponse({ description: 'Consignacion created successfully' })
  async create(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreateConsignacionDto,
  ) {
    return this.consignacionesService.create(agencyId, dto);
  }

  /**
   * GET /inmobiliaria/consignaciones
   * List consignaciones with optional filters.
   */
  @Get()
  @ApiOperation({ summary: 'List consignaciones with filters' })
  @ApiOkResponse({ description: 'List of consignaciones' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'availability', required: false })
  @ApiQuery({ name: 'agenteUserId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('status') status?: string,
    @Query('availability') availability?: string,
    @Query('agenteUserId') agenteUserId?: string,
    @Query('search') search?: string,
  ) {
    return this.consignacionesService.findAll(agencyId, {
      status,
      availability,
      agenteUserId,
      search,
    });
  }

  /**
   * GET /inmobiliaria/consignaciones/:id
   * Get a single consignacion with propietario.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get consignacion detail' })
  @ApiOkResponse({ description: 'Consignacion detail with propietario' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consignacionesService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/consignaciones/:id
   * Update a consignacion.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a consignacion' })
  @ApiOkResponse({ description: 'Consignacion updated successfully' })
  async update(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsignacionDto,
  ) {
    return this.consignacionesService.update(agencyId, id, dto);
  }

  /**
   * DELETE /inmobiliaria/consignaciones/:id
   * Delete a consignacion.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a consignacion' })
  @ApiNoContentResponse({ description: 'Consignacion deleted' })
  async remove(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.consignacionesService.remove(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/consignaciones/:id/assign-agent
   * Assign an agent to a consignacion.
   */
  @Put(':id/assign-agent')
  @ApiOperation({ summary: 'Assign agent to consignacion' })
  @ApiOkResponse({ description: 'Agent assigned successfully' })
  async assignAgent(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAgentDto,
  ) {
    return this.consignacionesService.assignAgent(
      agencyId,
      id,
      dto.agenteUserId,
    );
  }

  /**
   * GET /inmobiliaria/consignaciones/:id/lease-history
   * Get cobros history for a consignacion.
   */
  @Get(':id/lease-history')
  @ApiOperation({ summary: 'Get lease/cobros history for a consignacion' })
  @ApiOkResponse({ description: 'List of cobros for this consignacion' })
  async getLeaseHistory(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consignacionesService.getLeaseHistory(agencyId, id);
  }

  /**
   * GET /inmobiliaria/consignaciones/:id/maintenance
   * Get maintenance requests for a consignacion.
   */
  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Get maintenance requests for a consignacion' })
  @ApiOkResponse({ description: 'List of maintenance requests' })
  async getMaintenanceRequests(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consignacionesService.getMaintenanceRequests(agencyId, id);
  }
}
