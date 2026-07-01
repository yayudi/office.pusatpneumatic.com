import db from '../config/db.js';

/**
 * Mendapatkan semua paper sizes
 * @returns {Promise<Array>} Array of paper_sizes
 */
export const getAllPaperSizes = async () => {
  const [rows] = await db.query('SELECT * FROM paper_sizes WHERE is_active = 1 ORDER BY created_at ASC');
  return rows;
};

/**
 * Mendapatkan paper size berdasarkan ID
 * @param {number} id
 * @returns {Promise<Object|null>} Paper size object atau null
 */
export const getPaperSizeById = async (id) => {
  const [rows] = await db.query('SELECT * FROM paper_sizes WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Membuat paper size baru
 * @param {Object} data Data paper size 
 * @returns {Promise<number>} ID paper size baru
 */
export const createPaperSize = async (data) => {
  const query = 'INSERT INTO paper_sizes (name, top_margin, side_margin, vertical_pitch, horizontal_pitch, label_width, label_height, number_across, number_down, page_width, page_height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [
    data.name,
    data.top_margin || 0,
    data.side_margin || 0,
    data.vertical_pitch || 0,
    data.horizontal_pitch || 0,
    data.label_width || 0,
    data.label_height || 0,
    data.number_across || 1,
    data.number_down || 1,
    data.page_width || 0,
    data.page_height || 0
  ];
  const [result] = await db.query(query, values);
  return result.insertId;
};

/**
 * Memperbarui paper size
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<boolean>} Status keberhasilan
 */
export const updatePaperSize = async (id, data) => {
  const query = 'UPDATE paper_sizes SET name = ?, top_margin = ?, side_margin = ?, vertical_pitch = ?, horizontal_pitch = ?, label_width = ?, label_height = ?, number_across = ?, number_down = ?, page_width = ?, page_height = ? WHERE id = ?';
  const values = [
    data.name,
    data.top_margin || 0,
    data.side_margin || 0,
    data.vertical_pitch || 0,
    data.horizontal_pitch || 0,
    data.label_width || 0,
    data.label_height || 0,
    data.number_across || 1,
    data.number_down || 1,
    data.page_width || 0,
    data.page_height || 0,
    id
  ];
  const [result] = await db.query(query, values);
  return result.affectedRows > 0;
};

/**
 * Menghapus paper size
 * @param {number} id
 * @returns {Promise<boolean>} Status keberhasilan
 */
export const deletePaperSize = async (id) => {
  const [result] = await db.query('DELETE FROM paper_sizes WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
