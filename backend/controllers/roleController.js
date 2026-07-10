import catchAsync from "../utils/catchAsync.js";
// backend/controllers/roleController.js
import * as roleService from "../services/roleService.js";

export const getRoles = catchAsync(async (req, res, next) => {
  const roles = await roleService.getRolesService();
  res.json({ success: true, data: roles });
});

export const getPermissions = catchAsync(async (req, res, next) => {
  const permissions = await roleService.getPermissionsService();
  res.json({ success: true, data: permissions });
});

export const getRolePermissions = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const permissions = await roleService.getRolePermissionsService(id);
  res.json({ success: true, data: permissions });
});

export const updateRolePermissions = catchAsync(async (req, res, next) => {
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
});

export const createRole = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const roleId = await roleService.createRoleService(
    name,
    description,
    req.user.id,
    req.ip,
    req.headers["user-agent"],
  );
  res.status(201).json({ success: true, message: "Peran berhasil dibuat.", roleId });
});

export const updateRole = catchAsync(async (req, res, next) => {
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
});

export const deleteRole = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  await roleService.deleteRoleService(id, req.user.id, req.ip, req.headers["user-agent"]);
  res.json({ success: true, message: "Peran berhasil dihapus." });
});
