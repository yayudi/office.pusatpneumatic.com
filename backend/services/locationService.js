// backend/services/locationService.js
import db from "../config/db.js";
import Logger from "../utils/logger.js";
import * as locationRepository from "../repositories/locationRepository.js";
import AppError from "../utils/AppError.js";
import { emitSharedTaskSignal } from "./firebaseSignalService.js";
import cache from "../config/cache.js";

/**
 * Menambahkan lokasi baru
 * @param {object} data - { code, building, floor, name, purpose }
 * @returns {Promise<number>} ID lokasi baru
 * @throws {Error} Jika validasi gagal
 */
export const addLocation = async (data) => {
  const { code, building, purpose } = data;

  // 1. Business Validation
  if (!code || !building || !purpose) {
    throw new AppError("Code, Building, and Purpose are required.", 400, "VALIDATION_ERROR");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 2. Check Duplicate
    const existingId = await locationRepository.getIdByCode(connection, code);
    if (existingId) {
      throw new AppError("Location code already exists.", 400, "VALIDATION_ERROR");
    }

    // 3. Insert Data
    const newLocationId = await locationRepository.createLocation(connection, data);

    // 4. Audit Log (Placeholder - Implementasikan sesuai kebutuhan sistem audit)
    // await auditRepository.logAction(connection, 'CREATE', 'locations', newLocationId, data);

    await connection.commit();
    cache.del("MASTER_LOCATIONS");
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_LOCATIONS').catch(e => Logger.error("Signal Error", e, "LOCATION_SERVICE"));
    return newLocationId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * @returns {Promise<any>}
 */
export const getAllLocations = async () => {
  const cacheKey = "MASTER_LOCATIONS";
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const data = await locationRepository.getAllLocations(db);
  cache.set(cacheKey, data);
  return data;
};

/**
 * @param {number|string} locationId
 * @returns {Promise<any>}
 */
export const getStockSample = async (locationId) => {
  return await locationRepository.getStockSample(db, locationId);
};

/**
 * @param {number|string} id
 * @param {any} data
 * @returns {Promise<any>}
 */
export const updateLocation = async (id, data) => {
  const { code, building, purpose } = data;
  if (!code || !building || !purpose) {
    throw new AppError("Code, Building, and Purpose are required.", 400, "VALIDATION_ERROR");
  }

  try {
    const isUpdated = await locationRepository.updateLocation(db, id, data);
    if (!isUpdated) {
      throw new AppError("Location not found.", 404, "NOT_FOUND");
    }
    cache.del("MASTER_LOCATIONS");
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_LOCATIONS').catch(e => Logger.error("Signal Error", e, "LOCATION_SERVICE"));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Location code already exists.", 409, "VALIDATION_ERROR");
    }
    throw error;
  }
};

/**
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const deleteLocation = async (id) => {
  try {
    const isDeleted = await locationRepository.deleteLocation(db, id);
    if (!isDeleted) {
      throw new AppError("Location not found.", 404, "NOT_FOUND");
    }
    cache.del("MASTER_LOCATIONS");
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_LOCATIONS').catch(e => Logger.error("Signal Error", e, "LOCATION_SERVICE"));
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      throw new AppError(
        "Location is still in use by stock. Please clear stock first.",
        400,
        "VALIDATION_ERROR",
      );
    }
    throw error;
  }
};
