// backend/validators/categoryValidator.js
import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  description: z.string().optional().nullable(),
});
