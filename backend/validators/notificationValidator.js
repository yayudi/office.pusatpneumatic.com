// backend/validators/notificationValidator.js
import { z } from "zod";

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        type: z.string(),
        is_enabled: z.boolean(),
      }),
    )
    .min(1, "Minimal satu preferensi harus dipilih"),
});
