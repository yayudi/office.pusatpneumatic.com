// backend/validators/statisticsValidator.js
import { z } from "zod";

export const stockMovementsSchema = z.object({
  startDate: z.string().min(1, "startDate diperlukan."),
  endDate: z.string().min(1, "endDate diperlukan."),
}).passthrough();

export const stockTimelineExportSchema = z.object({
  searchQuery: z.string().min(1, "searchQuery diperlukan."),
}).passthrough();
