// backend/validators/pickingValidator.js
import { z } from "zod";

export const completeItemsSchema = z.object({
  items: z.array(z.any()).min(1, "Format data tidak valid. Harap kirim array items."),
});
