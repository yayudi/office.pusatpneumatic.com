// backend/router/productRouter.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { canAccess } from "../middleware/permissionMiddleware.js";
import * as productController from "../controllers/productController.js";
import { createJobService } from "../services/jobService.js";
import AppError from "../utils/AppError.js";
import Logger from "../utils/logger.js";
import { createDiskStorage } from "../utils/multerUtils.js";
import { validate } from "../middleware/validate.js";
import { productSchema, linkMediaSchema } from "../validators/productValidator.js";

const router = express.Router();

// ============================================================================
// CONFIGURATION
// ============================================================================
const uploadDir = "uploads/imports/";
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    Logger.info(`Folder created: ${uploadDir}`, "PRODUCT_ROUTER");
  } catch (err) {
    Logger.error(`Failed to create folder ${uploadDir}`, err, "PRODUCT_ROUTER");
  }
}

// Setup Multer (Simpan sementara di folder imports sebelum diproses worker)
const storage = createDiskStorage(uploadDir, "price-update");
const upload = multer({ storage: storage });

// CONFIG: Multer untuk Product Images
const productUploadDir = "uploads/products/";
if (!fs.existsSync(productUploadDir)) {
  try {
    fs.mkdirSync(productUploadDir, { recursive: true });
    Logger.info(`Folder created: ${productUploadDir}`, "PRODUCT_ROUTER");
  } catch (err) {
    Logger.error(`Failed to create folder ${productUploadDir}`, err, "PRODUCT_ROUTER");
  }
}

const productStorage = createDiskStorage(productUploadDir, "prod");

const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit 2MB (Backend protection)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan!"), false);
    }
  },
});

// ============================================================================
// SPECIFIC ROUTES (MUST BE DEFINED FIRST)
// ============================================================================

/**
 * POST /api/products/batch/product-update
 * Upload CSV untuk update harga massal via background worker.
 * Memerlukan permission 'manage-products'.
 */
router.post(
  "/batch/product-update",
  canAccess("manage-products"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError("File tidak ditemukan.", 400));
      }
      const { dryRun } = req.body;
      const jobType = dryRun === "true" ? "BATCH_EDIT_PRODUCT_DRY_RUN" : "BATCH_EDIT_PRODUCT";
      const jobId = await createJobService({
        userId: req.user.id,
        type: jobType,
        originalname: req.file.originalname,
        serverFilePath: req.file.path,
        notes: "Mass Price Update via Web Upload",
      });

      res.status(201).json({
        success: true,
        message: "File berhasil diunggah. Proses update berjalan di latar belakang.",
        jobId: jobId,
      });
    } catch (error) {
      next(new AppError(`Gagal memproses upload: ${error.message}`, 500));
    }
  },
);

/**
 * GET /api/products/export
 * Export data produk ke CSV untuk template edit.
 */
router.get("/export", canAccess("manage-products"), productController.exportProducts);

/**
 * GET /api/products/search
 * Endpoint untuk pencarian autocomplete.
 */
router.get("/search", productController.searchProducts);

/**
 * GET /api/products/admin-list
 * Mengambil daftar semua produk aktif untuk dropdown admin.
 */
router.get("/admin-list", canAccess("manage-products"), productController.getAdminProductList);

// ============================================================================
// GENERAL ROUTES
// ============================================================================

/**
 * GET /api/products
 * Endpoint utama WMS (List produk dengan filter, pagination, sort).
 */
router.get("/", productController.getProducts);

// ============================================================================
// PARAMETERIZED ROUTES (MUST BE LAST)
// ============================================================================

/**
 * GET /api/products/:id
 * Mengambil detail produk lengkap (termasuk komponen paket & stok).
 */
router.get("/:id", productController.getProductById);

/**
 * GET /api/products/:id/stock-details
 * Mengambil rincian stok per lokasi untuk produk tertentu.
 */
router.get("/:id/stock-details", productController.getProductStockDetails);

/**
 * GET /api/products/:id/history
 * Mengambil audit log perubahan produk (Harga, Nama, Berat, dll).
 */
router.get("/:id/history", canAccess("view-prices"), productController.getProductHistory);

/**
 * GET /api/products/:id/stock-timeline
 * Mengambil riwayat mutasi dan saldo stok secara berurutan mundur.
 */
router.get("/:id/stock-timeline", productController.getProductStockTimeline);

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * POST /api/products
 * Membuat produk baru (Mendukung Paket, Berat & Foto).
 */
router.post(
  "/",
  canAccess("product.image.upload"),
  productUpload.array("images", 5),
  validate(productSchema),
  productController.createProduct,
);

/**
 * PUT /api/products/:id
 * Mengupdate produk (Mendukung Paket, Berat, Foto & Restore).
 */
router.put(
  "/:id",
  canAccess("product.image.upload"),
  productUpload.array("images", 5),
  validate(productSchema),
  productController.updateProduct,
);

/**
 * DELETE /api/products/:id
 * Soft delete produk (set is_active = 0, deleted_at = NOW).
 */
router.delete("/:id", canAccess("product.image.delete"), productController.deleteProduct);

// ============================================================================
// IMAGE SPECIFIC ROUTES (GRANULAR PERMISSIONS)
// ============================================================================

/**
 * POST /api/products/:id/link-media
 * Link existing media to product. Permission: 'product.image.upload'
 */
router.post(
  "/:id/link-media",
  canAccess("product.image.upload"),
  validate(linkMediaSchema),
  productController.linkMediaToProduct,
);

/**
 * POST /api/products/:id/images
 * Upload/Ganti gambar produk. Permission: 'product.image.upload'
 */
router.post(
  "/:id/images",
  canAccess("product.image.upload"),
  productUpload.any(), // DEBUG: Allow any field to inspect what is being sent
  productController.uploadMoreImages,
);

/**
 * PUT /api/products/:id/images/:imageId/primary
 * Set gambar sebagai cover utama. Permission: 'product.image.upload'
 */
router.put(
  "/:id/images/:imageId/primary",
  canAccess("product.image.upload"),
  productController.setPrimaryImage,
);

/**
 * DELETE /api/products/:id/images/:imageId
 * Hapus gambar spesifik. Permission: 'product.image.delete'
 */
router.delete(
  "/:id/images/:imageId",
  canAccess("product.image.delete"),
  productController.deleteProductImage,
);

export default router;
