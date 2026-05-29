// backend/services/stockRequestService.js
import db from "../config/db.js";
import * as stockRequestRepo from "../repositories/stockRequestRepository.js";
import { processBatchMovementsService } from "./stockService.js";
import * as stockRepo from "../repositories/stockMovementRepository.js";

/**
 * Membuat permintaan stok (bulk)
 */
export const createStockRequestService = async (payload, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const fullPayload = { ...payload, requesterId: userId };
    
    // Validasi basic
    if (!payload.fromLocationId || !payload.toLocationId) {
      throw new Error("Lokasi asal dan tujuan harus diisi.");
    }
    if (payload.fromLocationId === payload.toLocationId) {
      throw new Error("Lokasi asal dan tujuan tidak boleh sama.");
    }
    if (!payload.items || payload.items.length === 0) {
      throw new Error("Minimal harus ada satu produk yang diminta.");
    }

    const requestId = await stockRequestRepo.createStockRequest(connection, fullPayload);
    await connection.commit();
    return { success: true, message: "Permintaan stok berhasil dibuat.", requestId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Mendapatkan semua request dengan filter
 */
export const getStockRequestsService = async (filters) => {
  const connection = await db.getConnection();
  try {
    const requests = await stockRequestRepo.getStockRequests(connection, filters);
    return { success: true, data: requests };
  } finally {
    connection.release();
  }
};

/**
 * Approve Permintaan Stok (Oleh Pihak Pengirim)
 */
export const approveStockRequestService = async (requestId, user) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const request = await stockRequestRepo.getStockRequestById(connection, requestId);
    if (!request) throw new Error("Permintaan stok tidak ditemukan.");
    if (request.status !== "PENDING") throw new Error("Hanya permintaan berstatus PENDING yang dapat disetujui.");

    // Cek permission user, ini harusnya disematkan ke middleware, tapi kita pastikan di sini jika perlu.
    // Asumsi: Role harus punya permission 'approve-stock-requests'

    await stockRequestRepo.updateStockRequestStatus(connection, requestId, "APPROVED");
    
    await connection.commit();
    return { success: true, message: "Permintaan stok berhasil disetujui." };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Reject Permintaan Stok
 */
export const rejectStockRequestService = async (requestId, user) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const request = await stockRequestRepo.getStockRequestById(connection, requestId);
    if (!request) throw new Error("Permintaan stok tidak ditemukan.");
    if (request.status !== "PENDING") throw new Error("Hanya permintaan berstatus PENDING yang dapat ditolak.");

    await stockRequestRepo.updateStockRequestStatus(connection, requestId, "REJECTED");
    
    await connection.commit();
    return { success: true, message: "Permintaan stok telah ditolak." };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Complete Permintaan Stok (Oleh Pihak Penerima)
 * Ini akan mentrigger transfer stok.
 */
export const completeStockRequestService = async (requestId, receivedItems, user) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const request = await stockRequestRepo.getStockRequestById(connection, requestId);
    if (!request) throw new Error("Permintaan stok tidak ditemukan.");
    if (request.status !== "APPROVED") throw new Error("Hanya permintaan berstatus APPROVED yang dapat diselesaikan.");

    // Update received_quantity
    const movements = [];
    for (const reqItem of request.items) {
      // Cari received quantity dari payload receivedItems (jika ada), kalau tidak full quantity
      const match = receivedItems ? receivedItems.find(r => r.productId === reqItem.product_id) : null;
      const rQty = match ? match.receivedQuantity : reqItem.quantity;
      
      await stockRequestRepo.updateRequestItemReceived(connection, reqItem.id, rQty);
      
      if (rQty > 0) {
        movements.push({
          sku: reqItem.sku,
          quantity: rQty,
          fromLocationId: request.from_location_id,
          toLocationId: request.to_location_id,
          notes: `Stock Request ${request.request_number}`
        });
      }
    }

    // Trigger pergerakan stok menggunakan existing service.
    if (movements.length > 0) {
      await processBatchMovementsService({
        type: "TRANSFER",
        fromLocationId: request.from_location_id,
        toLocationId: request.to_location_id,
        notes: `Penyelesaian Permintaan Stok ${request.request_number}`,
        movements: movements,
        userId: user.id,
        userRoleId: 1 // Bypass pengecekan lokasi karena ini sudah di-approve
      });
    }

    await stockRequestRepo.updateStockRequestStatus(connection, requestId, "COMPLETED");
    
    await connection.commit();
    return { success: true, message: "Permintaan stok selesai dan stok telah ditransfer." };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
