// backend/repositories/roleRepository.js

/**
 * @param {import('mysql2/promise').Connection} connection
 * @returns {Promise<any>}
 */
export const getRoles = async (connection) => {
  const [roles] = await connection.query("SELECT id, name, description FROM roles ORDER BY name");
  return roles;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @returns {Promise<any>}
 */
export const getPermissions = async (connection) => {
  const [permissions] = await connection.query("SELECT id, name, description, `group` FROM permissions ORDER BY `group`, name");
  return permissions;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number|string} roleId
 * @returns {Promise<any>}
 */
export const getRolePermissions = async (connection, roleId) => {
  const [rows] = await connection.query("SELECT permission_id FROM role_permission WHERE role_id = ?", [roleId]);
  return rows.map((row) => row.permission_id);
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number|string} roleId
 * @returns {Promise<any>}
 */
export const deleteRolePermissions = async (connection, roleId) => {
  await connection.query("DELETE FROM role_permission WHERE role_id = ?", [roleId]);
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number|string} roleId
 * @param {number|string} permissionIds
 * @returns {Promise<any>}
 */
export const insertRolePermissions = async (connection, roleId, permissionIds) => {
  if (!permissionIds || permissionIds.length === 0) return;
  const values = permissionIds.map((id) => [roleId, id]);
  await connection.query("INSERT INTO role_permission (role_id, permission_id) VALUES ?", [values]);
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {any} name
 * @param {any} description
 * @returns {Promise<any>}
 */
export const createRole = async (connection, name, description) => {
  const [result] = await connection.query("INSERT INTO roles (name, description) VALUES (?, ?)", [name, description || null]);
  return result.insertId;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number|string} id
 * @param {any} name
 * @param {any} description
 * @returns {Promise<any>}
 */
export const updateRole = async (connection, id, name, description) => {
  const [result] = await connection.query("UPDATE roles SET name = ?, description = ? WHERE id = ?", [name, description || null, id]);
  return result.affectedRows > 0;
};

/**
 * @param {import('mysql2/promise').Connection} connection
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const deleteRole = async (connection, id) => {
  const [result] = await connection.query("DELETE FROM roles WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
