import * as locationService from "../services/locationService.js";
import db from "../config/db.js";
import { createLog } from "../repositories/systemLogRepository.js";
/**
 * Handle request to create a new location
 * @param {object} req
 * @param {object} res
 */
export const createLocation = async (req, res, next) => {
  try {
    const { code, building, floor, name, purpose } = req.body;

    // 2. Call Service
    const locationId = await locationService.addLocation({ code, building, floor, name, purpose });

    // 3. LOGGING
    await createLog(db, {
      userId: req.user.id,
      action: "CREATE",
      targetType: "LOCATION",
      targetId: String(locationId),
      changes: { code, building, floor, name, purpose },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // 3. Success Response
    return res.status(201).json({
      success: true,
      message: "Location created successfully.",
      data: { locationId },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLocations = async (req, res, next) => {
  try {
    const locations = await locationService.getAllLocations();
    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};

export const getStockSample = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sample = await locationService.getStockSample(id);
    res.json({ success: true, data: sample });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await locationService.updateLocation(id, req.body);

    // LOGGING
    await createLog(db, {
      userId: req.user.id,
      action: "UPDATE",
      targetType: "LOCATION",
      targetId: String(id),
      changes: req.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true, message: "Lokasi berhasil diperbarui." });
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await locationService.deleteLocation(id);

    // LOGGING
    await createLog(db, {
      userId: req.user.id,
      action: "DELETE",
      targetType: "LOCATION",
      targetId: String(id),
      changes: { note: "Deleted Location" },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true, message: "Lokasi berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};
