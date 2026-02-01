import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContractsService } from './contracts.service.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import type { User } from '@prisma/client';

/**
 * ContractsController
 *
 * Endpoints for contract management.
 *
 * All endpoints require authentication.
 * Role-based access:
 * - POST /contracts - LANDLORD or BOTH
 * - POST /contracts/:id/send - LANDLORD or BOTH
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
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Create contract for approved application' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({ status: 400, description: 'Invalid application state or dates' })
  @ApiResponse({ status: 403, description: 'Not property owner' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.create(user.id, dto);
  }

  /**
   * List user's contracts (as landlord or tenant).
   * Note: This must be defined BEFORE /:id to avoid "list" being parsed as UUID
   */
  @Get()
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
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Send contract for signing' })
  @ApiResponse({ status: 200, description: 'Contract sent for signing' })
  async sendForSigning(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.sendForSigning(id, user.id);
  }
}
