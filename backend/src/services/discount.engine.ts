import { pool } from "../config/pool.js";

interface DiscountCheckInput {
  customerTierId: string;
  productCategoryId: string;
  discountPercent: number;
}

interface DiscountCheckResult {
  allowedDiscount: number;
  discountPercent: number;
  exceededBy: number;
  isViolation: boolean;
}

export async function checkDiscount(
  input: DiscountCheckInput,
): Promise<DiscountCheckResult> {
  const result = await pool.query(
    `
    SELECT max_discount_percent
    FROM discount_rules
    WHERE customer_tier_id = $1
    AND product_category_id = $2
    `,
    [input.customerTierId, input.productCategoryId],
  );

  if (result.rows.length === 0) {
    throw new Error(
      "No discount rule configured for this customer tier and product category",
    );
  }

  const allowedDiscount = Number(result.rows[0].max_discount_percent);

  const exceededBy = Math.max(0, input.discountPercent - allowedDiscount);

  return {
    allowedDiscount,
    discountPercent: input.discountPercent,
    exceededBy,
    isViolation: exceededBy > 0,
  };
}
