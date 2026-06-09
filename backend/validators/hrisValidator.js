// backend/validators/hrisValidator.js
import { z } from "zod";

// Body validation
export const createScheduleSchema = z.object({
  userId: z.number().int().positive("User ID wajib diisi"),
  shiftId: z.number().int().positive("Shift ID wajib diisi"),
  date: z.string().min(1, "Tanggal wajib diisi"), // Can use .regex(/^\d{4}-\d{2}-\d{2}$/) if strict
});

export const updateLogSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  timeIn: z.string().nullable().optional(),
  timeOut: z.string().nullable().optional(),
  status: z.string().min(1, "Status wajib diisi"),
});

// Query validation
export const dateRangeSchema = z.object({
  startDate: z.string().min(1, "startDate wajib diisi"),
  endDate: z.string().min(1, "endDate wajib diisi"),
});

export const getSchedulesSchema = z.object({
  userId: z.string().min(1, "userId wajib diisi"),
  startDate: z.string().min(1, "startDate wajib diisi"),
  endDate: z.string().min(1, "endDate wajib diisi"),
});

export const deleteScheduleSchema = z.object({
  userId: z.string().min(1, "userId wajib diisi"),
  date: z.string().min(1, "date wajib diisi"),
});

export const monthlyDataSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});
