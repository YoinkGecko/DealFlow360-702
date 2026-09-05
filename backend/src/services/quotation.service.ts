import { pool } from "../config/pool.js";

import { checkDiscount } from "./discount.engine.js";

import { determineApprovalChain } from "./approval.engine.js";

import {
  createQuotation,
  createQuotationItem,
  createApprovalRequest,
} from "../repositories/quotation.repository.js";

import type { CreateQuotationInput } from "../types/quotation.types.js";

export async function createQuotationService(input: CreateQuotationInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let subtotal = 0;
    let discountAmount = 0;
    let totalAmount = 0;
    let totalCost = 0;
    let riskScore = 0;

    const processedItems = [];

    /*
     * Get customer tier
     */
    const customerResult = await client.query(
      `
      SELECT tier_id
      FROM customers
      WHERE id = $1
      `,
      [input.customerId],
    );

    if (customerResult.rows.length === 0) {
      throw new Error("Customer not found");
    }

    const customerTierId = customerResult.rows[0].tier_id;

    /*
     * Process every quotation item
     */
    for (const item of input.items) {
      const productResult = await client.query(
        `
        SELECT
          id,
          name,
          category_id,
          selling_price,
          cost_price
        FROM products
        WHERE id = $1
          AND is_active = TRUE
        `,
        [item.productId],
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const product = productResult.rows[0];

      const unitPrice = Number(product.selling_price);

      const unitCost = Number(product.cost_price);

      /*
       * Discount governance
       */
      const discountCheck = await checkDiscount({
        customerTierId,
        productCategoryId: product.category_id,
        discountPercent: item.discountPercent,
      });

      /*
       * Risk calculation
       *
       * Our initial implementation:
       * every 1% beyond allowed = 5 risk points
       */
      if (discountCheck.isViolation) {
        riskScore += discountCheck.exceededBy * 5;
      }

      /*
       * Financial calculations
       */
      const lineSubtotal = unitPrice * item.quantity;

      const lineDiscount = lineSubtotal * (item.discountPercent / 100);

      const lineTotal = lineSubtotal - lineDiscount;

      const lineCost = unitCost * item.quantity;

      const lineMargin = lineTotal - lineCost;

      subtotal += lineSubtotal;
      discountAmount += lineDiscount;
      totalAmount += lineTotal;
      totalCost += lineCost;

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: lineDiscount,
        unitCost,
        lineSubtotal,
        lineTotal,
        lineMargin,
      });
    }

    /*
     * Keep risk score between 0 and 100
     */
    riskScore = Math.min(100, Number(riskScore.toFixed(2)));

    /*
     * Determine approval chain
     */
    const approvalChain = await determineApprovalChain(riskScore);

    let quotationStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" = "DRAFT";

    if (approvalChain !== "NONE") {
      quotationStatus = "PENDING_APPROVAL";
    }

    /*
     * Margin
     */
    const marginAmount = totalAmount - totalCost;

    /*
     * Generate quotation number
     */
    const quotationNumber = `QT-${Date.now()}`;

    /*
     * Create quotation
     */
    const quotation = await createQuotation(client,{
      quotationNumber,
      customerId: input.customerId,
      salesRepId: input.salesRepId,
      status: quotationStatus,
      subtotal,
      discountAmount,
      totalAmount,
      totalCost,
      marginAmount,
      riskScore,
    });

    /*
     * Create quotation items
     */
    for (const item of processedItems) {
      await createQuotationItem(client,quotation.id, item);
    }

    /*
     * Create approval requests
     */
    if (approvalChain === "MANAGER" || approvalChain === "MANAGER_FINANCE") {
      await createApprovalRequest(
        client,
        quotation.id,
        "SALES_MANAGER",
        1,
        `Discount risk detected. Risk score: ${riskScore}`,
      );
    }

    if (approvalChain === "MANAGER_FINANCE") {
      await createApprovalRequest(
        client,
        quotation.id,
        "FINANCE",
        2,
        `High deal risk. Risk score: ${riskScore}`,
      );
    }

    await client.query("COMMIT");

    return {
      quotation,
      riskScore,
      approvalChain,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
