/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getRecentPending = async (connection, userId, limit = 5) => {
  const query = `
    SELECT n.id, n.type, n.title, n.message, n.action_payload, n.is_done, n.created_at, n.claimed_by, n.claimed_at, u_claim.username AS claimed_by_name 
    FROM notifications n
    LEFT JOIN users u_claim ON n.claimed_by = u_claim.id
    WHERE n.is_done = 0 
      AND (
        n.user_id = ? 
        OR (
          n.target_permission IN (
            SELECT p.name 
            FROM permissions p 
            JOIN role_permission rp ON p.id = rp.permission_id 
            JOIN users u ON rp.role_id = u.role_id 
            WHERE u.id = ?
          )
          AND (n.exclude_user_id IS NULL OR n.exclude_user_id != ?)
        )
      )
    ORDER BY n.created_at DESC 
    LIMIT ?
  `;
  const [rows] = await connection.query(query, [userId, userId, userId, limit]);
  return rows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @param {string|null} filterType
 * @returns {Promise<Array>}
 */
export const getAll = async (connection, userId, filterType = null) => {
  let query = `
    SELECT n.id, n.type, n.title, n.message, n.action_payload, n.is_done, n.created_at, n.completed_at, u_comp.username AS completed_by_name, n.claimed_by, n.claimed_at, u_claim.username AS claimed_by_name
    FROM notifications n
    LEFT JOIN users u_comp ON n.completed_by = u_comp.id
    LEFT JOIN users u_claim ON n.claimed_by = u_claim.id
    WHERE (
      n.user_id = ? 
      OR (
        n.target_permission IN (
          SELECT p.name 
          FROM permissions p 
          JOIN role_permission rp ON p.id = rp.permission_id 
          JOIN users u ON rp.role_id = u.role_id 
          WHERE u.id = ?
        )
        AND (n.exclude_user_id IS NULL OR n.exclude_user_id != ?)
      )
    )
  `;
  const params = [userId, userId, userId];

  if (filterType && filterType !== 'ALL') {
    query += " AND n.type = ?";
    params.push(filterType);
  }

  query += " ORDER BY n.created_at DESC LIMIT 50"; // Limit to 50 for performance

  const [rows] = await connection.query(query, params);
  return rows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>}
 */
export const markAsDone = async (connection, notificationId, userId) => {
  const query = `
    UPDATE notifications 
    SET is_done = 1, completed_by = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ? 
      AND (
        user_id = ? 
        OR target_permission IN (
          SELECT p.name 
          FROM permissions p 
          JOIN role_permission rp ON p.id = rp.permission_id 
          JOIN users u ON rp.role_id = u.role_id 
          WHERE u.id = ?
        )
      )
  `;
  const [result] = await connection.query(query, [userId, notificationId, userId, userId]);
  return result.affectedRows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>}
 */
export const claimTask = async (connection, notificationId, userId) => {
  const query = `
    UPDATE notifications 
    SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP
    WHERE id = ? 
      AND claimed_by IS NULL 
      AND is_done = 0
      AND (
        user_id = ? 
        OR target_permission IN (
          SELECT p.name 
          FROM permissions p 
          JOIN role_permission rp ON p.id = rp.permission_id 
          JOIN users u ON rp.role_id = u.role_id 
          WHERE u.id = ?
        )
      )
  `;
  const [result] = await connection.query(query, [userId, notificationId, userId, userId]);
  return result.affectedRows;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @returns {Promise<number>}
 */
export const markAllAsDone = async (connection, userId) => {
  const query = `
    UPDATE notifications 
    SET is_done = 1, completed_by = ?, completed_at = CURRENT_TIMESTAMP
    WHERE is_done = 0 
      AND (
        user_id = ? 
        OR (
          target_permission IN (
            SELECT p.name 
            FROM permissions p 
            JOIN role_permission rp ON p.id = rp.permission_id 
            JOIN users u ON rp.role_id = u.role_id 
            WHERE u.id = ?
          )
          AND (exclude_user_id IS NULL OR exclude_user_id != ?)
        )
      )
  `;
  const [result] = await connection.query(query, [userId, userId, userId, userId]);
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

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {Object} payload
 * @param {number} [payload.userId]
 * @param {string} payload.type
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {Object|null} [payload.actionPayload]
 * @param {boolean} [payload.isDone] - true untuk notifikasi informatif (langsung selesai)
 * @param {string} [payload.targetPermission] - permission untuk shared task
 * @param {number} [payload.excludeUserId] - user yang tidak perlu melihat shared task ini
 * @returns {Promise<number>}
 */
export const createNotification = async (connection, payload) => {
  const { userId = null, type, title, message, actionPayload, isDone = false, targetPermission = null, excludeUserId = null } = payload;
  const actionPayloadStr = actionPayload ? JSON.stringify(actionPayload) : null;
  const isDoneInt = isDone ? 1 : 0;
  
  const [result] = await connection.query(
    `INSERT INTO notifications 
    (user_id, type, title, message, action_payload, is_done, target_permission, exclude_user_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, actionPayloadStr, isDoneInt, targetPermission, excludeUserId]
  );
  return result.insertId;
};
