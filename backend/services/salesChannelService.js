// backend/services/salesChannelService.js
import db from '../config/db.js';
import * as salesChannelRepo from '../repositories/salesChannelRepository.js';
import Logger from '../utils/logger.js';

export const getAllChannels = async (onlyActive = false) => {
  let connection;
  try {
    connection = await db.getConnection();
    return await salesChannelRepo.getAll(connection, onlyActive);
  } catch (error) {
    Logger.error("Error in getAllChannels", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

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

export const createChannel = async (channelData, userId) => {
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
    return newId;
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Error in createChannel", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

export const updateChannel = async (id, channelData, userId) => {
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
    return success;
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Error in updateChannel", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

export const deleteChannel = async (id, userId) => {
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
    return success;
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Error in deleteChannel", error, "SALES_CHANNEL_SERVICE");
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
