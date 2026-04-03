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
import { AgencyPermissionGuard } from '../agency/guards/agency-permission.guard.js';
import { RequirePermission } from '../agency/decorators/require-permission.decorator.js';
import { CurrentAgency } from '../agency/decorators/current-agency.decorator.js';
import { ActasService } from './actas.service.js';
import { CreateActaDto, UpdateActaDto, SignActaDto } from './dto/index.js';

/**
 * Controller for property delivery/return acts (actas de entrega/devolucion).
 * All endpoints scoped to agency via AgencyMemberGuard.
 * Module: portafolio (inherits from consignaciones/property portfolio).
 */
@ApiTags('inmobiliaria/actas')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/actas')
export class ActasController {
  constructor(private readonly actasService: ActasService) {}

  /**
   * POST /inmobiliaria/actas
   * Create a new acta (delivery or return act).
   */
  @Post()
  @RequirePermission('portafolio', 'create')
  @ApiOperation({ summary: 'Create a new acta' })
  @ApiCreatedResponse({ description: 'Acta created successfully' })
  async create(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreateActaDto,
  ) {
    return this.actasService.create(agencyId, dto);
  }

  /**
   * GET /inmobiliaria/actas
   * List actas for the user's agency with optional filters.
   */
  @Get()
  @RequirePermission('portafolio', 'view')
  @ApiOperation({ summary: 'List actas' })
  @ApiOkResponse({ description: 'List of actas' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type (ENTREGA/DEVOLUCION)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'consignacionId', required: false, description: 'Filter by consignacion' })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('consignacionId') consignacionId?: string,
  ) {
    return this.actasService.findAll(agencyId, {
      type,
      status,
      consignacionId,
    });
  }

  /**
   * GET /inmobiliaria/actas/:id
   * Get a single acta by ID.
   */
  @Get(':id')
  @RequirePermission('portafolio', 'view')
  @ApiOperation({ summary: 'Get acta by ID' })
  @ApiOkResponse({ description: 'Acta details' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.actasService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/actas/:id
   * Update an acta (rooms, items, meters, keys, etc.).
   */
  @Put(':id')
  @RequirePermission('portafolio', 'edit')
  @ApiOperation({ summary: 'Update acta' })
  @ApiOkResponse({ description: 'Acta updated successfully' })
  async update(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActaDto,
  ) {
    return this.actasService.update(agencyId, id, dto);
  }

  /**
   * POST /inmobiliaria/actas/:id/sign
   * Add a signature to an acta.
   */
  @Post(':id/sign')
  @RequirePermission('portafolio', 'edit')
  @ApiOperation({ summary: 'Sign an acta' })
  @ApiOkResponse({ description: 'Signature added to acta' })
  async sign(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignActaDto,
  ) {
    return this.actasService.sign(agencyId, id, dto);
  }

  /**
   * DELETE /inmobiliaria/actas/:id
   * Delete an acta. Only allowed for draft actas.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('portafolio', 'delete')
  @ApiOperation({ summary: 'Delete draft acta' })
  @ApiNoContentResponse({ description: 'Acta deleted' })
  async remove(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.actasService.remove(agencyId, id);
  }
}
