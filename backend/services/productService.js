// backend/services/productService.js
import db from "../config/db.js";
import * as productRepo from "../repositories/productRepository.js";

import fs from "fs/promises";
import path from "path";

// Helper Internal: Mencatat Log Audit hanya jika ada perubahan
const logChange = async (connection, productId, userId, action, field, oldVal, newVal) => {
  if (oldVal !== newVal) {
    await productRepo.insertAuditLog(connection, {
      productId,
      userId,
      action,
      field,
      oldVal,
      newVal,
    });
  }
};

export const createProductService = async (data, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Business Logic: Cek Duplikasi SKU
    const existingId = await productRepo.getIdBySku(connection, data.sku);
    if (existingId) {
      const error = new Error("SKU sudah terdaftar.");
      error.code = "DUPLICATE_SKU";
      throw error;
    }

    // 2. Insert Product
    const newId = await productRepo.createProduct(connection, data);

    // 3. Log Creation
    await logChange(connection, newId, userId, "CREATE", "all", null, data.sku);

    // Log Image if exists
    // Log Image logic (New Multiple Images)
    if (data.images && data.images.length > 0) {
      const imagesToInsert = data.images.map((img, idx) => ({
        filename: img.filename,
        is_primary: idx === 0, // First image is primary
      }));
      await productRepo.insertImages(connection, newId, imagesToInsert);
      await logChange(connection, newId, userId, "CREATE", "images", null, `${imagesToInsert.length} Images`);
    } else if (data.image_path) {
      // Fallback old single image (for backward compatibility if needed, or migration)
      // We process it as single primary image
      await productRepo.insertImages(connection, newId, [{ filename: data.image_path, is_primary: true }]);
    }

    // 4. Handle Package Components
    if (data.is_package && data.components?.length > 0) {
      await productRepo.insertComponents(connection, newId, data.components);
    }

    await connection.commit();
    return newId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateProductService = async (id, data, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Ambil Data Lama untuk Audit Log
    const oldData = await productRepo.getProductById(connection, id);
    if (!oldData) {
      const error = new Error("Produk tidak ditemukan.");
      error.code = "PRODUCT_NOT_FOUND";
      throw error;
    }

    // 2. Update Product Core Data
    await productRepo.updateProduct(connection, id, data);

    // 3. Audit Log Logic (Compare fields)
    const fieldsToCheck = [
      { key: "name", label: "Nama Produk" },
      { key: "category", label: "Kategori" },
      { key: "price", label: "Harga", type: "number" },
      { key: "weight", label: "Berat", type: "number" },
      { key: "is_package", label: "Tipe Paket", type: "bool" },
      { key: "image_path", label: "Foto Produk", type: "string" },
    ];

    for (const field of fieldsToCheck) {
      let oldVal = oldData[field.key];
      let newVal = data[field.key];

      // Normalisasi tipe data untuk perbandingan akurat
      if (field.type === "number") {
        oldVal = parseFloat(oldVal || 0);
        newVal = parseFloat(newVal || 0);
      } else if (field.type === "bool") {
        oldVal = !!oldVal; // force boolean
        newVal = !!newVal;
      }

      await logChange(connection, id, userId, "UPDATE", field.key, oldVal, newVal);
    }

    // [NEW] Handle Appending Images
    if (data.images && data.images.length > 0) {
      // Check if there are existing images to decide primary?
      // For now, simplifikasi: Update/Append images always secondary unless specified
      const imagesToInsert = data.images.map(img => ({
        filename: img.filename,
        is_primary: false
      }));
      await productRepo.insertImages(connection, id, imagesToInsert);
      await logChange(connection, id, userId, "UPDATE", "images", "Append", `${imagesToInsert.length} New Images`);
    }

    // 4. Handle Package Components (Selalu replace logic untuk konsistensi)
    // Hapus komponen lama (baik tipe tetap paket atau berubah jadi satuan)
    await productRepo.deleteComponents(connection, id);

    if (data.is_package && data.components?.length > 0) {
      await productRepo.insertComponents(connection, id, data.components);

      // Generic log untuk perubahan struktur komponen
      // (Kita tidak log detail per item komponen untuk menghemat baris log)
      await logChange(
        connection,
        id,
        userId,
        "UPDATE",
        "components",
        "Old Components",
        `${data.components.length} Items`
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const softDeleteProductService = async (id, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await productRepo.updateProductStatus(connection, id, false); // Active = false
    await logChange(connection, id, userId, "DELETE", "status", "Active", "Archived");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const restoreProductService = async (id, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await productRepo.updateProductStatus(connection, id, true); // Active = true
    await logChange(connection, id, userId, "RESTORE", "status", "Archived", "Active");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Wrapper untuk Read operations agar Controller tetap bisa akses via Service layer jika diinginkan
// (Saat ini controller akan bypass langsung ke Repo untuk Read demi efisiensi)

export const uploadProductImagesService = async (id, images, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const imagesToInsert = images.map((img) => ({
      filename: img.filename,
      is_primary: false, // Default secondary
    }));
    await productRepo.insertImages(connection, id, imagesToInsert);
    await logChange(connection, id, userId, "UPDATE", "images", "Add", `${images.length} Images`);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteProductImageService = async (imageId, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const image = await productRepo.getImageById(connection, imageId);
    if (!image) throw new Error("Gambar tidak ditemukan.");

    // Delete file
    try {
      const fullPath = path.resolve("uploads/products/", image.image_path);
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn(`[File System] Gagal menghapus file ${image.image_path}:`, err.message);
    }

    // Delete DB Record
    await productRepo.deleteImage(connection, imageId);

    // Log
    await logChange(connection, image.product_id, userId, "DELETE", "image", image.image_path, "Deleted");

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const setPrimaryImageService = async (productId, imageId, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await productRepo.resetPrimaryImage(connection, productId);
    await productRepo.setPrimaryImage(connection, imageId);

    // Log
    await logChange(connection, productId, userId, "UPDATE", "primary_image", "Changed", `Image ID ${imageId}`);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ============================================================================
// HELPER: CALCULATION UTILS (Exported for Testing)
// ============================================================================

/**
 * Menghitung Virtual Stock dan Berat Total untuk Produk Paket
 * @param {object} product - Object produk dengan array 'components'
 * @returns {object} Produk dengan properti tambahan 'virtual_stock' dan 'total_weight'
 */
export const calculatePackageMeta = (product) => {
  // Jika bukan paket atau tidak ada komponen, kembalikan default
  if (!product.is_package || !product.components || product.components.length === 0) {
    return {
      ...product,
      virtual_stock: 0,
      total_weight: parseFloat(product.weight || 0)
    };
  }

  let minStock = Infinity;
  let calculatedWeight = 0;
  let hasStockComponent = false;

  for (const comp of product.components) {
    // Normalisasi properti yang mungkin beda nama dari query
    const compWeight = parseFloat(comp.weight || 0);
    const compQty = parseFloat(comp.quantity_per_package || comp.quantity || 0);
    const compStock = parseFloat(comp.stock_available || comp.total_stock || 0);

    // 1. Hitung Berat (Weight * Qty)
    calculatedWeight += compWeight * compQty;

    // 2. Hitung Virtual Stock (Bottle Neck Logic)
    if (compQty > 0) {
      const possible = Math.floor(compStock / compQty);
      if (possible < minStock) minStock = possible;
      hasStockComponent = true;
    }
  }

  // Jika tidak ada komponen yang valid untuk stok, set 0
  if (!hasStockComponent || minStock === Infinity) minStock = 0;

  return {
    ...product,
    virtual_stock: minStock,
    // Prioritaskan hasil hitung, jika 0 pakai berat manual produk
    total_weight: calculatedWeight > 0 ? calculatedWeight : parseFloat(product.weight || 0)
  };
};
