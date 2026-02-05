import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LeasesService } from './leases.service.js';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import type { User, Lease, Payment } from '@prisma/client';

/**
 * LeasesController
 *
 * REST API endpoints for lease and payment management.
 *
 * Requirements: LEAS-04, LEAS-06, LEAS-07, LEAS-08
 */
@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * GET /leases/my-lease
   * Get the current active lease for the authenticated tenant.
   *
   * Requirements: LEAS-07
   */
  @Get('my-lease')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get current active lease (tenant)' })
  @ApiResponse({ status: 200, description: 'Active lease or null' })
  async getMyLease(@CurrentUser() user: User): Promise<Lease | null> {
    return this.leasesService.getActiveLeaseForTenant(user.id);
  }

  /**
   * GET /leases
   * List all leases for the authenticated landlord.
   *
   * Requirements: LEAS-08
   */
  @Get()
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'List all leases (landlord)' })
  @ApiResponse({
    status: 200,
    description: 'List of leases with payment counts',
  })
  async listLeases(@CurrentUser() user: User) {
    return this.leasesService.listForLandlord(user.id);
  }

  /**
   * GET /leases/:id
   * Get lease details by ID.
   * Either landlord or tenant can view.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get lease details' })
  @ApiParam({ name: 'id', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Lease> {
    return this.leasesService.getById(id, user.id);
  }

  /**
   * POST /leases/:id/payments
   * Record a payment for a lease.
   * Only the landlord can record payments.
   *
   * Requirements: LEAS-04, LEAS-05
   */
  @Post(':id/payments')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Record payment received' })
  @ApiParam({ name: 'id', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  @ApiResponse({
    status: 400,
    description: 'Duplicate payment or invalid data',
  })
  @ApiResponse({
    status: 403,
    description: 'Only landlord can record payments',
  })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async recordPayment(
    @Param('id', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.recordPayment(user.id, leaseId, dto);
  }

  /**
   * GET /leases/:id/payments
   * Get payment history for a lease.
   * Either landlord or tenant can view.
   *
   * Requirements: LEAS-06
   */
  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payment history for lease' })
  @ApiParam({ name: 'id', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getPaymentHistory(
    @Param('id', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ): Promise<Payment[]> {
    return this.paymentsService.getPaymentHistory(leaseId, user.id);
  }

  /**
   * GET /leases/:id/payments/summary
   * Get payment summary for a lease (total paid, count, last payment).
   * Either landlord or tenant can view.
   */
  @Get(':id/payments/summary')
  @ApiOperation({ summary: 'Get payment summary for lease' })
  @ApiParam({ name: 'id', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Payment summary' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getPaymentSummary(
    @Param('id', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.getPaymentSummary(leaseId, user.id);
  }
}
