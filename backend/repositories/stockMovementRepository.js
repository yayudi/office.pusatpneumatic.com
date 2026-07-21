// backend\repositories\stockMovementRepository.js

/**
 * Mencatat pergerakan stok (Log Only)
 * @param {Object} connection - Koneksi database (Transaction active)
 * @param {Object} data - { productId, quantity, fromLocationId, toLocationId, type, userId, notes }
 */
export const createLog = async (
  connection,
  { productId, quantity, fromLocationId = null, toLocationId = null, type, userId, notes }
) => {
  return connection.query(
    `INSERT INTO stock_movements
     (product_id, quantity, from_location_id, to_location_id, movement_type, user_id, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [productId, quantity, fromLocationId, toLocationId, type, userId, notes, new Date()]
  );
};

/**
 * Mengambil daftar unik movement_type
 * @param {Object} connection - Koneksi database
 * @returns {Promise<Array>} Array of movement types
 */
export const getMovementTypes = async (connection) => {
  const [rows] = await connection.query(
    `SELECT DISTINCT movement_type FROM stock_movements WHERE movement_type IS NOT NULL ORDER BY movement_type ASC`
  );
  return rows.map((r) => r.movement_type);
};
