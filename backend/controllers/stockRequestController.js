// backend/controllers/stockRequestController.js
import * as stockRequestService from "../services/stockRequestService.js";
import Logger from "../utils/logger.js";

/**
 * Mendapatkan daftar permintaan stok (opsional dengan filter)
 */
export const getStockRequests = async (req, res) => {
  try {
    const filters = req.query;
    const result = await stockRequestService.getStockRequestsService(filters);
    res.json(result);
  } catch (error) {
    Logger.error("Get Stock Requests Error", error, "STOCK_REQ_CONTROLLER");
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Membuat permintaan stok baru
 */
export const createStockRequest = async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.user.id;
    const result = await stockRequestService.createStockRequestService(payload, userId);
    res.json(result);
  } catch (error) {
    Logger.error("Create Stock Request Error", error, "STOCK_REQ_CONTROLLER");
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Menyetujui permintaan stok
 */
export const approveStockRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await stockRequestService.approveStockRequestService(id, req.user);
    res.json(result);
  } catch (error) {
    Logger.error("Approve Stock Request Error", error, "STOCK_REQ_CONTROLLER");
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Menolak permintaan stok
 */
export const rejectStockRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await stockRequestService.rejectStockRequestService(id, req.user);
    res.json(result);
  } catch (error) {
    Logger.error("Reject Stock Request Error", error, "STOCK_REQ_CONTROLLER");
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Menyelesaikan permintaan stok dan menerima barang
 */
export const completeStockRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedItems } = req.body; // Array [{ productId, receivedQuantity }]
    const result = await stockRequestService.completeStockRequestService(id, receivedItems, req.user);
    res.json(result);
  } catch (error) {
    Logger.error("Complete Stock Request Error", error, "STOCK_REQ_CONTROLLER");
    res.status(400).json({ success: false, message: error.message });
  }
};
