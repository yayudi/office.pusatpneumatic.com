// backend/services/roleService.js
import db from "../config/db.js";
import AppError from "../utils/AppError.js";
import * as roleRepo from "../repositories/roleRepository.js";
import { createLog } from "../repositories/systemLogRepository.js";

/**
 * @returns {Promise<any>}
 */
export const getRolesService = async () => {
  return await roleRepo.getRoles(db);
};

/**
 * @returns {Promise<any>}
 */
export const getPermissionsService = async () => {
  return await roleRepo.getPermissions(db);
};

/**
 * @param {number|string} roleId
 * @returns {Promise<any>}
 */
export const getRolePermissionsService = async (roleId) => {
  return await roleRepo.getRolePermissions(db, roleId);
};

/**
 * @param {number|string} roleId
 * @param {number|string} permissionIds
 * @param {number|string} userId
 * @param {any} ip
 * @param {any} userAgent
 * @returns {Promise<any>}
 */
export const updateRolePermissionsService = async (roleId, permissionIds, userId, ip, userAgent) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await roleRepo.deleteRolePermissions(connection, roleId);
    await roleRepo.insertRolePermissions(connection, roleId, permissionIds);

    await createLog(connection, {
      userId: userId,
      action: "UPDATE",
      targetType: "ROLE",
      targetId: String(roleId),
      changes: { note: "Updated Role Permissions", permissionCount: permissionIds.length },
      ip,
      userAgent,
    });

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new AppError("Satu atau lebih ID izin atau peran tidak valid.", 400);
    }
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {any} name
 * @param {any} description
 * @param {number|string} userId
 * @param {any} ip
 * @param {any} userAgent
 * @returns {Promise<any>}
 */
export const createRoleService = async (name, description, userId, ip, userAgent) => {
  try {
    const roleId = await roleRepo.createRole(db, name, description);

    await createLog(db, {
      userId,
      action: "CREATE",
      targetType: "ROLE",
      targetId: String(roleId),
      changes: { name, description },
      ip,
      userAgent,
    });

    return roleId;
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Nama peran sudah ada.", 409);
    }
    throw error;
  }
};

/**
 * @param {number|string} roleId
 * @param {any} name
 * @param {any} description
 * @param {number|string} userId
 * @param {any} ip
 * @param {any} userAgent
 * @returns {Promise<any>}
 */
export const updateRoleService = async (roleId, name, description, userId, ip, userAgent) => {
  try {
    const isUpdated = await roleRepo.updateRole(db, roleId, name, description);
    if (!isUpdated) throw new AppError("Peran tidak ditemukan.", 404);

    await createLog(db, {
      userId,
      action: "UPDATE",
      targetType: "ROLE",
      targetId: String(roleId),
      changes: { name, description },
      ip,
      userAgent,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Nama peran sudah digunakan.", 409);
    }
    throw error;
  }
};

/**
 * @param {number|string} roleId
 * @param {number|string} userId
 * @param {any} ip
 * @param {any} userAgent
 * @returns {Promise<any>}
 */
export const deleteRoleService = async (roleId, userId, ip, userAgent) => {
  try {
    const isDeleted = await roleRepo.deleteRole(db, roleId);
    if (!isDeleted) throw new AppError("Peran tidak ditemukan.", 404);

    await createLog(db, {
      userId,
      action: "DELETE",
      targetType: "ROLE",
      targetId: String(roleId),
      changes: { note: "Deleted Role" },
      ip,
      userAgent,
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      throw new AppError("Gagal menghapus: Peran ini masih digunakan oleh satu atau lebih pengguna.", 400);
    }
    throw error;
  }
};
