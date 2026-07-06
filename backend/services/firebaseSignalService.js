import { isInitialized, firebaseDb } from '../config/firebase.js';

/**
 * Mengirim sinyal (ping) ke Firebase Realtime Database
 * @param {string} path - Path di Firebase (misal: signals/users/1 atau signals/permissions/MANAGE_USERS)
 * @param {Object} payload - Data tambahan yang dikirim (misal { action: 'REFRESH_NOTIFICATIONS' })
 * @returns {Promise<boolean>}
 */
const emitSignal = async (path, payload = {}) => {
  if (!isInitialized || !firebaseDb) {
    console.warn('[FIREBASE_SIGNAL] Tidak dapat mengirim sinyal karena Firebase belum terinisialisasi. Path:', path);
    return false;
  }

  try {
    const dataToSet = {
      ...payload,
      last_updated: Date.now()
    };
    
    await firebaseDb.ref(path).set(dataToSet);
    return true;
  } catch (error) {
    console.error(`[FIREBASE_SIGNAL] Gagal mengirim sinyal ke ${path}:`, error.message);
    return false;
  }
};

/**
 * @param {number|string} userId
 * @param {string} action
 */
export const emitUserSignal = async (userId, action = 'REFRESH_NOTIFICATIONS') => {
  return await emitSignal(`signals/users/${userId}`, { action });
};

/**
 * @param {string} permission
 * @param {string} action
 */
export const emitSharedTaskSignal = async (permission, action = 'REFRESH_NOTIFICATIONS') => {
  return await emitSignal(`signals/permissions/${permission}`, { action });
};
