// backend/services/salesChannelService.js
import db from '../config/db.js';
import * as salesChannelRepo from '../repositories/salesChannelRepository.js';
import Logger from '../utils/logger.js';
import { emitSharedTaskSignal } from "./firebaseSignalService.js";
import cache from '../config/cache.js';

/**
 * @param {any} onlyActive
 * @returns {Promise<any>}
 */
export const getAllChannels = async (onlyActive = false) => {
  const cacheKey = onlyActive ? "MASTER_SALES_CHANNELS_ACTIVE" : "MASTER_SALES_CHANNELS_ALL";
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let connection;
  try {
    connection = await db.getConnection();
    const data = await salesChannelRepo.getAll(connection, onlyActive);
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    Logger.error("Error in getAllChannels", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const getChannelById = async (id) => {
  let connection;
  try {
    connection = await db.getConnection();
    const channel = await salesChannelRepo.getById(connection, id);
    if (!channel) {
      throw new Error('Saluran penjualan tidak ditemukan.');
    }
    return channel;
  } catch (error) {
    Logger.error("Error in getChannelById", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {any} channelData
 * @param {number|string} userId
 * @returns {Promise<any>}
 */
export const createChannel = async (channelData, _) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (!channelData.name || !channelData.platform) {
      throw new Error('Nama dan Platform wajib diisi.');
    }

    const newId = await salesChannelRepo.create(connection, channelData);

    // TODO: Audit logging bisa ditambahkan di sini jika dibutuhkan

    await connection.commit();
    cache.del(["MASTER_SALES_CHANNELS_ACTIVE", "MASTER_SALES_CHANNELS_ALL"]);
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_CHANNELS').catch(e => Logger.error("Signal Error", e, "SALES_CHANNEL_SERVICE"));
    return newId;
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Error in createChannel", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number|string} id
 * @param {any} channelData
 * @param {number|string} userId
 * @returns {Promise<any>}
 */
export const updateChannel = async (id, channelData, _) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (!channelData.name || !channelData.platform) {
      throw new Error('Nama dan Platform wajib diisi.');
    }

    const existing = await salesChannelRepo.getById(connection, id);
    if (!existing) {
      throw new Error('Saluran penjualan tidak ditemukan.');
    }

    const success = await salesChannelRepo.update(connection, id, channelData);

    await connection.commit();
    cache.del(["MASTER_SALES_CHANNELS_ACTIVE", "MASTER_SALES_CHANNELS_ALL"]);
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_CHANNELS').catch(e => Logger.error("Signal Error", e, "SALES_CHANNEL_SERVICE"));
    return success;
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Error in updateChannel", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {number|string} id
 * @param {number|string} userId
 * @returns {Promise<any>}
 */
export const deleteChannel = async (id, _) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const existing = await salesChannelRepo.getById(connection, id);
    if (!existing) {
      throw new Error('Saluran penjualan tidak ditemukan.');
    }

    const success = await salesChannelRepo.remove(connection, id);

    await connection.commit();
    cache.del(["MASTER_SALES_CHANNELS_ACTIVE", "MASTER_SALES_CHANNELS_ALL"]);
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_CHANNELS').catch(e => Logger.error("Signal Error", e, "SALES_CHANNEL_SERVICE"));
    return success;
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Error in deleteChannel", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
