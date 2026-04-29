import express from "express";
import * as categoryController from "../controllers/categoryController.js";

const router = express.Router();

/**
 * GET /api/categories
 * Mengambil semua kategori aktif
 */
router.get("/", categoryController.getCategories);

/**
 * POST /api/categories
 * Membuat kategori baru
 */
router.post("/", categoryController.createCategory);

/**
 * PUT /api/categories/:id
 * Mengupdate nama kategori
 */
router.put("/:id", categoryController.updateCategory);

/**
 * DELETE /api/categories/:id
 * Menghapus kategori (soft delete)
 */
router.delete("/:id", categoryController.deleteCategory);

export default router;
