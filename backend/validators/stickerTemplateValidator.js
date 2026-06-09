// backend/validators/stickerTemplateValidator.js
import { z } from "zod";

export const stickerTemplateSchema = z.object({
  name: z.string().min(1, "Nama template wajib diisi"),
  config_json: z.string().min(1, "Konfigurasi JSON wajib diisi").or(z.object({}).passthrough()), // Can be string or object depending on frontend submission
});
