import * as scheduleRepository from '../repositories/scheduleRepository.js';

/**
 * @param {number|string} userId
 * @param {any} startDate
 * @param {any} endDate
 * @returns {Promise<any>}
 */
export const getSchedules = async (userId, startDate, endDate) => {
  return await scheduleRepository.getSchedulesByRange(userId, startDate, endDate);
};

/**
 * @param {number|string} userId
 * @param {number|string} shiftId
 * @param {any} date
 * @param {any} createdBy
 * @returns {Promise<any>}
 */
export const createSchedule = async (userId, shiftId, date, createdBy) => {
  // Validate? Date format?
  // Check if shift exists (FK constraint will handle it, but nicer to check)
  // Upsert
  return await scheduleRepository.upsertSchedule({
    userId,
    shiftId,
    date,
    createdBy
  });
};

/**
 * @param {number|string} userId
 * @param {any} date
 * @returns {Promise<any>}
 */
export const deleteSchedule = async (userId, date) => {
  return await scheduleRepository.deleteSchedule(userId, date);
};
