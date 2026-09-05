import { Router } from "express";

import {
  approveApproval,
  rejectApproval,
} from "../controllers/approval.controller.js";

const router = Router();

router.post("/:id/approve", approveApproval);

router.post("/:id/reject", rejectApproval);

export default router;
