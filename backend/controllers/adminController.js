// backend/controllers/adminController.js
import * as adminService from "../services/adminService.js";
import Logger from "../utils/logger.js";

/**
 * GET /api/admin/users
 * Mengambil semua user aktif.
 */
export const getUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    Logger.error("Error fetching users", err, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/users
 * Membuat user baru.
 */
export const createUser = async (req, res) => {
  const { username, password, role_id, nickname, shift_id, exclude_from_attendance } = req.body;

  // Validasi struktural
  if (!username || !password || !role_id) {
    return res
      .status(400)
      .json({ success: false, message: "Semua field (username, password, role) wajib diisi." });
  }

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
      return res.status(409).json({ success: false, message: "Username sudah digunakan." });
    }
    Logger.error("Error creating user", error, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Gagal membuat pengguna." });
  }
};

/**
 * GET /api/admin/users/roles
 * Mengambil semua role.
 */
export const getRoles = async (req, res) => {
  try {
    const roles = await adminService.getAllRoles();
    res.json({ success: true, roles });
  } catch (err) {
    Logger.error("Error fetching roles", err, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PUT /api/admin/users/:id
 * Update data user.
 */
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, role_id } = req.body;

  // Validasi struktural
  if (!username || !role_id) {
    return res.status(400).json({ success: false, message: "Username dan role wajib diisi." });
  }

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
      return res
        .status(409)
        .json({ success: false, message: `Username '${username}' sudah digunakan.` });
    }
    Logger.error("Error updating user", error, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Gagal memperbarui data pengguna." });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Soft delete user.
 */
export const deleteUser = async (req, res) => {
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
      return res.status(400).json({ success: false, message: error.message });
    }
    Logger.error("Error deleting user", error, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/users/:id/locations
 * Mengambil lokasi yang diizinkan untuk user.
 */
export const getUserLocations = async (req, res) => {
  const { id } = req.params;

  try {
    const locationIds = await adminService.getUserLocations(parseInt(id, 10));
    res.json({ success: true, data: locationIds });
  } catch (error) {
    Logger.error("Error fetching user locations", error, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PUT /api/admin/users/:id/locations
 * Update lokasi yang diizinkan untuk user.
 */
export const updateUserLocations = async (req, res) => {
  const { id } = req.params;
  const { locationIds } = req.body;

  // Validasi struktural
  if (!Array.isArray(locationIds)) {
    return res.status(400).json({ success: false, message: "Input harus berupa array ID lokasi." });
  }

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
      return res
        .status(400)
        .json({ success: false, message: "Satu atau lebih ID lokasi tidak valid." });
    }
    Logger.error("Error updating user locations", error, "ADMIN_CONTROLLER");
    res.status(500).json({ success: false, message: "Server error" });
  }
};
