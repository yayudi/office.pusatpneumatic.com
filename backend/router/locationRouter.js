// backend/router/locationRouter.js
import express from "express";
import { canAccess } from "../middleware/permissionMiddleware.js";
import * as locationController from "../controllers/locationController.js";
import { validate } from "../middleware/validate.js";
import { locationSchema } from "../validators/locationValidator.js";

const router = express.Router();

/**
 * GET /api/locations
 * Mengambil daftar semua lokasi. Endpoint ini bisa diakses oleh pengguna biasa (untuk dropdown).
 */
router.get("/", locationController.getAllLocations);

/**
 * POST /api/locations
 * Membuat lokasi baru. Hanya untuk admin dengan izin 'manage-locations'.
 */
router.post("/", canAccess("manage-locations"), validate(locationSchema), locationController.createLocation);

/**
 * PUT /api/locations/:id
 * Mengedit lokasi yang ada. Hanya untuk admin dengan izin 'manage-locations'.
 */
router.put("/:id", canAccess("manage-locations"), validate(locationSchema), locationController.updateLocation);

/**
 * DELETE /api/locations/:id
 * Menghapus lokasi. Hanya untuk admin dengan izin 'manage-locations'.
 */
router.delete("/:id", canAccess("manage-locations"), locationController.deleteLocation);

/*
 * [INVESTIGASI] GET /api/locations/:id/stock-sample
 * Mengambil sampel 10 produk pertama yang memiliki stok di lokasi ini.
 */
router.get("/:id/stock-sample", locationController.getStockSample);

export default router;
