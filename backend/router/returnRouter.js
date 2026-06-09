// backend/router/returnRouter.js
import express from "express";
import { canAccess } from "../middleware/permissionMiddleware.js";
import * as returnController from "../controllers/returnController.js";

const router = express.Router();
import { validate } from "../middleware/validate.js";
import { createManualReturnSchema, approveReturnSchema } from "../validators/returnValidator.js";

// GET: List Barang Pending Retur
router.get("/pending", returnController.getPendingReturns);

// GET: List Riwayat Retur Barang
router.get("/history", returnController.getReturnHistory);

// POST: Input Retur Manual
router.post(
  "/manual-entry",
  canAccess("manage-stock-adjustment"),
  validate(createManualReturnSchema),
  returnController.createManualReturn
);

// POST: Approve & Restock
router.post("/approve", canAccess("manage-stock-adjustment"), validate(approveReturnSchema), returnController.approveReturn);

export default router;
