import * as shiftRepository from '../repositories/shiftRepository.js';

/**
 * @returns {Promise<any>}
 */
export const getShifts = async () => {
  return await shiftRepository.getAllShifts();
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
  return await shiftRepository.createShift(data);
};

/**
 * @param {number|string} id
 * @param {any} data
 * @returns {Promise<any>}
 */
export const updateShift = async (id, data) => {
  // Check if exists
  await getShift(id);
  return await shiftRepository.updateShift(id, data);
};

/**
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const deleteShift = async (id) => {
  return await shiftRepository.deleteShift(id);
};
