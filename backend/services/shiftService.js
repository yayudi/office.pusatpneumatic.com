import * as shiftRepository from '../repositories/shiftRepository.js';
import { emitSharedTaskSignal } from "./firebaseSignalService.js";
import cache from "../config/cache.js";
import Logger from "../utils/logger.js";

/**
 * @returns {Promise<any>}
 */
export const getShifts = async () => {
  const cacheKey = "MASTER_SHIFTS";
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const data = await shiftRepository.getAllShifts();
  cache.set(cacheKey, data);
  return data;
};

/**
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const getShift = async (id) => {
  const shift = await shiftRepository.getShiftById(id);
  if (!shift) throw new Error('Shift not found');
  return shift;
};

/**
 * @param {any} data
 * @returns {Promise<any>}
 */
export const createShift = async (data) => {
  // Basic validation could go here
  const result = await shiftRepository.createShift(data);
  cache.del("MASTER_SHIFTS");
  emitSharedTaskSignal('MASTER_DATA', 'REFRESH_SHIFTS').catch(e => Logger.error("Signal Error", e, "SHIFT_SERVICE"));
  return result;
};

/**
 * @param {number|string} id
 * @param {any} data
 * @returns {Promise<any>}
 */
export const updateShift = async (id, data) => {
  // Check if exists
  await getShift(id);
  const result = await shiftRepository.updateShift(id, data);
  cache.del("MASTER_SHIFTS");
  emitSharedTaskSignal('MASTER_DATA', 'REFRESH_SHIFTS').catch(e => Logger.error("Signal Error", e, "SHIFT_SERVICE"));
  return result;
};

/**
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const deleteShift = async (id) => {
  const result = await shiftRepository.deleteShift(id);
  cache.del("MASTER_SHIFTS");
  emitSharedTaskSignal('MASTER_DATA', 'REFRESH_SHIFTS').catch(e => Logger.error("Signal Error", e, "SHIFT_SERVICE"));
  return result;
};
