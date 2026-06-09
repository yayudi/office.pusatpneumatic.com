// backend/controllers/roleController.js
import * as roleService from "../services/roleService.js";

export const getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getRolesService();
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

export const getPermissions = async (req, res, next) => {
  try {
    const permissions = await roleService.getPermissionsService();
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
};

export const getRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const permissions = await roleService.getRolePermissionsService(id);
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
};

export const updateRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    await roleService.updateRolePermissionsService(
      id,
      permissionIds,
      req.user.id,
      req.ip,
      req.headers["user-agent"],
    );
    res.json({ success: true, message: "Izin untuk peran berhasil diperbarui." });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const roleId = await roleService.createRoleService(
      name,
      description,
      req.user.id,
      req.ip,
      req.headers["user-agent"],
    );
    res.status(201).json({ success: true, message: "Peran berhasil dibuat.", roleId });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    await roleService.updateRoleService(
      id,
      name,
      description,
      req.user.id,
      req.ip,
      req.headers["user-agent"],
    );
    res.json({ success: true, message: "Peran berhasil diperbarui." });
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    await roleService.deleteRoleService(id, req.user.id, req.ip, req.headers["user-agent"]);
    res.json({ success: true, message: "Peran berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};
