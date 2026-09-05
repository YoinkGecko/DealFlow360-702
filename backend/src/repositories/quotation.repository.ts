import type { PoolClient } from "pg";

interface CreateQuotationData {
  quotationNumber: string;
  customerId: string;
  salesRepId: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  totalCost: number;
  marginAmount: number;
  riskScore: number;
}

export async function createQuotation(client: PoolClient,data: CreateQuotationData) {
  const result = await client.query(
    `
    INSERT INTO quotations (
      quotation_number,
      customer_id,
      sales_rep_id,
      status,
      subtotal,
      discount_amount,
      total_amount,
      total_cost,
      margin_amount,
      risk_score
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      data.quotationNumber,
      data.customerId,
      data.salesRepId,
      data.status,
      data.subtotal,
      data.discountAmount,
      data.totalAmount,
      data.totalCost,
      data.marginAmount,
      data.riskScore,
    ],
  );

  return result.rows[0];
}

export async function createQuotationItem(
  client: PoolClient,
  quotationId: string,
  data: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    unitCost: number;
    lineSubtotal: number;
    lineTotal: number;
    lineMargin: number;
  },
) {
  const result = await client.query(
    `
    INSERT INTO quotation_items (
      quotation_id,
      product_id,
      quantity,
      unit_price,
      discount_percent,
      discount_amount,
      unit_cost,
      line_subtotal,
      line_total,
      line_margin
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      quotationId,
      data.productId,
      data.quantity,
      data.unitPrice,
      data.discountPercent,
      data.discountAmount,
      data.unitCost,
      data.lineSubtotal,
      data.lineTotal,
      data.lineMargin,
    ],
  );

  return result.rows[0];
}

export async function createApprovalRequest(
  client: PoolClient,
  quotationId: string,
  level: "SALES_MANAGER" | "FINANCE",
  sequenceNo: number,
  reason: string,
) {
  const result = await client.query(
    `
    INSERT INTO approval_requests (
      quotation_id,
      level,
      sequence_no,
      status,
      reason
    )
    VALUES ($1,$2,$3,'PENDING',$4)
    RETURNING *
    `,
    [quotationId, level, sequenceNo, reason],
  );

  return result.rows[0];
}
