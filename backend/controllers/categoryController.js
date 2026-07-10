import catchAsync from "../utils/catchAsync.js";
// backend/controllers/categoryController.js
import * as categoryService from "../services/categoryService.js";
import Logger from "../utils/logger.js";

import AppError from "../utils/AppError.js";
/**
 * Mengambil semua kategori yang aktif
 */
export const getCategories = catchAsync(async (req, res, next) => {
  const data = await categoryService.getAllCategories();
  res.status(200).json({
    success: true,
    message: "Data kategori berhasil diambil",
    data,
  });
});

/**
 * Membuat kategori baru
 */
export const createCategory = async (req, res, next) => {
  const { name } = req.body;

  try {
    const data = await categoryService.createCategory(name);
    res.status(201).json({
      success: true,
      message: "Kategori berhasil dibuat",
      data,
    });
  } catch (error) {
    Logger.error("Error createCategory", error, "CATEGORY_CONTROLLER");
    if (error.code === "DUPLICATE_ENTRY") {
      return next(error);
    }
    return next(new AppError("Gagal membuat kategori", 500));
  }
};

/**
 * Mengupdate kategori
 */
export const updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    await categoryService.updateCategory(id, name);
    res.status(200).json({
      success: true,
      message: "Kategori berhasil diupdate",
    });
  } catch (error) {
    Logger.error("Error updateCategory", error, "CATEGORY_CONTROLLER");
    if (error.code === "NOT_FOUND") {
      return next(error);
    }
    return next(new AppError("Gagal mengupdate kategori", 500));
  }
};

/**
 * Menghapus kategori (Soft Delete)
 */
export const deleteCategory = async (req, res, next) => {
  const { id } = req.params;

  try {
    await categoryService.deleteCategory(id);
    res.status(200).json({
      success: true,
      message: "Kategori berhasil dihapus",
    });
  } catch (error) {
    Logger.error("Error deleteCategory", error, "CATEGORY_CONTROLLER");
    if (error.code === "NOT_FOUND") {
      return next(error);
    }
    return next(new AppError("Gagal menghapus kategori", 500));
  }
};
