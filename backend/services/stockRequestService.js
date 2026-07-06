// backend/services/stockRequestService.js
import db from "../config/db.js";
import { processBatchMovementsService, processBatchOpnameService } from "./stockService.js";
import { emitSharedTaskSignal } from "./firebaseSignalService.js";
import * as stockRequestRepo from "../repositories/stockRequestRepository.js";
import * as notificationService from "./notificationService.js";

/**
 * Membuat permintaan stok (bulk)
 */
export const createStockRequestService = async (payload, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const fullPayload = { ...payload, requesterId: userId };
    const type = payload.type || "TRANSFER";

    // Validasi basic
    if (type === "TRANSFER") {
      if (!payload.fromLocationId || !payload.toLocationId) {
        throw new Error("Lokasi asal dan tujuan harus diisi untuk transfer.");
      }
      if (payload.fromLocationId === payload.toLocationId) {
        throw new Error("Lokasi asal dan tujuan tidak boleh sama.");
      }
    } else if (type === "STOCK_OPNAME") {
      if (!payload.toLocationId) {
        throw new Error("Lokasi opname harus diisi.");
      }
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error("Minimal harus ada satu produk yang diminta.");
    }

    const requestId = await stockRequestRepo.createStockRequest(connection, fullPayload);
    await connection.commit();
    emitSharedTaskSignal("STOCK_REQUESTS", "REFRESH_REQUESTS").catch((e) => console.error(e));

    // Notifikasi ke user dengan permission approve-stock-requests
    notificationService
      .notifyUsersByPermission(
        "approve-stock-requests",
        "WMS",
        "Permintaan Stok Baru",
        `Permintaan stok baru (${type}) telah dibuat dan menunggu persetujuan.`,
        { requestId, type },
        userId,
      )
      .catch((e) => console.error("[NOTIFY_ERROR]", e));

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
    const result = await stockRequestRepo.getStockRequests(connection, filters);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
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
    if (request.status !== "PENDING")
      throw new Error("Hanya permintaan berstatus PENDING yang dapat disetujui.");

    // Cegah self-approval
    if (request.requester_id === user.id) {
      throw new Error("Anda tidak dapat menyetujui permintaan Anda sendiri.");
    }

    if (request.type === "STOCK_OPNAME") {
      const movements = request.items.map((reqItem) => ({
        sku: reqItem.sku,
        quantity: reqItem.quantity,
        toLocationId: request.to_location_id,
        notes: `Stock Request Opname ${request.request_number}`,
      }));

      await processBatchOpnameService({
        movements: movements,
        userId: user.id,
        userRoleId: user.role_id || 1,
      });

      for (const reqItem of request.items) {
        await stockRequestRepo.updateRequestItemReceived(connection, reqItem.id, reqItem.quantity);
      }

      await stockRequestRepo.updateStockRequestStatus(connection, requestId, "COMPLETED");
      await connection.commit();
      emitSharedTaskSignal("STOCK_REQUESTS", "REFRESH_REQUESTS").catch((e) => console.error(e));

      // Notifikasi ke requester
      notificationService
        .notifyUsers(
          [request.requester_id],
          "WMS",
          "Permintaan Opname Disetujui",
          `Permintaan stok opname ${request.request_number} telah disetujui dan stok disesuaikan.`,
          { requestId, requestNumber: request.request_number },
          true,
        )
        .catch((e) => console.error("[NOTIFY_ERROR]", e));

      return { success: true, message: "Permintaan stok opname disetujui dan stok disesuaikan." };
    }

    await stockRequestRepo.updateStockRequestStatus(connection, requestId, "APPROVED");

    await connection.commit();
    emitSharedTaskSignal("STOCK_REQUESTS", "REFRESH_REQUESTS").catch((e) => console.error(e));

    // Notifikasi ke requester
    notificationService
      .notifyUsers(
        [request.requester_id],
        "WMS",
        "Permintaan Stok Disetujui",
        `Permintaan stok ${request.request_number} telah disetujui. Silakan lakukan konfirmasi penerimaan.`,
        { requestId, requestNumber: request.request_number },
        true,
      )
      .catch((e) => console.error("[NOTIFY_ERROR]", e));

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
export const rejectStockRequestService = async (requestId, _) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const request = await stockRequestRepo.getStockRequestById(connection, requestId);
    if (!request) throw new Error("Permintaan stok tidak ditemukan.");
    if (request.status !== "PENDING")
      throw new Error("Hanya permintaan berstatus PENDING yang dapat ditolak.");

    await stockRequestRepo.updateStockRequestStatus(connection, requestId, "REJECTED");

    await connection.commit();
    emitSharedTaskSignal("STOCK_REQUESTS", "REFRESH_REQUESTS").catch((e) => console.error(e));

    // Notifikasi ke requester
    notificationService
      .notifyUsers(
        [request.requester_id],
        "WMS",
        "Permintaan Stok Ditolak",
        `Permintaan stok ${request.request_number} telah ditolak.`,
        { requestId, requestNumber: request.request_number },
        true,
      )
      .catch((e) => console.error("[NOTIFY_ERROR]", e));

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
    if (request.status !== "APPROVED")
      throw new Error("Hanya permintaan berstatus APPROVED yang dapat diselesaikan.");

    // Update received_quantity
    const movements = [];
    for (const reqItem of request.items) {
      // Cari received quantity dari payload receivedItems (jika ada), kalau tidak full quantity
      const match = receivedItems
        ? receivedItems.find((r) => r.productId === reqItem.product_id)
        : null;
      const rQty = match ? match.receivedQuantity : reqItem.quantity;

      await stockRequestRepo.updateRequestItemReceived(connection, reqItem.id, rQty);

      if (request.type === "STOCK_OPNAME") {
        throw new Error("Permintaan Stock Opname tidak memerlukan konfirmasi penerimaan.");
      } else {
        if (rQty > 0) {
          movements.push({
            sku: reqItem.sku,
            quantity: rQty,
            fromLocationId: request.from_location_id,
            toLocationId: request.to_location_id,
            notes: `Stock Request ${request.request_number}`,
          });
        }
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
        userRoleId: 1, // Bypass pengecekan lokasi karena ini sudah di-approve
      });
    }

    await stockRequestRepo.updateStockRequestStatus(connection, requestId, "COMPLETED");

    await connection.commit();
    emitSharedTaskSignal("STOCK_REQUESTS", "REFRESH_REQUESTS").catch((e) => console.error(e));

    // Notifikasi ke requester
    notificationService
      .notifyUsers(
        [request.requester_id],
        "WMS",
        "Permintaan Stok Selesai",
        `Permintaan stok ${request.request_number} telah selesai dan stok berhasil ditransfer.`,
        { requestId, requestNumber: request.request_number },
        true,
      )
      .catch((e) => console.error("[NOTIFY_ERROR]", e));

    return { success: true, message: "Permintaan stok selesai dan stok telah ditransfer." };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Bulk Action untuk Permintaan Stok
 * Mendukung aksi APPROVE dan REJECT secara massal.
 */
export const bulkActionStockRequestService = async (requestIds, action, user) => {
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Tidak ada ID permintaan yang dipilih.");
  }

  const results = {
    successCount: 0,
    failedCount: 0,
    details: [],
  };

  for (const id of requestIds) {
    try {
      if (action === "APPROVE") {
        await approveStockRequestService(id, user);
      } else if (action === "REJECT") {
        await rejectStockRequestService(id, user);
      } else {
        throw new Error(`Aksi ${action} tidak didukung secara massal.`);
      }

      results.successCount++;
      results.details.push({ id, status: "success" });
    } catch (err) {
      results.failedCount++;
      results.details.push({ id, status: "failed", reason: err.message });
    }
  }

  return {
    success: true,
    message: `Memproses ${requestIds.length} permintaan. Berhasil: ${results.successCount}, Gagal: ${results.failedCount}.`,
    data: results,
  };
};
