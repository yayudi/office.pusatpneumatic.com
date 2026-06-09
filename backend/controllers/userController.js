// backend/controllers/userController.js
import * as userService from "../services/userService.js";

/**
 * Mendapatkan profil lengkap pengguna.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getProfile = async (req, res, next) => {
  try {
    const completeUser = await userService.getUserProfileService(req.user);
    res.json({
      success: true,
      message: `Data profil untuk ${completeUser.username} berhasil diambil.`,
      user: completeUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui profil pengguna (password/nickname).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { currentPassword, nickname, newPassword } = req.body;
    const userId = req.user.id;
    
    const updatedUser = await userService.updateProfileService(
      userId,
      currentPassword,
      nickname,
      newPassword,
      req.ip,
      req.headers["user-agent"]
    );

    res.json({
      success: true,
      message: "Data akun berhasil diperbarui.",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mengambil semua lokasi yang diizinkan untuk pengguna yang sedang login.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getMyLocations = async (req, res, next) => {
  try {
    const locations = await userService.getUserLocationsService(req.user.id);
    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};
