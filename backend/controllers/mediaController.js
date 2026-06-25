// backend/controllers/mediaController.js
import path from "path";
import fs from "fs/promises";
import * as mediaRepo from "../repositories/mediaRepository.js";
import * as mediaService from "../services/mediaService.js";
import db from "../config/db.js";
import Logger from "../utils/logger.js";
import * as productRepo from "../repositories/productRepository.js";

import AppError from "../utils/AppError.js";

/**
 * GET /api/media
 * list paginated
 */
export const listMedia = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const filters = {};
  if (req.query.search && req.query.search.trim()) {
    filters.search = req.query.search.trim();
  }
  if (req.query.linkStatus) {
    try {
      filters.linkStatus = JSON.parse(req.query.linkStatus);
    } catch {
      if (['linked', 'orphaned'].includes(req.query.linkStatus)) {
        filters.linkStatus = req.query.linkStatus;
      }
    }
  }

  let connection;
  try {
    connection = await db.getConnection();
    const assets = await mediaRepo.getMediaAssets(connection, limit, offset, filters);
    const total = await mediaRepo.getTotalMediaAssets(connection, filters);

    res.json({
      success: true,
      data: assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/media/:id
 * Mengambil detail lengkap satu media beserta produk yang terikat
 */
export const getMediaById = async (req, res, next) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    const asset = await mediaRepo.getMediaDetailsWithProducts(connection, id);
    if (!asset) {
      return next(new AppError("Aset tidak ditemukan", 404));
    }
    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/media/status
 * Ambil status beberapa asset via query parameter ids=1,2,3
 */
export const getMediaStatus = async (req, res, next) => {
  const idsStr = req.query.ids;
  if (!idsStr) {
    return res.json({ success: true, data: [] });
  }

  const mediaIds = idsStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

  if (mediaIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  let connection;
  try {
    connection = await db.getConnection();
    const assets = await mediaRepo.getMediaAssetsByIds(connection, mediaIds);
    res.json({ success: true, data: assets });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * POST /api/media/upload
 * Menerima file, simpan ke temp, insert PENDING ke media_assets
 */
export const uploadMedia = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError("Tidak ada file yang diunggah", 400));
  }

  const userId = req.user.id;

  let tags = [];
  if (req.body.tags) {
    if (typeof req.body.tags === 'string') {
      try {
        tags = JSON.parse(req.body.tags);
      } catch {
        // Fallback untuk raw string koma (FormData browser)
        tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    } else if (Array.isArray(req.body.tags)) {
      tags = req.body.tags;
    }
    if (!Array.isArray(tags)) tags = [tags];
  }

  let connection;

  // Parse custom titles (JSON array dari frontend, posisi sejajar dengan req.files)
  let titles = [];
  if (req.body.titles) {
    try {
      titles = JSON.parse(req.body.titles);
    } catch {
      titles = [];
    }
  }

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const uploadedAssets = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      if (!file.filename) {
        throw new Error("File tidak memiliki filename. Pastikan multerConfig 'uploadDisk' berjalan normal.");
      }

      const fileTitle = (titles[i] && titles[i].trim()) || file.originalname;

      // EXIF stripping and hashing are handled in mediaService

      // Use service to process and store the file, handling EXIF stripping, hashing, and duplicate detection
      const mediaId = await mediaService.processMediaFile(file, fileTitle, tags, userId, connection);

      // Tautkan otomatis ke Produk jika ada (fitur Bulk Upload Link)
      if (req.body.products) {
        let productIds = [];
        if (typeof req.body.products === 'string') {
          try { 
            const parsed = JSON.parse(req.body.products); 
            productIds = Array.isArray(parsed) ? parsed : [parsed];
          }
          catch { productIds = req.body.products.split(',').map(id => id.trim()).filter(Boolean); }
        } else if (Array.isArray(req.body.products)) {
          productIds = req.body.products;
        } else if (req.body.products) {
          productIds = [req.body.products];
        }

        for (const pId of productIds) {
          await productRepo.linkMedia(connection, pId, [mediaId]);
        }
      }

      uploadedAssets.push({
        id: mediaId,
        originalName: file.originalname,
        status: "PENDING"
      });
    }

    await connection.commit();
    res.json({
      success: true,
      message: `${uploadedAssets.length} file berhasil diantrekan`,
      data: uploadedAssets
    });
  } catch (error) {
    if (connection) await connection.rollback();
    // Cleanup temporary files on failure
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = file.path || path.resolve('uploads/temp', file.filename);
        await fs.unlink(filePath).catch(() => { });
      }
    }

    if (error.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: `File ${error.filename} sudah pernah diunggah sebelumnya.`,
        error_code: 'DUPLICATE_MEDIA'
      });
    }

    return next(new AppError(error.message || "Gagal mengunggah media", 500));
  } finally {
    if (connection) connection.release();
  }
};

/**
 * DELETE /api/media/:id
 * Menghapus file fisik dan record DB, dilindungi FK constraint
 */
export const deleteMedia = async (req, res, next) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();

    // Check asset
    const asset = await mediaRepo.getMediaAssetById(connection, id);
    if (!asset) {
      return next(new AppError("Aset tidak ditemukan", 404));
    }

    // Attempt delete (RESTRICT FK will throw if used)
    await mediaRepo.deleteMediaAsset(connection, id);

    // If successful, delete the physical files
    const deleteFile = async (subPath) => {
      if (!subPath) return;
      const fullPath = path.resolve('uploads', subPath);
      try {
        await fs.unlink(fullPath);
      } catch (err) {
        Logger.warn(`Could not delete file ${fullPath}`, "MEDIA_CTRL", err);
      }
    };

    await deleteFile(asset.main_path);
    await deleteFile(asset.thumbnail_path);

    // If it was still in temp
    if (asset.status === 'PENDING' && asset.main_path?.startsWith('temp/')) {
      await deleteFile(asset.main_path); // already hit by main_path
    }

    res.json({ success: true, message: "Aset berhasil dihapus" });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return next(new AppError("Tidak bisa dihapus karena sedang dipakai oleh produk", 409));
    }
    return next(new AppError("Gagal menghapus media", 500));
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/media/:id/tags
 * Memperbarui tag aset
 */
export const updateMediaTagsController = async (req, res, next) => {
  const { id } = req.params;
  const { tags } = req.body;

  let connection;
  try {
    connection = await db.getConnection();

    const asset = await mediaRepo.getMediaAssetById(connection, id);
    if (!asset) return next(new AppError("Aset tidak ditemukan", 404));

    await mediaRepo.updateMediaTags(connection, id, tags);
    res.json({ success: true, message: "Tags berhasil diperbarui" });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/media/:id/title
 * Memperbarui judul (title) aset
 */
export const updateMediaTitleController = async (req, res, next) => {
  const { id } = req.params;
  const { title } = req.body;

  let connection;
  try {
    connection = await db.getConnection();

    const asset = await mediaRepo.getMediaAssetById(connection, id);
    if (!asset) return next(new AppError("Aset tidak ditemukan", 404));

    await mediaRepo.updateMediaTitle(connection, id, title.trim());
    res.json({ success: true, message: "Judul berhasil diperbarui" });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};
