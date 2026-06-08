import db from "../config/db.js";

/**
 * @typedef {Object} StickerTemplate
 * @property {number} id
 * @property {string} name
 * @property {string} paper_size
 * @property {string} config_json
 * @property {number} is_active
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Dapatkan semua template yang aktif
 * @returns {Promise<StickerTemplate[]>}
 */
export const getAllTemplates = async () => {
  const [rows] = await db.query(
    `SELECT id, name, paper_size, config_json, is_active, created_at, updated_at 
     FROM sticker_templates 
     WHERE is_active = 1 
     ORDER BY name ASC`
  );
  return rows;
};

/**
 * Simpan template baru
 * @param {Object} templateData
 * @param {string} templateData.name
 * @param {string} templateData.paper_size
 * @param {string} templateData.config_json
 * @returns {Promise<number>} ID template yang baru dibuat
 */
export const createTemplate = async (templateData) => {
  const [result] = await db.query(
    `INSERT INTO sticker_templates (name, paper_size, config_json) 
     VALUES (?, ?, ?)`,
    [templateData.name, templateData.paper_size, templateData.config_json]
  );
  return result.insertId;
};

/**
 * Hapus (soft delete atau hard delete) template berdasarkan ID
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export const deleteTemplate = async (id) => {
  const [result] = await db.query(
    `DELETE FROM sticker_templates WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
};

/**
 * Update template berdasarkan ID
 * @param {number} id
 * @param {Object} templateData
 * @param {string} templateData.name
 * @param {string} templateData.paper_size
 * @param {string} templateData.config_json
 * @returns {Promise<boolean>} 
 */
export const updateTemplate = async (id, templateData) => {
  const [result] = await db.query(
    `UPDATE sticker_templates 
     SET name = ?, paper_size = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [templateData.name, templateData.paper_size, templateData.config_json, id]
  );
  return result.affectedRows > 0;
};
