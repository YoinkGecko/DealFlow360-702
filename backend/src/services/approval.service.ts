import { pool } from "../config/pool.js";

import {
  findApprovalById,
  updateApprovalStatus,
  updateQuotationStatus,
  createApprovalLog,
} from "../repositories/approval.repository.js";

import type { ApprovalActionInput } from "../types/approval.types.js";

export async function approveQuotation(
  approvalId: string,
  approverId: string,
  input: ApprovalActionInput,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const approval = await findApprovalById(client, approvalId);

    if (!approval) {
      throw new Error("Approval request not found");
    }

    if (approval.status !== "PENDING") {
      throw new Error("This approval request has already been processed");
    }

    /*
     * Update approval request
     */
    const updatedApproval = await updateApprovalStatus(
      client,
      approvalId,
      "APPROVED",
      approverId,
      input.reason,
    );

    /*
     * Record audit log
     */
    await createApprovalLog(client, {
      quotationId: approval.quotation_id,
      approvalRequestId: approval.id,
      userId: approverId,
      action: "APPROVED",
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    });

    /*
     * Check whether another approval level
     * is still pending.
     */
    const pendingResult = await client.query(
      `
        SELECT id
        FROM approval_requests
        WHERE quotation_id = $1
          AND status = 'PENDING'
        `,
      [approval.quotation_id],
    );

    let quotationStatus: "APPROVED" | "PENDING_APPROVAL";

    if (pendingResult.rows.length > 0) {
      quotationStatus = "PENDING_APPROVAL";
    } else {
      quotationStatus = "APPROVED";
    }

    /*
     * Update quotation
     */
    const quotation = await updateQuotationStatus(
      client,
      approval.quotation_id,
      quotationStatus,
    );

    await client.query("COMMIT");

    return {
      approval: updatedApproval,
      quotation,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

export async function rejectQuotation(
  approvalId: string,
  approverId: string,
  input: ApprovalActionInput,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const approval = await findApprovalById(client, approvalId);

    if (!approval) {
      throw new Error("Approval request not found");
    }

    if (approval.status !== "PENDING") {
      throw new Error("This approval request has already been processed");
    }

    /*
     * Update approval request
     */
    const updatedApproval = await updateApprovalStatus(
      client,
      approvalId,
      "REJECTED",
      approverId,
      input.reason,
    );

    /*
     * Audit trail
     */
    await createApprovalLog(client, {
      quotationId: approval.quotation_id,
      approvalRequestId: approval.id,
      userId: approverId,
      action: "REJECTED",
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    });

    /*
     * Reject entire quotation
     */
    const quotation = await updateQuotationStatus(
      client,
      approval.quotation_id,
      "REJECTED",
    );

    await client.query("COMMIT");

    return {
      approval: updatedApproval,
      quotation,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
