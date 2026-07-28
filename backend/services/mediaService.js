// backend/services/mediaService.js

/**
 * Service layer for media asset handling.
 * Saves metadata of already uploaded media directly to database.
 */

import * as mediaRepo from "../repositories/mediaRepository.js";

/**
 * Menyimpan metadata media yang telah diunggah langsung ke R2.
 * @param {object} metadata - Data metadata (hash, title, mainPath, thumbnailPath, tags, sizeBytes, width, height)
 * @param {number} userId - ID Pengunggah
 * @param {object} connection - MySQL connection (transactional).
 * @returns {Promise<number>} - Inserted media ID.
 * @throws {object} - Throws an object with { isDuplicate: true, duplicateOf } on hash conflict.
 */
export const saveMediaMetadata = async (metadata, userId, connection) => {
  const { hash, title, mainPath, thumbnailPath, tags, sizeBytes, width, height } = metadata;

  // Duplicate detection
  const existing = await mediaRepo.getMediaAssetByHash(connection, hash);
  if (existing) {
    // Signal duplicate to caller
    throw { isDuplicate: true, duplicateOf: existing.id };
  }

  // Persist media record
  const mediaId = await mediaRepo.createMediaAsset(connection, {
    title,
    mainPath,
    thumbnailPath,
    status: "COMPLETED",
    uploaderId: userId,
    tags,
    hash,
    duplicateOf: null,
    sizeBytes,
    width,
    height
  });

  return mediaId;
};
