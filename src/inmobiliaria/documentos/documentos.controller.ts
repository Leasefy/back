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
import { DocumentosService } from './documentos.service.js';
import {
  CreateTemplateDto,
  GenerateDocumentDto,
  SignDocumentDto,
} from './dto/index.js';

/**
 * Controller for agency document templates and generated documents.
 * All endpoints scoped to agency via AgencyMemberGuard.
 */
@ApiTags('inmobiliaria/documents')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/documents')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  // ─── Templates ──────────────────────────────────────────────

  /**
   * GET /inmobiliaria/documents/templates
   * List all active templates for the user's agency.
   * Optionally filter by category query param.
   */
  @Get('templates')
  @RequirePermission('documentos', 'view')
  @ApiOperation({ summary: 'List document templates' })
  @ApiOkResponse({ description: 'List of document templates' })
  @ApiQuery({ name: 'category', required: false })
  async getTemplates(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('category') category?: string,
  ) {
    return this.documentosService.getTemplates(agencyId, category);
  }

  /**
   * GET /inmobiliaria/documents/templates/:id
   * Get a single template by ID.
   */
  @Get('templates/:id')
  @RequirePermission('documentos', 'view')
  @ApiOperation({ summary: 'Get document template by ID' })
  @ApiOkResponse({ description: 'Template details' })
  async getTemplate(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentosService.getTemplate(agencyId, id);
  }

  /**
   * POST /inmobiliaria/documents/templates
   * Create a new document template.
   */
  @Post('templates')
  @RequirePermission('documentos', 'create')
  @ApiOperation({ summary: 'Create document template' })
  @ApiCreatedResponse({ description: 'Template created successfully' })
  async createTemplate(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.documentosService.createTemplate(agencyId, dto);
  }

  /**
   * PUT /inmobiliaria/documents/templates/:id
   * Update an existing document template.
   */
  @Put('templates/:id')
  @RequirePermission('documentos', 'edit')
  @ApiOperation({ summary: 'Update document template' })
  @ApiOkResponse({ description: 'Template updated successfully' })
  async updateTemplate(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTemplateDto>,
  ) {
    return this.documentosService.updateTemplate(agencyId, id, dto);
  }

  /**
   * DELETE /inmobiliaria/documents/templates/:id
   * Soft-delete a template (sets isActive = false).
   */
  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('documentos', 'delete')
  @ApiOperation({ summary: 'Delete document template' })
  @ApiNoContentResponse({ description: 'Template deleted' })
  async deleteTemplate(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.documentosService.deleteTemplate(agencyId, id);
  }

  // ─── Documents ──────────────────────────────────────────────

  /**
   * GET /inmobiliaria/documents
   * List generated documents for the user's agency.
   * Optionally filter by consignacionId and/or status.
   */
  @Get()
  @RequirePermission('documentos', 'view')
  @ApiOperation({ summary: 'List generated documents' })
  @ApiOkResponse({ description: 'List of generated documents' })
  @ApiQuery({ name: 'consignacionId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getDocuments(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('consignacionId') consignacionId?: string,
    @Query('status') status?: string,
  ) {
    return this.documentosService.getDocuments(agencyId, {
      consignacionId,
      status,
    });
  }

  /**
   * GET /inmobiliaria/documents/:id
   * Get a single generated document by ID.
   */
  @Get(':id')
  @RequirePermission('documentos', 'view')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiOkResponse({ description: 'Document details' })
  async getDocument(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentosService.getDocument(agencyId, id);
  }

  /**
   * POST /inmobiliaria/documents/generate
   * Generate a document from a template or raw content.
   */
  @Post('generate')
  @RequirePermission('documentos', 'create')
  @ApiOperation({ summary: 'Generate document from template or raw content' })
  @ApiCreatedResponse({ description: 'Document generated successfully' })
  async generateDocument(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.documentosService.generateDocument(agencyId, dto);
  }

  /**
   * POST /inmobiliaria/documents/:id/sign
   * Add a signature to a document.
   */
  @Post(':id/sign')
  @RequirePermission('documentos', 'edit')
  @ApiOperation({ summary: 'Sign a document' })
  @ApiOkResponse({ description: 'Signature added to document' })
  async signDocument(
    @CurrentAgency('agencyId') agencyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignDocumentDto,
  ) {
    return this.documentosService.signDocument(agencyId, id, dto);
  }
}
