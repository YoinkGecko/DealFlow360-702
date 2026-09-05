import { Router } from "express";

import {
  approveApproval,
  rejectApproval,
} from "../controllers/approval.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.post(
  "/:id/approve",
  authenticate,
  authorize("SALES_MANAGER", "FINANCE"),
  approveApproval,
);

router.post(
  "/:id/reject",
  authenticate,
  authorize("SALES_MANAGER", "FINANCE"),
  rejectApproval,
);

export default router;
