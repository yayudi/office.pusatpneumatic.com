import { z } from "zod";

export const locationSchema = z.object({
  code: z.string().min(1, "Code is required"),
  building: z.string().min(1, "Building is required"),
  floor: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  purpose: z.enum(["DISPLAY", "STORAGE", "DEFECT"], {
    errorMap: () => ({ message: "Purpose must be DISPLAY, STORAGE, or DEFECT" }),
  }),
});
