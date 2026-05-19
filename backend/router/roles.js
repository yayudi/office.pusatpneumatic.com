import axios from "../axios";
import Logger from "../utils/logger.js";

/**
 * Mengambil daftar semua peran (roles) dari server.
 * @returns {Promise<Array>}
 */
export async function fetchAllRoles() {
  try {
    const response = await axios.get("/admin/roles");
    return response.data.data || [];
  } catch (error) {
    Logger.error("Error saat mengambil data peran", error, "ROLES_LEGACY");
    throw error.response?.data || error;
  }
}

/**
 * Mengambil daftar semua izin (permissions) yang tersedia di sistem.
 * @returns {Promise<Array>}
 */
export async function fetchAllPermissions() {
  try {
    const response = await axios.get("/admin/roles/permissions");
    return response.data.data || [];
  } catch (error) {
    Logger.error("Error saat mengambil data izin", error, "ROLES_LEGACY");
    throw error.response?.data || error;
  }
}

/**
 * Mengambil ID izin yang dimiliki oleh sebuah peran spesifik.
 * @param {number} roleId - ID peran.
 * @returns {Promise<Array>}
 */
export async function fetchRolePermissions(roleId) {
  try {
    const response = await axios.get(`/admin/roles/${roleId}/permissions`);
    return response.data.data || [];
  } catch (error) {
    Logger.error("Error saat mengambil izin peran", error, "ROLES_LEGACY");
    throw error.response?.data || error;
  }
}

/**
 * Memperbarui semua izin untuk sebuah peran spesifik.
 * @param {number} roleId - ID peran.
 * @param {Array<number>} permissionIds - Array baru berisi ID izin.
 * @returns {Promise<object>}
 */
export async function updateRolePermissions(roleId, permissionIds) {
  try {
    const response = await axios.put(`/admin/roles/${roleId}/permissions`, { permissionIds });
    return response.data;
  } catch (error) {
    Logger.error("Error saat memperbarui izin peran", error, "ROLES_LEGACY");
    throw error.response?.data || error;
  }
}
