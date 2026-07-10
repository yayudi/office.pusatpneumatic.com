import catchAsync from "../utils/catchAsync.js";
// backend/controllers/stockRequestController.js
import * as stockRequestService from "../services/stockRequestService.js";
/**
 * Mendapatkan daftar permintaan stok (opsional dengan filter)
 */
export const getStockRequests = catchAsync(async (req, res, next) => {
  const filters = req.query;
  const result = await stockRequestService.getStockRequestsService(filters);
  res.json(result);
});

/**
 * Membuat permintaan stok baru
 */
export const createStockRequest = catchAsync(async (req, res, next) => {
  const payload = req.body;
  const userId = req.user.id;
  const result = await stockRequestService.createStockRequestService(payload, userId);
  res.json(result);
});

/**
 * Menyetujui permintaan stok
 */
export const approveStockRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await stockRequestService.approveStockRequestService(id, req.user);
  res.json(result);
});

/**
 * Menolak permintaan stok
 */
export const rejectStockRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await stockRequestService.rejectStockRequestService(id, req.user);
  res.json(result);
});

/**
 * Menyelesaikan permintaan stok dan menerima barang
 */
export const completeStockRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { receivedItems } = req.body; // Array [{ productId, receivedQuantity }]
  const result = await stockRequestService.completeStockRequestService(id, receivedItems, req.user);
  res.json(result);
});

/**
 * Memproses aksi massal pada permintaan stok
 */
export const bulkActionStockRequest = catchAsync(async (req, res, next) => {
  const { action, requestIds } = req.body;
  const result = await stockRequestService.bulkActionStockRequestService(requestIds, action, req.user);
  res.json(result);
});
