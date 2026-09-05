import type { PoolClient } from "pg";

export async function findApprovalById(client: PoolClient, approvalId: string) {
  const result = await client.query(
    `
    SELECT
      ar.id,
      ar.quotation_id,
      ar.level,
      ar.sequence_no,
      ar.approver_id,
      ar.status,
      ar.requested_at,
      ar.acted_at,
      ar.reason,

      q.quotation_number,
      q.status AS quotation_status,
      q.customer_id,
      q.sales_rep_id,
      q.total_amount,
      q.discount_amount,
      q.margin_amount,
      q.risk_score

    FROM approval_requests ar

    JOIN quotations q
      ON q.id = ar.quotation_id

    WHERE ar.id = $1
    `,
    [approvalId],
  );

  return result.rows[0] ?? null;
}

export async function updateApprovalStatus(
  client: PoolClient,
  approvalId: string,
  status: "APPROVED" | "REJECTED" | "REVISION_REQUIRED",
  approverId: string,
  reason?: string,
) {
  const result = await client.query(
    `
    UPDATE approval_requests
    SET
      status = $1,
      approver_id = $2,
      acted_at = NOW(),
      reason = COALESCE($3, reason)
    WHERE id = $4
    RETURNING *
    `,
    [status, approverId, reason ?? null, approvalId],
  );

  return result.rows[0];
}

export async function updateQuotationStatus(
  client: PoolClient,
  quotationId: string,
  status: "APPROVED" | "REJECTED" | "PENDING_APPROVAL",
) {
  const result = await client.query(
    `
    UPDATE quotations
    SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [status, quotationId],
  );

  return result.rows[0];
}

export async function createApprovalLog(
  client: PoolClient,
  data: {
    quotationId: string;
    approvalRequestId: string;
    userId: string;
    action: "APPROVED" | "REJECTED" | "RETURNED_FOR_REVISION";
    reason?: string;
  },
) {
  const result = await client.query(
    `
    INSERT INTO approval_logs (
      quotation_id,
      approval_request_id,
      user_id,
      action,
      reason
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      data.quotationId,
      data.approvalRequestId,
      data.userId,
      data.action,
      data.reason ?? null,
    ],
  );

  return result.rows[0];
}
