// backend/validators/adminValidator.js
import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role_id: z.number().int().positive("Role wajib dipilih"),
  nickname: z.string().optional().nullable(),
  shift_id: z.number().int().optional().nullable(),
  exclude_from_attendance: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
  role_id: z.number().int().positive("Role wajib dipilih"),
  nickname: z.string().optional().nullable(),
  shift_id: z.number().int().optional().nullable(),
  exclude_from_attendance: z.boolean().optional(),
});

export const updateUserLocationsSchema = z.object({
  locationIds: z.array(z.number().int()).min(0, "Input harus berupa array ID lokasi"),
});
