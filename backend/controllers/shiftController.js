import * as shiftService from '../services/shiftService.js';

export const getShifts = async (req, res, next) => {
  try {
    const shifts = await shiftService.getShifts();
    res.json({ success: true, data: shifts });
  } catch (error) {
    next(error);
  }
};

export const getShift = async (req, res, next) => {
  try {
    const shift = await shiftService.getShift(req.params.id);
    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req, res, next) => {
  try {
    const id = await shiftService.createShift(req.body);
    res.json({ success: true, message: 'Shift created', data: { id } });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    await shiftService.updateShift(req.params.id, req.body);
    res.json({ success: true, message: 'Shift updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    await shiftService.deleteShift(req.params.id);
    res.json({ success: true, message: 'Shift deleted' });
  } catch (error) {
    next(error);
  }
};
