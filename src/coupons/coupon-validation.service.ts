import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Coupon } from '@prisma/client';
import { CouponType } from '../common/enums/index.js';

export interface DiscountPreview {
  type: CouponType;
  percentageOff?: number;
  amountOff?: number;
  freeMonths?: number;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  coupon?: Coupon;
  discountPreview?: DiscountPreview;
}

/**
 * CouponValidationService
 *
 * Validates coupon codes against multiple conditions:
 * - Code exists and is active
 * - Within validity date range
 * - Not exceeded max uses
 * - User hasn't already used it
 * - Applicable to selected plan
 */
@Injectable()
export class CouponValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a coupon code for a specific user and plan.
   * Returns validation result with Spanish messages.
   */
  async validateCoupon(
    code: string,
    userId: string,
    planId: string,
  ): Promise<ValidationResult> {
    // Normalize code
    const normalizedCode = code.toUpperCase().trim();

    // Find coupon
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
      include: { usages: true },
    });

    if (!coupon) {
      return {
        valid: false,
        message: 'Codigo de cupon no valido',
      };
    }

    // Check if active
    if (!coupon.isActive) {
      return {
        valid: false,
        message: 'Este cupon esta desactivado',
      };
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom) {
      return {
        valid: false,
        message: 'Este cupon aun no es valido',
      };
    }

    if (now > coupon.validUntil) {
      return {
        valid: false,
        message: 'Este cupon ha expirado',
      };
    }

    // Check max uses
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return {
        valid: false,
        message: 'Este cupon ha alcanzado su limite de uso',
      };
    }

    // Check if user has already used this coupon
    const userUsage = coupon.usages.find((usage) => usage.userId === userId);
    if (userUsage) {
      return {
        valid: false,
        message: 'Ya has usado este cupon',
      };
    }

    // Check plan applicability
    if (coupon.applicablePlans.length > 0) {
      // Load plan to build key
      const plan = await this.prisma.subscriptionPlanConfig.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return {
          valid: false,
          message: 'Plan no encontrado',
        };
      }

      // Build plan key as PLANTYPE_TIER (e.g. "TENANT_PRO")
      const planKey = `${plan.planType}_${plan.tier}`;

      if (!coupon.applicablePlans.includes(planKey)) {
        return {
          valid: false,
          message: 'Este cupon no es aplicable al plan seleccionado',
        };
      }
    }

    // Build discount preview
    const discountPreview: DiscountPreview = {
      type: coupon.type as CouponType,
    };

    if (coupon.type === 'PERCENTAGE' && coupon.percentageOff !== null) {
      discountPreview.percentageOff = coupon.percentageOff;
    } else if (coupon.type === 'FIXED_AMOUNT' && coupon.amountOff !== null) {
      discountPreview.amountOff = coupon.amountOff;
    } else if (coupon.type === 'FREE_MONTHS' && coupon.freeMonths !== null) {
      discountPreview.freeMonths = coupon.freeMonths;
    }

    return {
      valid: true,
      message: 'Cupon valido',
      coupon,
      discountPreview,
    };
  }
}
