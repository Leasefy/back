import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import { PrismaService } from '../database/prisma.service.js';
import type { User } from '@prisma/client';

/**
 * TenantPaymentsQueryController
 *
 * Read-only endpoints for tenants to view their payments.
 * Routes: /tenant-payments/mine and /tenant-payments/lease/:leaseId
 */
@ApiTags('Tenant Payments')
@ApiBearerAuth()
@Controller('tenant-payments')
export class TenantPaymentsQueryController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /tenant-payments/mine
   * Get all payments for the authenticated tenant across all leases.
   */
  @Get('mine')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get all payments for the authenticated tenant' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async getMyPayments(@CurrentUser() user: User) {
    // Find all leases where user is tenant
    const leases = await this.prisma.lease.findMany({
      where: { tenantId: user.id },
      select: { id: true, paymentDay: true },
    });

    if (leases.length === 0) return [];

    const leaseIds = leases.map((l) => l.id);
    const leasePaymentDayMap = new Map(leases.map((l) => [l.id, l.paymentDay]));

    // Get all recorded payments for these leases
    const payments = await this.prisma.payment.findMany({
      where: { leaseId: { in: leaseIds } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return payments.map((p) => {
      const paymentDay = leasePaymentDayMap.get(p.leaseId) ?? 1;
      return {
        id: p.id,
        leaseId: p.leaseId,
        amount: p.amount,
        concept: 'RENT',
        dueDate: new Date(p.periodYear, p.periodMonth - 1, paymentDay).toISOString(),
        paidDate: p.paymentDate?.toISOString() ?? null,
        status: 'PAID',
        method: p.method,
        reference: p.referenceNumber ?? null,
        notes: p.notes ?? null,
      };
    });
  }

  /**
   * GET /tenant-payments/lease/:leaseId
   * Get payments for a specific lease (tenant access only).
   */
  @Get('lease/:leaseId')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get payments for a specific lease' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'List of payments for lease' })
  @ApiResponse({ status: 403, description: 'Not tenant of this lease' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getPaymentsByLease(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.tenantId !== user.id) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    const payments = await this.prisma.payment.findMany({
      where: { leaseId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return payments.map((p) => ({
      id: p.id,
      leaseId: p.leaseId,
      amount: p.amount,
      concept: 'RENT',
      dueDate: new Date(p.periodYear, p.periodMonth - 1, lease.paymentDay).toISOString(),
      paidDate: p.paymentDate?.toISOString() ?? null,
      status: 'PAID',
      method: p.method,
      reference: p.referenceNumber ?? null,
      notes: p.notes ?? null,
    }));
  }
}
