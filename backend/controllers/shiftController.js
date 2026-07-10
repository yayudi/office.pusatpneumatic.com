import catchAsync from "../utils/catchAsync.js";
import * as shiftService from '../services/shiftService.js';

export const getShifts = catchAsync(async (req, res, next) => {
  const shifts = await shiftService.getShifts();
  res.json({ success: true, data: shifts });
});

export const getShift = catchAsync(async (req, res, next) => {
  const shift = await shiftService.getShift(req.params.id);
  res.json({ success: true, data: shift });
});

export const createShift = catchAsync(async (req, res, next) => {
  const id = await shiftService.createShift(req.body);
  res.json({ success: true, message: 'Shift created', data: { id } });
});

export const updateShift = catchAsync(async (req, res, next) => {
  await shiftService.updateShift(req.params.id, req.body);
  res.json({ success: true, message: 'Shift updated' });
});

export const deleteShift = catchAsync(async (req, res, next) => {
  await shiftService.deleteShift(req.params.id);
  res.json({ success: true, message: 'Shift deleted' });
});
