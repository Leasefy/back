export const VALID_PACK_SIZES = [1, 5, 10, 20] as const;

export type CreditPackSize = (typeof VALID_PACK_SIZES)[number];

/**
 * Pack size → total COP price.
 * Bulk discounts: 5 (~10%), 10 (~17%), 20 (~25%).
 */
export const CREDIT_PACK_PRICES: Record<CreditPackSize, number> = {
  1: 42_000,
  5: 189_000,
  10: 350_000,
  20: 630_000,
};
