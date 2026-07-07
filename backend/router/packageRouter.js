import express from "express";
import multer from "multer";
import { canAccess } from "../middleware/permissionMiddleware.js";
import * as packageController from "../controllers/packageController.js";
import { createDiskStorage } from "../utils/multerUtils.js";

const router = express.Router();

// ============================================================================
// CONFIGURATION (Shared Uploads Directory)
// ============================================================================
const uploadDir = "uploads/imports/";
const storage = createDiskStorage(uploadDir, "package-update");
const upload = multer({ storage: storage });

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/packages/export
 * Export Data Paket ke Excel (Job)
 */
router.get("/export", canAccess("manage-products"), packageController.exportPackages);

/**
 * POST /api/packages/batch/update
 * Upload Revision File Paket (Job)
 */
router.post(
  "/batch/update",
  canAccess("manage-products"),
  upload.single("file"),
  packageController.importPackagesBatch
);

export default router;
