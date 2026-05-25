// backend/repositories/salesChannelRepository.js

/**
 * Mendapatkan semua saluran penjualan.
 * @param {Object} connection 
 * @param {boolean} onlyActive Jika true, hanya ambil yang is_active = 1
 * @returns {Promise<Array>}
 */
export const getAll = async (connection, onlyActive = false) => {
  let query = 'SELECT * FROM sales_channels';
  if (onlyActive) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY platform ASC, name ASC';
  
  const [rows] = await connection.query(query);
  return rows;
};

/**
 * Mencari saluran berdasarkan ID.
 * @param {Object} connection 
 * @param {number} id 
 * @returns {Promise<Object|null>}
 */
export const getById = async (connection, id) => {
  const [rows] = await connection.query('SELECT * FROM sales_channels WHERE id = ?', [id]);
  return rows[0] || null;
};

/**
 * Menambahkan saluran baru.
 * @param {Object} connection 
 * @param {Object} channel { platform, name, description, isActive }
 * @returns {Promise<number>} ID yang baru dibuat
 */
export const create = async (connection, channel) => {
  const { platform, name, description, isActive } = channel;
  const [result] = await connection.query(
    'INSERT INTO sales_channels (platform, name, description, is_active) VALUES (?, ?, ?, ?)',
    [platform, name, description, isActive ? 1 : 0]
  );
  return result.insertId;
};

/**
 * Memperbarui saluran yang ada.
 * @param {Object} connection 
 * @param {number} id 
 * @param {Object} channel { platform, name, description, isActive }
 * @returns {Promise<boolean>}
 */
export const update = async (connection, id, channel) => {
  const { platform, name, description, isActive } = channel;
  const [result] = await connection.query(
    'UPDATE sales_channels SET platform = ?, name = ?, description = ?, is_active = ? WHERE id = ?',
    [platform, name, description, isActive ? 1 : 0, id]
  );
  return result.affectedRows > 0;
};

/**
 * Menghapus saluran (Soft delete).
 * Melakukan soft delete dengan mengubah is_active = 0.
 * @param {Object} connection 
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export const remove = async (connection, id) => {
  const [result] = await connection.query('UPDATE sales_channels SET is_active = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
