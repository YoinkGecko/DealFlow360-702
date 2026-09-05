import { Router } from "express";

import { createQuotation } from "../controllers/quotation.controller.js";

import { validate } from "../middleware/validate.middleware.js";

import { createQuotationSchema } from "../validators/quotation.validator.js";

const router = Router();

router.post("/", validate(createQuotationSchema), createQuotation);

export default router;
