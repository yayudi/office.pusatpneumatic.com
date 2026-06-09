// backend/validators/returnValidator.js
import { z } from "zod";

export const createManualReturnSchema = z.object({
  productId: z.number().int().positive("Product ID wajib diisi"),
  quantity: z.number().int().positive("Quantity harus lebih besar dari 0"),
  locationId: z.number().int().positive("Location ID wajib diisi"),
  condition: z.string().min(1, "Kondisi wajib diisi"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const approveReturnSchema = z.object({
  itemId: z.number().int().positive("Item ID wajib diisi"),
  qtyAccepted: z.number().int().min(0, "Qty Accepted tidak boleh negatif"),
  locationId: z.number().int().positive("Location ID wajib diisi"),
  condition: z.string().min(1, "Condition wajib diisi"),
  notes: z.string().optional(),
});
