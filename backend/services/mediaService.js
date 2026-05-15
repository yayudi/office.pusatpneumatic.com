// backend/services/mediaService.js

/**
 * Service layer for media asset handling.
 * Performs EXIF stripping, SHA-256 hashing, duplicate detection, and persistence.
 */

import fs from "fs/promises";
import path from "path";
import { stripExif } from "../utils/imageProcessor.js";
import { calcHash } from "../utils/hash.js";
import * as mediaRepo from "../repositories/mediaRepository.js";

/**
 * Process a single uploaded file.
 * @param {object} file - Multer file object.
 * @param {string} title - Resolved title for the media.
 * @param {Array<string>} tags - Tag list.
 * @param {number} userId - Uploader ID.
 * @param {object} connection - MySQL connection (transactional).
 * @returns {Promise<number>} - Inserted media ID.
 * @throws {object} - Throws an object with { isDuplicate: true, duplicateOf, filename } on hash conflict.
 */
export const processMediaFile = async (file, title, tags, userId, connection) => {
  // Resolve file path (multer stores in ./uploads/temp)
  const filePath = file.path || path.resolve('uploads/temp', file.filename);

  // Read raw buffer, strip EXIF, compute hash
  const originalBuffer = await fs.readFile(filePath);
  const { buffer: cleanBuffer, width, height } = await stripExif(originalBuffer);
  const hash = calcHash(cleanBuffer);

  // Overwrite the cleaned buffer back to storage
  await fs.writeFile(filePath, cleanBuffer);

  // Duplicate detection
  const existing = await mediaRepo.getMediaAssetByHash(connection, hash);
  if (existing) {
    // Signal duplicate to caller
    throw { isDuplicate: true, duplicateOf: existing.id, filename: file.originalname };
  }

  // Persist media record
  const mediaId = await mediaRepo.createMediaAsset(connection, {
    title,
    mainPath: `temp/${file.filename}`,
    thumbnailPath: null,
    status: "PENDING",
    uploaderId: userId,
    tags,
    hash,
    duplicateOf: null,
    sizeBytes: cleanBuffer.length,
    width,
    height
  });

  return mediaId;
};

/**
 * Orchestrates the full upload flow for multiple files.
 * Handles transaction, product linking, and cleanup on failure.
 * @param {Array<object>} files - Array of Multer file objects.
 * @param {Array<string>} titles - Parallel array of titles.
 * @param {Array<string>} tags - Tag list applied to all files.
 * @param {Array<number>} productIds - Optional product IDs to link.
 * @param {number} userId - Uploader ID.
 * @param {object} connection - MySQL connection.
 * @returns {Promise<Array<object>>} - List of uploaded asset summaries.
 */
export const uploadMediaBatch = async (files, titles, tags, productIds, userId, connection) => {
  const uploaded = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileTitle = (titles && titles[i] && titles[i].trim()) || file.originalname;
    const mediaId = await processMediaFile(file, fileTitle, tags, userId, connection);

    // Link to products if provided
    if (productIds && productIds.length > 0) {
      for (const pId of productIds) {
        // Cek apakah produk sudah punya gambar utama (is_primary = 1)
        const [existingPrimary] = await connection.query(
          `SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1 LIMIT 1`,
          [pId]
        );

        const isPrimary = existingPrimary.length === 0 ? 1 : 0;

        await connection.query(
          `INSERT INTO product_images (product_id, media_id, is_primary) VALUES (?, ?, ?)`,
          [pId, mediaId, isPrimary]
        );
      }
    }

    uploaded.push({ id: mediaId, originalName: file.originalname, status: "PENDING" });
  }

  return uploaded;
};
