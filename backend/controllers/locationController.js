import catchAsync from "../utils/catchAsync.js";
import * as locationService from "../services/locationService.js";
import db from "../config/db.js";
import { createLog } from "../repositories/systemLogRepository.js";
/**
 * Handle request to create a new location
 * @param {object} req
 * @param {object} res
 */
export const createLocation = catchAsync(async (req, res, next) => {
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
});

export const getAllLocations = catchAsync(async (req, res, next) => {
  const locations = await locationService.getAllLocations();
  res.json({ success: true, data: locations });
});

export const getStockSample = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const sample = await locationService.getStockSample(id);
  res.json({ success: true, data: sample });
});

export const updateLocation = catchAsync(async (req, res, next) => {
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
});

export const deleteLocation = catchAsync(async (req, res, next) => {
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
});
