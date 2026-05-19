// backend/services/importSyncService.js
import * as pickingRepo from "../repositories/pickingRepository.js";
import * as productRepo from "../repositories/productRepository.js";
import * as locationRepo from "../repositories/locationRepository.js";
import { WMS_STATUS, MP_STATUS } from "../config/wmsConstants.js";
import Logger from "../utils/logger.js";

const safe = (val) => (val === undefined ? null : val);

// Helper log sederhana dengan Timestamp
const log = (invoiceId, msg) => {
  const ctx = invoiceId ? `IMPORT_SYNC:${invoiceId}` : "IMPORT_SYNC";
  Logger.info(msg, ctx);
};

/**
 * Menyinkronkan data order dari parser ke database.
 * Digunakan oleh Worker Queue untuk memproses data dalam background.
 */
export async function syncOrdersToDB(connection, ordersMap, userId, originalFilename) {
  let updatedCount = 0;
  const errors = [];

  log(null, `🚀 Memulai sinkronisasi ${ordersMap.size} order...`);

  for (const order of ordersMap.values()) {
    const invId = safe(order.invoiceId);

    try {
      await connection.beginTransaction();

      let listId;
      // Cek Header Existing
      const existingHeader = await pickingRepo.findActiveHeaderByInvoice(connection, invId);

      // Tentukan Status
      const mpStatus = safe(order.status) || MP_STATUS.NEW;
      const isMpCancel = mpStatus === MP_STATUS.CANCELLED;
      const isMpReturn = mpStatus === MP_STATUS.RETURNED;

      // Mapping Status Awal WMS
      let initialWmsStatus = WMS_STATUS.PENDING;
      if (isMpCancel) initialWmsStatus = WMS_STATUS.CANCEL;
      else if (isMpReturn) initialWmsStatus = WMS_STATUS.RETURNED;

      log(invId, `Status Deteksi: MP='${mpStatus}' -> WMS='${initialWmsStatus}'`);

      if (!existingHeader) {
        log(invId, "✨ Header Baru: Membuat Picking List...");
        listId = await pickingRepo.createHeader(connection, {
          userId,
          source: order.source,
          invoiceId: order.invoiceId,
          customer: order.customer,
          orderDate: order.orderDate,
          status: initialWmsStatus,
          mpStatus: mpStatus,
          filename: originalFilename,
        });
      } else {
        listId = existingHeader.id;
        log(invId, `♻️ Header Ditemukan (ID: ${listId}). Status Lama: ${existingHeader.status}`);

        // Update Status Header jika berubah drastis (Cancel/Return)
        if (isMpCancel && existingHeader.status !== WMS_STATUS.CANCEL) {
          log(invId, "⚠️ Status berubah menjadi CANCEL. Membatalkan item...");
          await pickingRepo.updateMarketplaceStatus(
            connection,
            listId,
            mpStatus,
            WMS_STATUS.CANCEL
          );
          await pickingRepo.cancelItemsByListId(connection, listId);
        } else if (isMpReturn && existingHeader.status !== WMS_STATUS.RETURNED) {
          log(invId, "↩️ Status berubah menjadi RETURNED. Update status item...");
          await pickingRepo.updateMarketplaceStatus(
            connection,
            listId,
            mpStatus,
            WMS_STATUS.RETURNED
          );
          await connection.query(
            `UPDATE picking_list_items SET status = ? WHERE picking_list_id = ?`,
            [WMS_STATUS.RETURNED, listId]
          );
        } else {
          // Update status marketplace biasa (misal: SHIPPED)
          if (existingHeader.marketplace_status !== mpStatus) {
            log(invId, `ℹ️ Update Status MP: ${existingHeader.marketplace_status} -> ${mpStatus}`);
            await pickingRepo.updateMarketplaceStatus(connection, listId, mpStatus);
          }
        }
      }

      // Proses Item
      const existingSkus = await pickingRepo.getExistingItemSkus(connection, listId);

      for (const item of order.items) {
        // Cek Master Produk
        const productId = await productRepo.getIdBySku(connection, item.sku);
        if (!productId) {
          log(invId, `❌ SKU '${item.sku}' tidak ditemukan di Master Produk. Skip.`);
          errors.push(`Order ${order.invoiceId}: SKU ${item.sku} not found in Master.`);
          continue;
        }

        const [prodInfo] = await productRepo.getProductsBySkus(connection, [item.sku]);
        if (!prodInfo) {
          errors.push(`Order ${order.invoiceId}: SKU ${item.sku} info not found.`);
          continue;
        }

        // Insert Item jika belum ada
        if (!existingSkus.has(item.sku)) {
          log(invId, `➕ Menambahkan Item Baru: ${item.sku} (Qty: ${item.qty})`);

          // Tentukan status item (mengikuti header atau default pending)
          const dbStatus =
            isMpReturn || isMpCancel ? initialWmsStatus : item.status || initialWmsStatus;

          if (dbStatus === "PENDING") {
            // A. Logic Paket / Bundle
            if (prodInfo.is_package) {
              log(invId, `   📦 Deteksi Paket: ${item.sku}. Mengurai komponen...`);
              const components = await productRepo.getBulkPackageComponents(connection, [
                prodInfo.id,
              ]);

              if (components.length > 0) {
                for (const comp of components) {
                  const compQty = item.qty * comp.quantity_per_package;
                  // Cari Lokasi
                  const locId = await locationRepo.findBestStock(
                    connection,
                    comp.component_product_id,
                    compQty
                  );
                  log(
                    invId,
                    `      -> Komponen: ${comp.component_sku} x ${compQty}. Lokasi: ${locId || "NULL"
                    }`
                  );

                  await pickingRepo.createItem(connection, {
                    listId,
                    productId: comp.component_product_id,
                    sku: item.sku,
                    qty: compQty,
                    status: dbStatus,
                    locationId: locId,
                  });
                }
              } else {
                log(invId, `      ⚠️ Paket kosong? Insert sebagai single item.`);
                const locId = await locationRepo.findBestStock(connection, prodInfo.id, item.qty);
                await pickingRepo.createItem(connection, {
                  listId,
                  productId: prodInfo.id,
                  sku: item.sku,
                  qty: item.qty,
                  status: dbStatus,
                  locationId: locId,
                });
              }
            }
            // B. Logic Single Product
            else {
              const locId = await locationRepo.findBestStock(connection, prodInfo.id, item.qty);
              log(
                invId,
                `   📍 Alokasi Single Item. Lokasi ID: ${locId || "TIDAK DITEMUKAN (Stok 0)"}`
              );

              await pickingRepo.createItem(connection, {
                listId,
                productId: prodInfo.id,
                sku: item.sku,
                qty: item.qty,
                status: dbStatus,
                locationId: locId,
              });
            }
          } else {
            // Status Non-Active (RETURNED / CANCEL)
            log(invId, `   ⚪ Insert Item Non-Picking (Status: ${dbStatus}). Lokasi NULL.`);
            await pickingRepo.createItem(connection, {
              listId,
              productId: prodInfo.id,
              sku: item.sku,
              qty: item.qty,
              status: dbStatus,
              locationId: null,
            });
          }
        } else {
          // log(invId, `   ⏩ Item ${item.sku} sudah ada. Skip.`);
        }
      }

      await connection.commit();
      updatedCount++;
    } catch (e) {
      await connection.rollback();
      Logger.error(`SYNC ERROR on ${order.invoiceId}`, e, "IMPORT_SYNC");
      errors.push(`Order ${order.invoiceId}: ${e.message}`);
    }
  }

  log(null, `🏁 Sinkronisasi Selesai. Updated: ${updatedCount}, Errors: ${errors.length}`);
  return { updatedCount, errors };
}
