import * as categoryService from "../services/categoryService.js";

/**
 * Mengambil semua kategori yang aktif
 */
export const getCategories = async (req, res) => {
  try {
    const data = await categoryService.getAllCategories();
    res.status(200).json({
      success: true,
      message: "Data kategori berhasil diambil",
      data,
    });
  } catch (error) {
    console.error("Error getCategories:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kategori",
      error_code: "INTERNAL_SERVER_ERROR",
    });
  }
};

/**
 * Membuat kategori baru
 */
export const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Nama kategori harus diisi",
      error_code: "VALIDATION_ERROR",
    });
  }

  try {
    const data = await categoryService.createCategory(name);
    res.status(201).json({
      success: true,
      message: "Kategori berhasil dibuat",
      data,
    });
  } catch (error) {
    console.error("Error createCategory:", error);
    if (error.code === 'DUPLICATE_ENTRY') {
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: "DUPLICATE_ENTRY",
      });
    }
    res.status(500).json({
      success: false,
      message: "Gagal membuat kategori",
      error_code: "INTERNAL_SERVER_ERROR",
    });
  }
};

/**
 * Mengupdate kategori
 */
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Nama kategori harus diisi",
      error_code: "VALIDATION_ERROR",
    });
  }

  try {
    await categoryService.updateCategory(id, name);
    res.status(200).json({
      success: true,
      message: "Kategori berhasil diupdate",
    });
  } catch (error) {
    console.error("Error updateCategory:", error);
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: error.message,
        error_code: "NOT_FOUND",
      });
    }
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate kategori",
      error_code: "INTERNAL_SERVER_ERROR",
    });
  }
};

/**
 * Menghapus kategori (Soft Delete)
 */
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    await categoryService.deleteCategory(id);
    res.status(200).json({
      success: true,
      message: "Kategori berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleteCategory:", error);
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: error.message,
        error_code: "NOT_FOUND",
      });
    }
    res.status(500).json({
      success: false,
      message: "Gagal menghapus kategori",
      error_code: "INTERNAL_SERVER_ERROR",
    });
  }
};
