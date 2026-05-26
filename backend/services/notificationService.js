import db from '../config/db.js';
import * as notificationRepo from '../repositories/notificationRepository.js';

/**
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const fetchRecentUnread = async (userId, limit = 5) => {
  let connection;
  try {
    connection = await db.getConnection();
    const notifications = await notificationRepo.getRecentUnread(connection, userId, limit);
    return notifications.map(n => ({
      ...n,
      action_payload: n.action_payload ? JSON.parse(n.action_payload) : null
    }));
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number} userId
 * @param {string} filterType
 * @returns {Promise<Array>}
 */
export const fetchAll = async (userId, filterType = 'ALL') => {
  let connection;
  try {
    connection = await db.getConnection();
    const notifications = await notificationRepo.getAll(connection, userId, filterType);
    return notifications.map(n => ({
      ...n,
      action_payload: n.action_payload ? JSON.parse(n.action_payload) : null
    }));
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const affected = await notificationRepo.markAsRead(connection, notificationId, userId);
    
    await connection.commit();
    return affected > 0;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number} userId
 * @returns {Promise<number>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const affected = await notificationRepo.markAllAsRead(connection, userId);
    
    await connection.commit();
    return affected;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export const fetchPreferences = async (userId) => {
  let connection;
  try {
    connection = await db.getConnection();
    const prefs = await notificationRepo.getPreferences(connection, userId);
    
    // Default preferences if none exist
    const defaultTypes = ['WMS', 'HRIS', 'SYSTEM'];
    const result = defaultTypes.map(type => {
      const found = prefs.find(p => p.type === type);
      return {
        type,
        is_enabled: found ? !!found.is_enabled : true
      };
    });

    return result;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number} userId
 * @param {Array<{type: string, is_enabled: boolean}>} preferences
 * @returns {Promise<boolean>}
 */
export const updatePreferences = async (userId, preferences) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    for (const pref of preferences) {
      await notificationRepo.upsertPreference(connection, userId, pref.type, pref.is_enabled);
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
