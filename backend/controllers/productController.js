// backend/controllers/productController.js
import db from "../config/db.js";
import cache from "../config/cache.js";
import * as productService from "../services/productService.js";
import * as productRepo from "../repositories/productRepository.js";
import * as jobRepo from "../repositories/jobRepository.js";

// ============================================================================
// READ OPERATIONS (Direct Repo Access)
// ============================================================================

// GET /search
// Mencari produk untuk autocomplete
export const searchProducts = async (req, res) => {
  try {
    const { q, locationId } = req.query;
    const searchTerm = `%${q ? q.toLowerCase() : ""}%`;
    const results = await productRepo.searchProducts(db, searchTerm, locationId);
    res.json(results);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /admin-list
// Mengambil daftar ringkas untuk dropdown/list admin
export const getAdminProductList = async (req, res) => {
  try {
    const rows = await productRepo.getAllActiveProducts(db);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error admin list:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data produk." });
  }
};

// GET /
// Main Product List (Mendukung Filter Status, Tipe, Search, Sort)
export const getProducts = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search || "",
      searchBy: req.query.searchBy === "sku" ? "sku" : "name",
      location: req.query.location || "all",
      status: req.query.status || "active",
      is_package: req.query.is_package !== undefined ? req.query.is_package === "true" : undefined,
      packageOnly: req.query.packageOnly === "true",
      stockStatus: req.query.minusOnly === "true" ? "minus" : (req.query.stockStatus || "all"),
      building: req.query.building || "all",
      floor: req.query.floor || "all",
      sortBy: req.query.sortBy || "sku",
      sortOrder: req.query.sortOrder === "asc" ? "ASC" : "DESC",
    };
    filters.offset = (filters.page - 1) * filters.limit;
    const result = await productRepo.getProductsWithFilters(db, filters);
    res.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data produk.",
      error: error.message,
    });
  }
};

// GET /:id
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await productRepo.getProductDetailWithStock(db, id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product detail:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /:id/stock-details
export const getProductStockDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await productRepo.getProductStockDetails(db, id);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`Error stok detail ID ${id}:`, error);
    res.status(500).json({ success: false, message: "Gagal mengambil detail stok." });
  }
};

// GET /:id/history
export const getProductHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await productRepo.getProductHistory(db, id);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error("Error fetching product history:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil riwayat produk." });
  }
};

// ============================================================================
// WRITE OPERATIONS (Via Service Layer)
// ============================================================================

// POST /
// Membuat produk baru
export const createProduct = async (req, res) => {
  const { sku, name, category, price, weight, is_package } = req.body;
  let components = req.body.components;

  // Handle Components JSON parsing from FormData
  if (typeof components === "string") {
    try {
      components = JSON.parse(components);
    } catch (e) {
      components = [];
    }
  }

  const userId = req.user.id;
  const images = req.files || []; // Array of files

  // Validasi Input
  if (!sku || !name) {
    return res.status(400).json({ success: false, message: "SKU & Nama wajib diisi." });
  }
  if (is_package === "true" || is_package === true) {
    if (!components || components.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Produk paket wajib memiliki komponen." });
    }
  }

  try {
    const productId = await productService.createProductService(
      { sku, name, category, price, weight, is_package, components, images },
      userId
    );

    cache.flushAll(); // Reset cache WMS
    res.status(201).json({ success: true, message: "Produk berhasil dibuat.", productId });
  } catch (error) {
    console.error("Create Product Error:", error);
    if (error.code === "DUPLICATE_SKU" || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "SKU sudah terdaftar." });
    }
    res.status(500).json({ success: false, message: "Gagal membuat produk." });
  }
};

// PUT /:id
// Memperbarui produk
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, category, price, weight, is_package, is_active } = req.body;

  let components = req.body.components;
  if (typeof components === "string") {
    try {
      components = JSON.parse(components);
    } catch (e) {
      components = [];
    }
  }

  const userId = req.user.id;
  const images = req.files || [];

  // Handle Restore Action (Specific Case)
  if (is_active === true && !name) {
    try {
      await productService.restoreProductService(id, userId);
      cache.flushAll();
      return res.json({ success: true, message: "Produk berhasil dipulihkan." });
    } catch (error) {
      console.error("Restore Error:", error);
      return res.status(500).json({ success: false, message: "Gagal memulihkan produk." });
    }
  }

  // Regular Update
  if (!name) return res.status(400).json({ success: false, message: "Nama wajib diisi." });

  try {
    await productService.updateProductService(
      id,
      { name, category, price, weight, is_package, components, images },
      userId
    );

    cache.flushAll();
    res.json({ success: true, message: "Produk berhasil diperbarui." });
  } catch (error) {
    console.error("Update Product Error:", error);
    if (error.code === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
    }
    res.status(500).json({ success: false, message: "Gagal update produk." });
  }
};

