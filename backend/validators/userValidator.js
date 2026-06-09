// backend/validators/userValidator.js
import { z } from "zod";

export const updateProfileSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  nickname: z.string().optional(),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter").optional().or(z.literal("")),
});
