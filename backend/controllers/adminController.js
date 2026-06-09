// backend/controllers/adminController.js
import * as adminService from "../services/adminService.js";

import AppError from "../utils/AppError.js";
/**
 * GET /api/admin/users
 * Mengambil semua user aktif.
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/users
 * Membuat user baru.
 */
export const createUser = async (req, res, next) => {
  const { username, password, role_id, nickname, shift_id, exclude_from_attendance } = req.body;

  try {
    const newUser = await adminService.createUser({
      adminId: req.user.id,
      username,
      password,
      roleId: role_id,
      nickname,
      shiftId: shift_id,
      excludeFromAttendance: exclude_from_attendance,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ success: true, message: "Pengguna berhasil dibuat.", data: newUser });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return next(new AppError("Username sudah digunakan.", 409));
    }
    return next(new AppError("Gagal membuat pengguna.", 500));
  }
};

/**
 * GET /api/admin/users/roles
 * Mengambil semua role.
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await adminService.getAllRoles();
    res.json({ success: true, roles });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/users/:id
 * Update data user.
 */
export const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { username } = req.body;

  try {
    await adminService.updateUser({
      adminId: req.user.id,
      targetId: parseInt(id, 10),
      data: req.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true, message: "Data pengguna berhasil diperbarui." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return next(new AppError(`Username '${username}' sudah digunakan.`, 409));
    }
    return next(new AppError("Gagal memperbarui data pengguna.", 500));
  }
};

/**
 * DELETE /api/admin/users/:id
 * Soft delete user.
 */
export const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    await adminService.deleteUser({
      adminId: req.user.id,
      targetId: parseInt(id, 10),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true, message: "User berhasil dihapus." });
  } catch (error) {
    if (error.statusCode === 400) {
      return next(error);
    }
    return next(new AppError("Server error", 500));
  }
};

/**
 * GET /api/admin/users/:id/locations
 * Mengambil lokasi yang diizinkan untuk user.
 */
export const getUserLocations = async (req, res, next) => {
  const { id } = req.params;

  try {
    const locationIds = await adminService.getUserLocations(parseInt(id, 10));
    res.json({ success: true, data: locationIds });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id/locations
 * Update lokasi yang diizinkan untuk user.
 */
export const updateUserLocations = async (req, res, next) => {
  const { id } = req.params;
  const { locationIds } = req.body;

  try {
    await adminService.updateUserLocations({
      adminId: req.user.id,
      targetId: parseInt(id, 10),
      locationIds,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true, message: "Izin lokasi pengguna berhasil diperbarui." });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return next(new AppError("Satu atau lebih ID lokasi tidak valid.", 400));
    }
    return next(new AppError("Server error", 500));
  }
};
