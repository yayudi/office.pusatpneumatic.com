import express from "express";
import * as investigationController from "../controllers/investigationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { canAccess } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// GET /api/investigation/duplicates
router.get("/duplicates", canAccess("view-system-logs"), investigationController.getDuplicateTransactions);

// POST /api/investigation/revert/:id
router.post("/revert/:id", canAccess("manage-stock-adjustment"), investigationController.revertTransaction);

export default router;
