// backend/controllers/stockRequestController.js
import * as stockRequestService from "../services/stockRequestService.js";
/**
 * Mendapatkan daftar permintaan stok (opsional dengan filter)
 */
export const getStockRequests = async (req, res, next) => {
  try {
    const filters = req.query;
    const result = await stockRequestService.getStockRequestsService(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Membuat permintaan stok baru
 */
export const createStockRequest = async (req, res, next) => {
  try {
    const payload = req.body;
    const userId = req.user.id;
    const result = await stockRequestService.createStockRequestService(payload, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Menyetujui permintaan stok
 */
export const approveStockRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await stockRequestService.approveStockRequestService(id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Menolak permintaan stok
 */
export const rejectStockRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await stockRequestService.rejectStockRequestService(id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Menyelesaikan permintaan stok dan menerima barang
 */
export const completeStockRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receivedItems } = req.body; // Array [{ productId, receivedQuantity }]
    const result = await stockRequestService.completeStockRequestService(id, receivedItems, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Memproses aksi massal pada permintaan stok
 */
export const bulkActionStockRequest = async (req, res, next) => {
  try {
    const { action, requestIds } = req.body;
    const result = await stockRequestService.bulkActionStockRequestService(requestIds, action, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
