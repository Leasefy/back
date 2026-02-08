import { Injectable } from '@nestjs/common';
import { CouponType } from '../common/enums/index.js';

interface CouponData {
  type: CouponType;
  percentageOff?: number | null;
  amountOff?: number | null;
  freeMonths?: number | null;
}

interface DiscountResult {
  finalPrice: number;
  discountAmount: number;
  freeMonths?: number;
}

/**
 * CouponApplicationService
 *
 * Pure service for calculating discounts based on coupon type.
 * No dependencies - can be used standalone.
 *
 * Handles four discount types:
 * - PERCENTAGE: Reduces price by percentage
 * - FIXED_AMOUNT: Reduces price by fixed COP amount
 * - FREE_MONTHS: First period is free, tracks remaining months
 * - FULL_ACCESS: Full free access (finalPrice = 0)
 */
@Injectable()
export class CouponApplicationService {
  /**
   * Apply discount based on coupon type.
   * Always ensures finalPrice >= 0.
   */
  applyDiscount(originalPrice: number, coupon: CouponData): DiscountResult {
    switch (coupon.type) {
      case CouponType.PERCENTAGE: {
        if (!coupon.percentageOff) {
          throw new Error('percentageOff required for PERCENTAGE coupon');
        }
        const discountAmount = Math.floor(
          (originalPrice * coupon.percentageOff) / 100,
        );
        const finalPrice = Math.max(0, originalPrice - discountAmount);
        return { finalPrice, discountAmount };
      }

      case CouponType.FIXED_AMOUNT: {
        if (!coupon.amountOff) {
          throw new Error('amountOff required for FIXED_AMOUNT coupon');
        }
        const discountAmount = Math.min(coupon.amountOff, originalPrice);
        const finalPrice = Math.max(0, originalPrice - discountAmount);
        return { finalPrice, discountAmount };
      }

      case CouponType.FREE_MONTHS: {
        if (!coupon.freeMonths) {
          throw new Error('freeMonths required for FREE_MONTHS coupon');
        }
        return {
          finalPrice: 0,
          discountAmount: originalPrice,
          freeMonths: coupon.freeMonths,
        };
      }

      case CouponType.FULL_ACCESS: {
        return {
          finalPrice: 0,
          discountAmount: originalPrice,
        };
      }

      default:
        throw new Error(`Unknown coupon type: ${coupon.type}`);
    }
  }
}
