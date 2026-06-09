import express from "express";
import * as investigationController from "../controllers/investigationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// GET /api/investigation/duplicates
router.get("/duplicates", investigationController.getDuplicateTransactions);

export default router;
