/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getRecentUnread = async (connection, userId, limit = 5) => {
  const [rows] = await connection.query(
    "SELECT id, type, title, message, action_payload, is_read, created_at FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  );
  return rows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @param {string|null} filterType
 * @returns {Promise<Array>}
 */
export const getAll = async (connection, userId, filterType = null) => {
  let query = "SELECT id, type, title, message, action_payload, is_read, created_at FROM notifications WHERE user_id = ?";
  const params = [userId];

  if (filterType && filterType !== 'ALL') {
    query += " AND type = ?";
    params.push(filterType);
  }

  query += " ORDER BY created_at DESC LIMIT 50"; // Limit to 50 for performance

  const [rows] = await connection.query(query, params);
  return rows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>}
 */
export const markAsRead = async (connection, notificationId, userId) => {
  const [result] = await connection.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [notificationId, userId]
  );
  return result.affectedRows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @returns {Promise<number>}
 */
export const markAllAsRead = async (connection, userId) => {
  const [result] = await connection.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [userId]
  );
  return result.affectedRows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export const getPreferences = async (connection, userId) => {
  const [rows] = await connection.query(
    "SELECT type, is_enabled FROM user_notification_preferences WHERE user_id = ?",
    [userId]
  );
  return rows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @param {string} type
 * @param {boolean} isEnabled
 * @returns {Promise<number>}
 */
export const upsertPreference = async (connection, userId, type, isEnabled) => {
  const isEnabledInt = isEnabled ? 1 : 0;
  const [result] = await connection.query(
    "INSERT INTO user_notification_preferences (user_id, type, is_enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_enabled = ?",
    [userId, type, isEnabledInt, isEnabledInt]
  );
  return result.affectedRows;
};
