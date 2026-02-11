import * as shiftRepository from '../repositories/shiftRepository.js';

export const getShifts = async () => {
  return await shiftRepository.getAllShifts();
};

export const getShift = async (id) => {
  const shift = await shiftRepository.getShiftById(id);
  if (!shift) throw new Error('Shift not found');
  return shift;
};

export const createShift = async (data) => {
  // Basic validation could go here
  return await shiftRepository.createShift(data);
};

export const updateShift = async (id, data) => {
  // Check if exists
  await getShift(id);
  return await shiftRepository.updateShift(id, data);
};

export const deleteShift = async (id) => {
  return await shiftRepository.deleteShift(id);
};
