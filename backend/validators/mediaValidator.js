// backend/validators/mediaValidator.js
import { z } from "zod";

export const updateTagsSchema = z.object({
  tags: z.union([
    z.string().transform(s => [s]),
    z.array(z.string())
  ]),
});

export const updateTitleSchema = z.object({
  title: z.string().min(1, "Title wajib diisi").trim(),
});
