/**
 * @param {import('mysql2/promise').Connection} connection
 * @returns {Promise<Array>}
 */
export const findAllCategories = async (connection) => {
  const [rows] = await connection.query(
    "SELECT id, name FROM categories WHERE is_active = 1 ORDER BY name ASC"
  );
  return rows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {string} name
 * @returns {Promise<number>}
 */
export const createCategory = async (connection, name) => {
  const [result] = await connection.query(
    "INSERT INTO categories (name, is_active) VALUES (?, 1)",
    [name]
  );
  return result.insertId;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {string} id
 * @param {string} name
 * @returns {Promise<number>}
 */
export const updateCategory = async (connection, id, name) => {
  const [result] = await connection.query(
    "UPDATE categories SET name = ? WHERE id = ?",
    [name, id]
  );
  return result.affectedRows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteCategory = async (connection, id) => {
  const [result] = await connection.query(
    "UPDATE categories SET is_active = 0 WHERE id = ?",
    [id]
  );
  return result.affectedRows;
};
