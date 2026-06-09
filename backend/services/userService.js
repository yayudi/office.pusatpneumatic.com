// backend/services/userService.js
import db from "../config/db.js";
import AppError from "../utils/AppError.js";
import bcrypt from "bcryptjs";
import * as userRepo from "../repositories/userRepository.js";
import { createLog } from "../repositories/systemLogRepository.js";

/**
 * @param {any} tokenUser
 * @returns {Promise<any>}
 */
export const getUserProfileService = async (tokenUser) => {
  const dbUser = await userRepo.getUserById(db, tokenUser.id) || {};
  return {
    ...tokenUser,
    nickname: dbUser.nickname,
  };
};

/**
 * @param {number|string} userId
 * @param {any} currentPassword
 * @param {any} nickname
 * @param {any} newPassword
 * @param {any} ip
 * @param {any} userAgent
 * @returns {Promise<any>}
 */
export const updateProfileService = async (userId, currentPassword, nickname, newPassword, ip, userAgent) => {
  if (!currentPassword) {
    throw new AppError("Password saat ini diperlukan untuk menyimpan perubahan.", 400);
  }

  const user = await userRepo.getUserById(db, userId);
  if (!user) throw new AppError("User tidak ditemukan.", 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new AppError("Password saat ini salah.", 403);

  const updates = {};
  if (nickname !== undefined && nickname !== user.nickname) {
    updates.nickname = nickname;
  }

  if (newPassword) {
    updates.hashedNewPassword = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length > 0) {
    await userRepo.updateProfile(db, userId, updates);
  }

  const updatedUser = await userRepo.getUserById(db, userId);

  // LOGGING
  await createLog(db, {
    userId: userId,
    action: "UPDATE",
    targetType: "USER",
    targetId: String(userId),
    changes: {
      note: "Self Profile Update",
      updates: { nickname, passwordChanged: !!newPassword }
    },
    ip: ip,
    userAgent: userAgent,
  });

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    nickname: updatedUser.nickname,
    role_id: updatedUser.role_id,
  };
};

/**
 * @param {number|string} userId
 * @returns {Promise<any>}
 */
export const getUserLocationsService = async (userId) => {
  return await userRepo.getUserLocations(db, userId);
};
