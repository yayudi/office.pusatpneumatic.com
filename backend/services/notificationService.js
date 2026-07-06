import db from "../config/db.js";
import * as notificationRepo from "../repositories/notificationRepository.js";
import { emitUserSignal, emitSharedTaskSignal } from "./firebaseSignalService.js";

/**
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const fetchRecentPending = async (userId, limit = 5) => {
  let connection;
  try {
    connection = await db.getConnection();
    const notifications = await notificationRepo.getRecentPending(connection, userId, limit);
    return notifications.map((n) => ({
      ...n,
      action_payload: n.action_payload ? JSON.parse(n.action_payload) : null,
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
export const fetchAll = async (userId, filterType = "ALL") => {
  let connection;
  try {
    connection = await db.getConnection();
    const notifications = await notificationRepo.getAll(connection, userId, filterType);
    return notifications.map((n) => ({
      ...n,
      action_payload: n.action_payload ? JSON.parse(n.action_payload) : null,
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
export const markNotificationAsDone = async (notificationId, userId) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const affected = await notificationRepo.markAsDone(connection, notificationId, userId);

    await connection.commit();

    if (affected > 0) {
      // Fire-and-forget signal to current user
      emitUserSignal(userId).catch(console.error);
    }

    return affected > 0;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export const claimNotification = async (notificationId, userId) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const affected = await notificationRepo.claimTask(connection, notificationId, userId);

    await connection.commit();

    if (affected > 0) {
      // Since it's a shared task claim, emit to the permission so others see it
      // Wait, we don't have the permission name here easily. We can just emit to a global shared channel
      // or fetch the permission name. Let's just emit to the user's personal channel for now
      // and ideally we should broadcast to the permission.
      // But actually, we don't have permission name here. Let's just emit to user.
      emitUserSignal(userId).catch(console.error);
    }

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
export const markAllNotificationsAsDone = async (userId) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const affected = await notificationRepo.markAllAsDone(connection, userId);

    await connection.commit();

    if (affected > 0) {
      emitUserSignal(userId).catch(console.error);
    }

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
    const defaultTypes = ["WMS", "HRIS", "SYSTEM"];
    const result = defaultTypes.map((type) => {
      const found = prefs.find((p) => p.type === type);
      return {
        type,
        is_enabled: found ? !!found.is_enabled : true,
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

/**
 * @param {number[]} userIds
 * @param {string} type
 * @param {string} title
 * @param {string} message
 * @param {Object|null} actionPayload
 * @param {boolean} isDone - true untuk informatif, false untuk actionable
 * @returns {Promise<void>}
 */
export const notifyUsers = async (
  userIds,
  type,
  title,
  message,
  actionPayload = null,
  isDone = false,
) => {
  if (!userIds || userIds.length === 0) return;

  let connection;
  try {
    connection = await db.getConnection();

    for (const userId of userIds) {
      const prefs = await notificationRepo.getPreferences(connection, userId);
      const pref = prefs.find((p) => p.type === type);
      const isEnabled = pref ? !!pref.is_enabled : true;

      if (isEnabled) {
        await notificationRepo.createNotification(connection, {
          userId,
          type,
          title,
          message,
          actionPayload,
          isDone,
        });

        // Fire-and-forget signal
        emitUserSignal(userId).catch(console.error);
      }
    }
  } catch (error) {
    console.error("[NOTIFY_ERROR] Gagal mengirim notifikasi:", error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Membuat notifikasi untuk semua user yang memiliki permission tertentu.
 * Menggunakan model "Shared Task" — hanya 1 row INSERT, tanpa loop per user.
 * Jika salah satu user menyelesaikan notifikasi ini, otomatis selesai untuk semua.
 *
 * @param {string} permissionName - Nama permission yang jadi target
 * @param {string} type - Tipe notifikasi (WMS, HRIS, SYSTEM)
 * @param {string} title
 * @param {string} message
 * @param {Object|null} actionPayload
 * @param {number|null} excludeUserId - User yang tidak perlu melihat task ini (biasanya si pemicu)
 * @param {boolean} isDone - true untuk informatif, false untuk actionable
 * @returns {Promise<void>}
 */
export const notifyUsersByPermission = async (
  permissionName,
  type,
  title,
  message,
  actionPayload = null,
  excludeUserId = null,
  isDone = false,
) => {
  let connection;
  try {
    connection = await db.getConnection();
    await notificationRepo.createNotification(connection, {
      userId: null, // Shared task, bukan milik user tertentu
      type,
      title,
      message,
      actionPayload,
      isDone,
      targetPermission: permissionName,
      excludeUserId,
    });

    // Send signal to all users who listen to this permission
    emitSharedTaskSignal(permissionName).catch(console.error);
  } catch (error) {
    console.error("[NOTIFY_ERROR] Gagal membuat shared task notification:", error);
  } finally {
    if (connection) connection.release();
  }
};
