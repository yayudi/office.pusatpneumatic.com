// backend/validators/notificationValidator.js
import { z } from "zod";

export const updatePreferencesSchema = z.object({
  preferences: z.array(z.string()).min(1, "Minimal satu preferensi harus dipilih"),
});
