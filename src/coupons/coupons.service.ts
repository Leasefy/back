import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Coupon } from '@prisma/client';
import type { CreateCouponDto, UpdateCouponDto } from './dto/index.js';

/**
 * CouponsService
 *
 * Admin CRUD operations for coupon codes.
 * Provides atomic usage recording for coupon redemption.
 */
@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new coupon.
   * Normalizes code to uppercase and converts date strings to Date objects.
   */
  async create(dto: CreateCouponDto): Promise<Coupon> {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        type: dto.type,
        percentageOff: dto.percentageOff,
        amountOff: dto.amountOff,
        freeMonths: dto.freeMonths,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        maxUses: dto.maxUses,
        applicablePlans: dto.applicablePlans || [],
        description: dto.description,
      },
    });
  }

  /**
   * List all coupons with usage statistics.
   * Ordered by creation date (newest first).
   */
  async findAll(): Promise<
    Array<Coupon & { _count: { usages: number } }>
  > {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });
  }

  /**
   * Find a coupon by ID.
   * Throws NotFoundException if not found.
   */
  async findById(id: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException(`Cupon con ID ${id} no encontrado`);
    }

    return coupon;
  }

  /**
   * Update a coupon (admin only).
   * Only provided fields are updated.
   */
  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    // Verify coupon exists
    await this.findById(id);

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.validUntil !== undefined && {
          validUntil: new Date(dto.validUntil),
        }),
        ...(dto.applicablePlans !== undefined && {
          applicablePlans: dto.applicablePlans,
        }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /**
   * Deactivate a coupon (soft delete).
   * Sets isActive to false.
   */
  async deactivate(id: string): Promise<Coupon> {
    // Verify coupon exists
    await this.findById(id);

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Record coupon usage atomically.
   * Increments currentUses and creates CouponUsage record in a transaction.
   */
  async recordUsage(
    couponId: string,
    userId: string,
    subscriptionId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Increment currentUses
      await tx.coupon.update({
        where: { id: couponId },
        data: { currentUses: { increment: 1 } },
      });

      // Create usage record
      await tx.couponUsage.create({
        data: {
          couponId,
          userId,
          subscriptionId,
        },
      });
    });
  }
}
