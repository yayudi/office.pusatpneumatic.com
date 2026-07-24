import { isInitialized, firebaseDb } from '../config/firebase.js';
import Logger from '../utils/logger.js';

/**
 * Mengirim sinyal (ping) ke Firebase Realtime Database
 * @param {string} path - Path di Firebase (misal: signals/users/1 atau signals/permissions/MANAGE_USERS)
 * @param {Object} payload - Data tambahan yang dikirim (misal { action: 'REFRESH_NOTIFICATIONS' })
 * @returns {Promise<boolean>}
 */
const emitSignal = async (path, payload = {}) => {
  if (!isInitialized || !firebaseDb) {
    Logger.warn(`Tidak dapat mengirim sinyal karena Firebase belum terinisialisasi. Path: ${path}`, "FIREBASE_SIGNAL");
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
    Logger.error(`Gagal mengirim sinyal ke ${path}:`, error, "FIREBASE_SIGNAL");
    return false;
  }
};

/**
 * @param {number|string} userId
 * @param {string} action
 */
export const emitUserSignal = async (userId, action = 'REFRESH_NOTIFICATIONS') => {
  const safeUserId = String(userId).replace(/[.#$[\]]/g, '_');
  return await emitSignal(`signals/users/${safeUserId}`, { action });
};

/**
 * @param {string} permission
 * @param {string} action
 */
export const emitSharedTaskSignal = async (permission, action = 'REFRESH_NOTIFICATIONS') => {
  const safePermission = permission.replace(/[.#$[\]]/g, '_');
  return await emitSignal(`signals/permissions/${safePermission}`, { action });
};

/**
 * Mendengarkan perubahan data master dari instance lain via Firebase.
 * Ini mencegah stale data jika aplikasi dijalankan di multi-instance.
 */
export const initFirebaseCacheListener = () => {
  if (!isInitialized || !firebaseDb) return;
  
  import('../config/cache.js').then(({ default: cache }) => {
    const ref = firebaseDb.ref('signals/permissions/MASTER_DATA');
    
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data || !data.action) return;
      
      Logger.info(`Menerima sinyal Firebase untuk invalidasi cache: ${data.action}`, "CACHE_SYNC");
      
      switch (data.action) {
        case 'REFRESH_CATEGORIES':
          cache.del("MASTER_CATEGORIES");
          break;
        case 'REFRESH_LOCATIONS':
          cache.del("MASTER_LOCATIONS");
          break;
        case 'REFRESH_ROLES':
          cache.del("MASTER_ROLES");
          cache.del("MASTER_PERMISSIONS");
          break;
        case 'REFRESH_SHIFTS':
          cache.del("MASTER_SHIFTS");
          break;
        case 'REFRESH_CHANNELS':
          cache.del(["MASTER_SALES_CHANNELS_ACTIVE", "MASTER_SALES_CHANNELS_ALL"]);
          break;
        case 'REFRESH_PAPER_SIZES':
          cache.del("MASTER_PAPER_SIZES");
          break;
        case 'REFRESH_STICKER_TEMPLATES':
          cache.del("MASTER_STICKER_TEMPLATES");
          break;
        case 'REFRESH_USERS':
          cache.del("MASTER_USERS_ACTIVE");
          break;
      }
    });
    Logger.info("Firebase Cache Invalidation Listener telah berjalan.", "CACHE_SYNC");
  }).catch(e => Logger.error("Gagal memuat cache module untuk listener", e, "CACHE_SYNC"));
};
