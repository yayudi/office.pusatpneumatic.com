import * as shiftService from '../services/shiftService.js';

export const getShifts = async (req, res) => {
  try {
    const shifts = await shiftService.getShifts();
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShift = async (req, res) => {
  try {
    const shift = await shiftService.getShift(req.params.id);
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const createShift = async (req, res) => {
  try {
    const id = await shiftService.createShift(req.body);
    res.json({ success: true, message: 'Shift created', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShift = async (req, res) => {
  try {
    await shiftService.updateShift(req.params.id, req.body);
    res.json({ success: true, message: 'Shift updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteShift = async (req, res) => {
  try {
    await shiftService.deleteShift(req.params.id);
    res.json({ success: true, message: 'Shift deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
