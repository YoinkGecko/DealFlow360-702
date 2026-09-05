import type { Request, Response, NextFunction } from "express";

import { createQuotationService } from "../services/quotation.service.js";

export async function createQuotation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await createQuotationService(req.body);

    res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
