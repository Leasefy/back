import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LeaseStatus } from '../common/enums/index.js';
import type { Lease } from '@prisma/client';

/**
 * LeasesService
 *
 * Business logic for lease management.
 * Handles lease retrieval and status management.
 *
 * Requirements: LEAS-02, LEAS-07, LEAS-08
 */
@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get active lease for a tenant.
   * Returns the first ACTIVE or ENDING_SOON lease.
   *
   * Requirements: LEAS-07
   */
  async getActiveLeaseForTenant(tenantId: string): Promise<Lease | null> {
    const lease = await this.prisma.lease.findFirst({
      where: {
        tenantId,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.ENDING_SOON] },
      },
      orderBy: { startDate: 'desc' },
    });

    // Check if lease should transition to ENDING_SOON (within 30 days of end)
    if (lease && lease.status === LeaseStatus.ACTIVE) {
      const daysUntilEnd = this.getDaysUntilEnd(lease.endDate);
      if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
        // Update status to ENDING_SOON (lazy evaluation)
        return this.prisma.lease.update({
          where: { id: lease.id },
          data: { status: LeaseStatus.ENDING_SOON },
        });
      }
    }

    return lease;
  }

  /**
   * List all leases for a landlord with payment counts.
   *
   * Requirements: LEAS-08
   */
  async listForLandlord(landlordId: string): Promise<Array<{
    id: string;
    status: LeaseStatus;
    propertyAddress: string;
    propertyCity: string;
    tenantName: string;
    monthlyRent: number;
    startDate: Date;
    endDate: Date;
    paymentCount: number;
  }>> {
    const leases = await this.prisma.lease.findMany({
      where: { landlordId },
      include: {
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check and update ENDING_SOON status for all leases
    const result = await Promise.all(
      leases.map(async (lease) => {
        let currentStatus = lease.status as LeaseStatus;

        // Lazy status update
        if (currentStatus === LeaseStatus.ACTIVE) {
          const daysUntilEnd = this.getDaysUntilEnd(lease.endDate);
          if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
            await this.prisma.lease.update({
              where: { id: lease.id },
              data: { status: LeaseStatus.ENDING_SOON },
            });
            currentStatus = LeaseStatus.ENDING_SOON;
          } else if (daysUntilEnd <= 0) {
            await this.prisma.lease.update({
              where: { id: lease.id },
              data: { status: LeaseStatus.ENDED },
            });
            currentStatus = LeaseStatus.ENDED;
          }
        }

        return {
          id: lease.id,
          status: currentStatus,
          propertyAddress: lease.propertyAddress,
          propertyCity: lease.propertyCity,
          tenantName: lease.tenantName,
          monthlyRent: lease.monthlyRent,
          startDate: lease.startDate,
          endDate: lease.endDate,
          paymentCount: lease._count.payments,
        };
      }),
    );

    return result;
  }

  /**
   * Get lease by ID with access verification.
   * Either landlord or tenant can view.
   */
  async getById(leaseId: string, userId: string): Promise<Lease> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.landlordId !== userId && lease.tenantId !== userId) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    // Lazy status update
    if (lease.status === LeaseStatus.ACTIVE) {
      const daysUntilEnd = this.getDaysUntilEnd(lease.endDate);
      if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
        return this.prisma.lease.update({
          where: { id: lease.id },
          data: { status: LeaseStatus.ENDING_SOON },
        });
      } else if (daysUntilEnd <= 0) {
        return this.prisma.lease.update({
          where: { id: lease.id },
          data: { status: LeaseStatus.ENDED },
        });
      }
    }

    return lease;
  }

  /**
   * Verify user has access to lease (for payment operations).
   * Returns lease if access granted.
   */
  async verifyAccess(leaseId: string, userId: string): Promise<Lease> {
    return this.getById(leaseId, userId);
  }

  /**
   * Verify user is landlord of lease (for payment recording).
   */
  async verifyLandlordAccess(leaseId: string, landlordId: string): Promise<Lease> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.landlordId !== landlordId) {
      throw new ForbiddenException('Only the landlord can record payments');
    }

    return lease;
  }

  // Helper method
  private getDaysUntilEnd(endDate: Date): number {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
