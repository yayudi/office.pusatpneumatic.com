// backend/router/stockRequestRouter.js
import express from "express";
import * as stockRequestController from "../controllers/stockRequestController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import { canAccess } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// Semua route di sini wajib login
router.use(authenticateToken);

// ============================================================================
// STOCK REQUESTS API
// ============================================================================

/**
 * GET /api/stock-requests
 * Mengambil daftar permintaan stok
 */
router.get("/", stockRequestController.getStockRequests);

/**
 * POST /api/stock-requests
 * Membuat permintaan stok baru
 */
router.post("/", stockRequestController.createStockRequest);

/**
 * POST /api/stock-requests/:id/approve
 * Menyetujui permintaan stok. Menggunakan permission khusus.
 */
router.post(
  "/:id/approve",
  canAccess(["approve-stock-requests"]),
  stockRequestController.approveStockRequest
);

/**
 * POST /api/stock-requests/:id/reject
 * Menolak permintaan stok. Menggunakan permission khusus.
 */
router.post(
  "/:id/reject",
  canAccess(["approve-stock-requests"]),
  stockRequestController.rejectStockRequest
);

/**
 * POST /api/stock-requests/:id/complete
 * Menerima barang dan menyelesaikan permintaan.
 */
router.post("/:id/complete", stockRequestController.completeStockRequest);

export default router;
