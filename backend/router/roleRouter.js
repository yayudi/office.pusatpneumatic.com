// backend/router/roleRouter.js
import express from "express";
import * as roleController from "../controllers/roleController.js";
import { validate } from "../middleware/validate.js";
import { roleSchema, assignPermissionsSchema } from "../validators/roleValidator.js";

const router = express.Router();

/**
 * GET /api/roles
 * Mengambil daftar semua peran (roles) yang ada di sistem.
 */
router.get("/", roleController.getRoles);

/**
 * GET /api/roles/permissions
 * Mengambil daftar semua izin (permissions) yang tersedia di sistem.
 */
router.get("/permissions", roleController.getPermissions);

/**
 * GET /api/roles/:id/permissions
 * Mengambil ID izin yang dimiliki oleh sebuah peran spesifik.
 */
router.get("/:id/permissions", roleController.getRolePermissions);

/**
 * PUT /api/roles/:id/permissions
 * Memperbarui semua izin untuk sebuah peran spesifik.
 */
router.put("/:id/permissions", validate(assignPermissionsSchema), roleController.updateRolePermissions);

/**
 * POST /api/roles
 * Membuat peran baru.
 */
router.post("/", validate(roleSchema), roleController.createRole);

/**
 * PUT /api/roles/:id
 * Mengedit nama/deskripsi peran.
 */
router.put("/:id", validate(roleSchema), roleController.updateRole);

/**
 * DELETE /api/roles/:id
 * Menghapus peran.
 */
router.delete("/:id", roleController.deleteRole);

export default router;
