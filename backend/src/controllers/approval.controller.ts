import type { Request, Response, NextFunction } from "express";

import {
  approveQuotation,
  rejectQuotation,
} from "../services/approval.service.js";

export async function approveApproval(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const approvalId = req.params.id;
    if (typeof approvalId !== "string") {
      throw new Error("Approval ID is required");
    }

    /*
     * Temporary:
     * pass approver ID through the request body.
     */
    const approverId = req.user!.id;

    const result = await approveQuotation(approvalId, approverId, {
      reason: req.body.reason,
    });

    res.status(200).json({
      success: true,
      message: "Approval completed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectApproval(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const approvalId = req.params.id;
    if (typeof approvalId !== "string") {
      throw new Error("Approval ID is required");
    }

    const approverId = req.user!.id;

    const result = await rejectQuotation(approvalId, approverId, {
      reason: req.body.reason,
    });

    res.status(200).json({
      success: true,
      message: "Quotation rejected successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
