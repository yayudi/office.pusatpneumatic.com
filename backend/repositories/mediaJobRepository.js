// backend/repositories/mediaJobRepository.js
import db from "../config/db.js";

export const createMediaJob = async ({ productId, tempFilepath }) => {
  // Legacy function: NO-OP or redirect
  throw new Error("createMediaJob is deprecated. Use mediaController to upload natively.");
};

export const getJobsByIds = async (jobIds) => {
  if (!jobIds || jobIds.length === 0) return [];
  const placeholders = jobIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, main_path as temp_filepath, status, created_at
     FROM media_assets
     WHERE id IN (${placeholders})`,
    jobIds
  );
  return rows;
};

export const retryJob = async (jobId) => {
  const [result] = await db.query(
    `UPDATE media_assets
     SET status = 'PENDING', updated_at = NOW()
     WHERE id = ? AND status = 'FAILED'`,
    [jobId]
  );
  return result.affectedRows > 0;
};

export const getPendingMediaJobs = async (limit = 5) => {
  const [rows] = await db.query(
    `SELECT id, main_path as temp_filepath FROM media_assets WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );
  return rows;
};

export const lockMediaJobs = async (jobIds) => {
  if (!jobIds || jobIds.length === 0) return 0;
  const placeholders = jobIds.map(() => '?').join(',');
  const [result] = await db.query(
    `UPDATE media_assets SET status = 'PROCESSING', updated_at = NOW() WHERE id IN (${placeholders}) AND status = 'PENDING'`,
    jobIds
  );
  return result.affectedRows;
};

export const completeMediaJob = async (jobId, finalMainPath, finalThumbPath, metadata = {}) => {
  const { width = null, height = null, size_bytes = null } = metadata;
  return db.query(
    `UPDATE media_assets SET status = 'COMPLETED', main_path = ?, thumbnail_path = ?, width = ?, height = ?, size_bytes = ?, updated_at = NOW() WHERE id = ?`,
    [finalMainPath, finalThumbPath, width, height, size_bytes, jobId]
  );
};

export const failMediaJob = async (jobId, errorMessage) => {
  // Save error message logging logic elsewhere or adapt schema, but for now just mark FAILED
  console.error(`Media Asset ${jobId} failed: ${errorMessage}`);
  return db.query(
    `UPDATE media_assets SET status = 'FAILED', updated_at = NOW() WHERE id = ?`,
    [jobId]
  );
};

export const cleanupMediaJobs = async () => {
  try {
    await db.query(`
      UPDATE media_assets
      SET status = 'FAILED', updated_at = NOW()
      WHERE status = 'PROCESSING' AND updated_at < NOW() - INTERVAL 30 MINUTE
    `);
    await db.query(`
       UPDATE media_assets
       SET status = 'FAILED', updated_at = NOW()
       WHERE status = 'PENDING' AND updated_at < NOW() - INTERVAL 2 HOUR
    `);
  } catch (error) {
    console.error('Failed to cleanup media assets queue:', error);
  }
};
