import { z } from "zod";

export const stockTransferSchema = z.object({
  productId: z.union([z.string(), z.number()], { required_error: "Product ID wajib diisi" }),
  fromLocationId: z.coerce.number({ required_error: "Lokasi asal wajib diisi" }),
  toLocationId: z.coerce.number({ required_error: "Lokasi tujuan wajib diisi" }),
  quantity: z.coerce.number().min(0.01, "Kuantitas harus lebih dari 0"),
  notes: z.string().optional(),
});

export const stockAdjustSchema = z.object({
  productId: z.union([z.string(), z.number()], { required_error: "Product ID wajib diisi" }),
  locationId: z.coerce.number({ required_error: "Lokasi wajib diisi" }),
  quantity: z.coerce.number(),
  type: z.string().optional(),
  notes: z.string().optional(),
});

export const batchProcessSchema = z.object({
  type: z.string({ required_error: "Tipe batch wajib diisi" }),
  fromLocationId: z.coerce.number().optional(),
  toLocationId: z.coerce.number().optional(),
  notes: z.string().optional(),
  movements: z.array(z.object({
    productId: z.union([z.string(), z.number()]).optional(),
    sku: z.string().optional(),
    quantity: z.coerce.number(),
    fromLocationId: z.coerce.number().optional(),
    toLocationId: z.coerce.number().optional(),
    notes: z.string().optional()
  })).min(1, "Minimal satu pergerakan stok")
});

export const batchTransferSchema = z.object({
  fromLocationId: z.coerce.number({ required_error: "Lokasi asal wajib diisi" }),
  toLocationId: z.coerce.number({ required_error: "Lokasi tujuan wajib diisi" }),
  movements: z.array(z.object({
    productId: z.union([z.string(), z.number()]).optional(),
    sku: z.string().optional(),
    quantity: z.coerce.number(),
    notes: z.string().optional()
  })).min(1, "Minimal satu pergerakan stok")
});

export const validateReturnSchema = z.object({
  pickingListItemId: z.coerce.number({ required_error: "Picking List Item ID wajib diisi" }),
  returnToLocationId: z.coerce.number({ required_error: "Lokasi retur wajib diisi" })
});

export const batchLogsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)"),
  productName: z.string().optional(),
  movementType: z.string().optional(),
  sourceLocation: z.string().optional(),
  destinationLocation: z.string().optional(),
  userId: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(50)
});

export const batchLogExportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)"),
  productName: z.string().optional(),
  movementType: z.string().optional(),
  sourceLocation: z.string().optional(),
  destinationLocation: z.string().optional(),
  userId: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
});
