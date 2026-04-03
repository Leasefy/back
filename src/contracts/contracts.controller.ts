import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ContractsService } from './contracts.service.js';
import { CreateContractDto, SignContractDto } from './dto/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RequireTeamPermission } from '../auth/decorators/require-team-permission.decorator.js';
import { TeamAccessGuard } from '../auth/guards/team-access.guard.js';
import { Role } from '../common/enums/index.js';
import type { User } from '@prisma/client';

/**
 * ContractsController
 *
 * Endpoints for contract management.
 *
 * All endpoints require authentication.
 * Role-based access:
 * - POST /contracts - LANDLORD (AGENT gets access via RolesGuard)
 * - POST /contracts/:id/send - LANDLORD (AGENT gets access via RolesGuard)
 * - POST /contracts/:id/sign/landlord - LANDLORD (AGENT gets access via RolesGuard)
 * - POST /contracts/:id/sign/tenant - TENANT
 * - GET endpoints - any authenticated user (access validated in service)
 */
@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * Create a contract for an approved application.
   * Landlord only.
   *
   * Requirements: CONT-02, CONT-03, CONT-04, CONT-05
   */
  @Post()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('contracts', 'create')
  @ApiOperation({ summary: 'Create contract for approved application' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid application state or dates',
  })
  @ApiResponse({ status: 403, description: 'Not property owner' })
  async create(@CurrentUser() user: User, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user.id, dto);
  }

  /**
   * List user's contracts (as landlord or tenant).
   * Note: This must be defined BEFORE /:id to avoid "list" being parsed as UUID
   */
  @Get()
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('contracts', 'view')
  @ApiOperation({ summary: 'List user contracts' })
  @ApiResponse({ status: 200, description: 'List of contracts' })
  async list(@CurrentUser() user: User) {
    return this.contractsService.listForUser(user.id);
  }

  /**
   * Get contract preview HTML.
   * Both parties can view.
   */
  @Get(':id/preview')
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('contracts', 'view')
  @ApiOperation({ summary: 'Get contract preview HTML' })
  @ApiResponse({ status: 200, description: 'Contract HTML' })
  async getPreview(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.getPreview(id, user.id);
  }

  /**
   * Get contract details.
   * Both parties can view.
   *
   * Requirements: CONT-10
   */
  @Get(':id')
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('contracts', 'view')
  @ApiOperation({ summary: 'Get contract details' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  async getById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.getById(id, user.id);
  }

  /**
   * Send contract for signing.
   * Transitions DRAFT -> PENDING_LANDLORD_SIGNATURE.
   * Landlord only.
   */
  @Post(':id/send')
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('contracts', 'edit')
  @ApiOperation({ summary: 'Send contract for signing' })
  @ApiResponse({ status: 200, description: 'Contract sent for signing' })
  async sendForSigning(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.sendForSigning(id, user.id);
  }

  /**
   * Landlord signs the contract.
   * Transition: PENDING_LANDLORD_SIGNATURE -> PENDING_TENANT_SIGNATURE
   *
   * Requirements: CONT-06, CONT-08
   */
  @Post(':id/sign/landlord')
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('contracts', 'edit')
  @ApiOperation({ summary: 'Landlord signs contract' })
  @ApiResponse({ status: 200, description: 'Contract signed by landlord' })
  @ApiResponse({ status: 400, description: 'Invalid state or missing consent' })
  async signAsLandlord(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.contractsService.signAsLandlord(
      id,
      user.id,
      dto,
      ip,
      userAgent,
    );
  }

  /**
   * Tenant signs the contract.
   * Transition: PENDING_TENANT_SIGNATURE -> SIGNED
   * Generates PDF after signing.
   *
   * Requirements: CONT-07, CONT-08, CONT-09
   */
  @Post(':id/sign/tenant')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Tenant signs contract' })
  @ApiResponse({
    status: 200,
    description: 'Contract signed by tenant, PDF generated',
  })
  @ApiResponse({ status: 400, description: 'Invalid state or missing consent' })
  async signAsTenant(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.contractsService.signAsTenant(id, user.id, dto, ip, userAgent);
  }

  /**
   * POST /contracts/:id/activate
   * Activate a signed contract (creates lease).
   * Only landlord can activate.
   *
   * Requirements: LEAS-01
   */
  @Post(':id/activate')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Activate a signed contract (creates lease)' })
  @ApiParam({ name: 'id', type: String, description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract activated, lease created',
  })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 403, description: 'Only landlord can activate' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async activateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.contractsService.activateContract(id, user.id);
  }

  /**
   * Download signed contract PDF.
   * Returns signed URL with 1-hour expiry.
   *
   * Requirements: CONT-09
   */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download signed contract PDF' })
  @ApiResponse({ status: 200, description: 'Signed URL for PDF download' })
  @ApiResponse({ status: 400, description: 'Contract not signed yet' })
  async getPdf(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.getSignedPdfUrl(id, user.id);
  }
}