// DELETE /:id
// Soft delete produk (set is_active = 0)
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    await productService.softDeleteProductService(id, userId);
    cache.flushAll();
    res.json({ success: true, message: "Produk berhasil diarsipkan." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /:id/link-media
export const linkMediaToProduct = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { mediaIds } = req.body;

  if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
    return res.status(400).json({ success: false, message: "Media ID tidak valid atau kosong." });
  }

  try {
    await productService.linkMediaToProductService(id, mediaIds, userId);
    cache.flushAll(); 
    return res.json({
      success: true,
      message: "Media berhasil disematkan.",
    });
  } catch (error) {
    console.error("Link Media Error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyematkan media." });
  }
};

// POST /:id/images
export const uploadMoreImages = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const images = req.files;

  // Handle Raw Uploads (Old Flow / Backward Compat)
  if (!images || images.length === 0) {
    return res.status(400).json({ success: false, message: "Tidak ada gambar yang diunggah." });
  }

  try {
    // This expects insertImages to be defined (Currently missing in repo but keeping logic intact if it exists elsewhere)
    await productService.uploadProductImagesService(id, images, userId);
    cache.flushAll(); // Reset cache
    res.json({
      success: true,
      message: `${images.length} gambar berhasil ditambahkan.`,
    });
  } catch (error) {
    console.error("Upload Images Error:", error);
    res.status(500).json({ success: false, message: "Gagal mengunggah gambar." });
  }
};

// DELETE /:id/images/:imageId
export const deleteProductImage = async (req, res) => {
  const { imageId } = req.params; // Get imageId from URL
  const userId = req.user.id;

  try {
    await productService.deleteProductImageService(imageId, userId);
    cache.flushAll();
    res.json({ success: true, message: "Gambar berhasil dihapus." });
  } catch (error) {
    console.error("Delete Image Error:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus gambar." });
  }
};

// PUT /:id/images/:imageId/primary
export const setPrimaryImage = async (req, res) => {
  const { id, imageId } = req.params;
  const userId = req.user.id;

  try {
    await productService.setPrimaryImageService(id, imageId, userId);
    cache.flushAll();
    res.json({ success: true, message: "Gambar utama berhasil diatur." });
  } catch (error) {
    console.error("Set Primary Image Error:", error);
    res.status(500).json({ success: false, message: "Gagal mengatur gambar utama." });
  }
};

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

/**
 * GET /api/products/export
 * Mengenerate Job Export CSV berdasarkan filter yang aktif (untuk Template Edit Massal)
 */
export const exportProducts = async (req, res) => {
  try {
    const filters = {
      search: req.query.search || "",
      searchBy: req.query.searchBy === "sku" ? "sku" : "name",
      location: req.query.location || "all",
      status: req.query.status || "active",
      is_package: req.query.is_package !== undefined ? req.query.is_package === "true" : undefined,
      packageOnly: req.query.packageOnly === "true",
      minusStockOnly: req.query.minusOnly === "true",
      building: req.query.building || "all",
      floor: req.query.floor || "all",
      sortBy: req.query.sortBy || "sku",
      sortOrder: req.query.sortOrder === "desc" ? "DESC" : "ASC",
      limit: 1000000,
      offset: 0,
      exportType: "PRODUCT_MASTER",
      format: req.query.format || "xlsx",
    };

    const userId = req.user.id;
    const jobId = await jobRepo.createExportJob(db, { userId, filters, jobType: "PRODUCT_MASTER" });

    res.json({
      success: true,
      message: "Permintaan ekspor diterima. Silakan cek menu 'Laporan Saya' untuk mengunduh.",
      jobId,
    });
  } catch (error) {
    console.error("Export Request Error:", error);
    res.status(500).json({ success: false, message: "Gagal membuat permintaan ekspor." });
  }
};
