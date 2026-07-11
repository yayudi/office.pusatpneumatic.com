import { z } from "zod";

export const locationSchema = z.object({
  code: z.string().min(1, "Code is required"),
  building: z.string().min(1, "Building is required"),
  floor: z.union([z.string(), z.number()]).optional().nullable().transform(val => val !== null && val !== undefined ? String(val) : null),
  name: z.string().optional().nullable(),
  purpose: z.enum(['WAREHOUSE', 'DISPLAY', 'BRANCH', 'RECEIVING', 'WORKSHOP', 'TRANSIT', 'STORAGE', 'DEFECT'], {
    errorMap: () => ({ message: "Purpose must be a valid location type" }),
  }),
});
