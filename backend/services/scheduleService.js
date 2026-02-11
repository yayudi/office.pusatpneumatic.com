import * as scheduleRepository from '../repositories/scheduleRepository.js';

export const getSchedules = async (userId, startDate, endDate) => {
  return await scheduleRepository.getSchedulesByRange(userId, startDate, endDate);
};

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

export const deleteSchedule = async (userId, date) => {
  return await scheduleRepository.deleteSchedule(userId, date);
};
