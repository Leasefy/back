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
import { PipelineService } from './pipeline.service.js';
import {
  CreatePipelineItemDto,
  UpdatePipelineItemDto,
  MoveStageDto,
  LogActionDto,
} from './dto/index.js';
import { PipelineStage } from '../../common/enums/pipeline-stage.enum.js';

/**
 * Controller for the rental pipeline (Kanban board).
 * All endpoints require authentication and agency membership.
 */
@ApiTags('inmobiliaria/pipeline')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * POST /inmobiliaria/pipeline
   * Create a new pipeline item (prospect).
   */
  @Post()
  @RequirePermission('pipeline', 'create')
  @ApiOperation({ summary: 'Create a pipeline item' })
  @ApiCreatedResponse({ description: 'Pipeline item created' })
  async create(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreatePipelineItemDto,
  ) {
    return this.pipelineService.create(agencyId, dto);
  }

  /**
   * GET /inmobiliaria/pipeline
   * List pipeline items with optional filters.
   */
  @Get()
  @RequirePermission('pipeline', 'view')
  @ApiOperation({ summary: 'List pipeline items' })
  @ApiOkResponse({ description: 'List of pipeline items' })
  @ApiQuery({ name: 'stage', required: false, enum: PipelineStage })
  @ApiQuery({ name: 'agenteUserId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'consignacionId', required: false })
  async findAll(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('stage') stage?: PipelineStage,
    @Query('agenteUserId') agenteUserId?: string,
    @Query('search') search?: string,
    @Query('consignacionId') consignacionId?: string,
  ) {
    return this.pipelineService.findAll(agencyId, {
      stage,
      agenteUserId,
      search,
      consignacionId,
    });
  }

  /**
   * GET /inmobiliaria/pipeline/stats
   * Get pipeline statistics (counts per stage, conversion rate, etc.).
   * MUST be defined before /:id to avoid route conflicts.
   */
  @Get('stats')
  @RequirePermission('pipeline', 'view')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  @ApiOkResponse({ description: 'Pipeline statistics' })
  async getStats(@CurrentAgency('agencyId') agencyId: string) {
    return this.pipelineService.getStats(agencyId);
  }

  /**
   * GET /inmobiliaria/pipeline/:id
   * Get a single pipeline item with consignacion details.
   */
  @Get(':id')
  @RequirePermission('pipeline', 'view')
  @ApiOperation({ summary: 'Get pipeline item detail' })
  @ApiOkResponse({ description: 'Pipeline item detail' })
  async findOne(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pipelineService.findOne(agencyId, id);
  }

  /**
   * PUT /inmobiliaria/pipeline/:id
   * Update a pipeline item's fields.
   */
  @Put(':id')
  @RequirePermission('pipeline', 'edit')
  @ApiOperation({ summary: 'Update pipeline item' })
  @ApiOkResponse({ description: 'Pipeline item updated' })
  async update(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineItemDto,
  ) {
    return this.pipelineService.update(agencyId, id, dto);
  }

  /**
   * PUT /inmobiliaria/pipeline/:id/stage
   * Move a pipeline item to a new stage.
   */
  @Put(':id/stage')
  @RequirePermission('pipeline', 'edit')
  @ApiOperation({ summary: 'Move pipeline item to a new stage' })
  @ApiOkResponse({ description: 'Pipeline item stage updated' })
  async moveStage(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.pipelineService.moveStage(agencyId, id, dto);
  }

  /**
   * POST /inmobiliaria/pipeline/:id/action
   * Log a contact action on a pipeline item.
   */
  @Post(':id/action')
  @RequirePermission('pipeline', 'edit')
  @ApiOperation({ summary: 'Log an action on a pipeline item' })
  @ApiOkResponse({ description: 'Action logged' })
  async logAction(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogActionDto,
  ) {
    return this.pipelineService.logAction(agencyId, id, dto);
  }

  /**
   * DELETE /inmobiliaria/pipeline/:id
   * Delete a pipeline item.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('pipeline', 'delete')
  @ApiOperation({ summary: 'Delete a pipeline item' })
  @ApiNoContentResponse({ description: 'Pipeline item deleted' })
  async remove(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.pipelineService.remove(agencyId, id);
  }
}
