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
import { PropietariosService } from './propietarios.service.js';
import { CreatePropietarioDto, UpdatePropietarioDto } from './dto/index.js';

/**
 * Controller for managing property owners (propietarios) within an agency.
 * All endpoints require authentication and active agency membership.
 */
@ApiTags('inmobiliaria/propietarios')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/propietarios')
export class PropietariosController {
  constructor(private readonly propietariosService: PropietariosService) {}

  /**
   * POST /inmobiliaria/propietarios
   * Create a new propietario for the user's agency.
   */
  @Post()
  @RequirePermission('propietarios', 'create')
  @ApiOperation({ summary: 'Create a new propietario' })
  @ApiCreatedResponse({ description: 'Propietario created successfully' })
  async create(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreatePropietarioDto,
  ) {
    return this.propietariosService.create(agencyId, dto);
  }

  /**
   * GET /inmobiliaria/propietarios
   * List all propietarios for the user's agency with computed fields.
   */
  @Get()
  @RequirePermission('propietarios', 'view')
  @ApiOperation({ summary: 'List propietarios with computed fields' })
  @ApiOkResponse({ description: 'List of propietarios' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('search') search?: string,
  ) {
    return this.propietariosService.findAll(agencyId, { search });
  }

  /**
   * GET /inmobiliaria/propietarios/:id
   * Get a single propietario with consignaciones.
   */
  @Get(':id')
  @RequirePermission('propietarios', 'view')
  @ApiOperation({ summary: 'Get propietario detail with consignaciones' })
  @ApiOkResponse({ description: 'Propietario detail' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.propietariosService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/propietarios/:id
   * Update a propietario.
   */
  @Put(':id')
  @RequirePermission('propietarios', 'edit')
  @ApiOperation({ summary: 'Update a propietario' })
  @ApiOkResponse({ description: 'Propietario updated successfully' })
  async update(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropietarioDto,
  ) {
    return this.propietariosService.update(agencyId, id, dto);
  }

  /**
   * DELETE /inmobiliaria/propietarios/:id
   * Delete a propietario.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('propietarios', 'delete')
  @ApiOperation({ summary: 'Delete a propietario' })
  @ApiNoContentResponse({ description: 'Propietario deleted' })
  async remove(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.propietariosService.remove(agencyId, id);
  }

  /**
   * GET /inmobiliaria/propietarios/:id/extracto
   * Get owner statement for a given month.
   */
  @Get(':id/extracto')
  @RequirePermission('propietarios', 'view')
  @ApiOperation({ summary: 'Get owner statement (extracto) for a month' })
  @ApiOkResponse({ description: 'Owner statement with line items and totals' })
  @ApiQuery({ name: 'month', required: true, example: '2026-02' })
  async getExtracto(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('month') month: string,
  ) {
    return this.propietariosService.getExtracto(agencyId, id, month);
  }
}
