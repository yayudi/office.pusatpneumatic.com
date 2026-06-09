import db from "../config/db.js";
import * as investigationRepo from "../repositories/investigationRepository.js";
import AppError from "../utils/AppError.js";

/**
 * Service to find duplicate stock transactions.
 * 
 * @param {Object} filters
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.includeNotes]
 * @param {string} [filters.excludeNotes]
 * @param {string} [filters.movementType]
 * @param {string} [filters.productName]
 * @param {string} [filters.username]
 * @param {string} [filters.location]
 * @returns {Promise<Array>}
 */
export const getDuplicateTransactionsService = async (filters) => {
  const connection = await db.getConnection();
  try {
    // Validasi basic
    if (filters.startDate && filters.endDate) {
      if (new Date(filters.startDate) > new Date(filters.endDate)) {
        throw new AppError("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.", 400);
      }
    }

    const duplicates = await investigationRepo.findDuplicateTransactions(connection, filters);
    
    const invoiceSet = new Set();
    const itemIdSet = new Set();
    const invoiceRegex = /Sale Ref:\s+(.*?)\s+\(Item/i;
    const itemRegex = /Sale Ref:\s*Item\s*#(\d+)/i;

    // Grouping for better frontend consumption
    // We group by notes + product_id
    const grouped = duplicates.reduce((acc, curr) => {
      const key = `${curr.notes}_${curr.product_id}`;
      if (!acc[key]) {
        let extractedInvoice = null;
        let extractedItemId = null;
        if (curr.notes) {
          const matchInv = curr.notes.match(invoiceRegex);
          if (matchInv && matchInv[1]) {
            extractedInvoice = matchInv[1].trim();
            invoiceSet.add(extractedInvoice);
          } else {
            const matchItem = curr.notes.match(itemRegex);
            if (matchItem && matchItem[1]) {
              extractedItemId = parseInt(matchItem[1], 10);
              itemIdSet.add(extractedItemId);
            }
          }
        }
        
        acc[key] = {
          notes: curr.notes,
          productId: curr.product_id,
          productName: curr.product_name,
          sku: curr.sku,
          movementType: curr.movement_type,
          extractedInvoice,
          extractedItemId,
          pickingList: null,
          totalQuantity: 0,
          occurrences: 0,
          transactions: []
        };
      }
      acc[key].occurrences += 1;
      acc[key].totalQuantity += curr.quantity;
      acc[key].transactions.push({
        id: curr.id,
        quantity: curr.quantity,
        fromLocationCode: curr.from_location_code,
        toLocationCode: curr.to_location_code,
        userId: curr.user_id,
        username: curr.username,
        createdAt: curr.created_at
      });
      return acc;
    }, {});

    const invoiceIds = Array.from(invoiceSet);
    const itemIds = Array.from(itemIdSet);
    let pickingDetails = [];

    if (invoiceIds.length > 0) {
      const details = await investigationRepo.findPickingListDetailsByInvoices(connection, invoiceIds);
      pickingDetails = [...pickingDetails, ...details];
    }
    if (itemIds.length > 0) {
      const details = await investigationRepo.findPickingListDetailsByItemIds(connection, itemIds);
      pickingDetails = [...pickingDetails, ...details];
    }

    if (pickingDetails.length > 0) {
      const pickingLists = {}; // map by listId
      const pickingByInvoice = {};
      const pickingByItemId = {};

      pickingDetails.forEach(row => {
        const listId = row.picking_list_id;
        if (!pickingLists[listId]) {
          pickingLists[listId] = {
            id: row.picking_list_id,
            originalInvoiceId: row.original_invoice_id,
            customerName: row.customer_name,
            source: row.source,
            orderDate: row.order_date,
            status: row.list_status,
            marketplaceStatus: row.marketplace_status,
            shopName: row.shop_name,
            items: []
          };
          if (row.original_invoice_id) {
            pickingByInvoice[row.original_invoice_id] = pickingLists[listId];
          }
        }
        pickingLists[listId].items.push({
          itemId: row.item_id,
          productId: row.product_id,
          originalSku: row.original_sku,
          productName: row.product_name,
          quantity: row.quantity,
          price: row.price,
          status: row.item_status
        });
        pickingByItemId[row.item_id] = pickingLists[listId];
      });

      Object.values(grouped).forEach(group => {
        if (group.extractedInvoice && pickingByInvoice[group.extractedInvoice]) {
          group.pickingList = pickingByInvoice[group.extractedInvoice];
        } else if (group.extractedItemId && pickingByItemId[group.extractedItemId]) {
          group.pickingList = pickingByItemId[group.extractedItemId];
        }
      });
    }

    let finalGrouped = Object.values(grouped);

    // Apply Picking List Filters if any
    const { plSource, plStatus, plMarketplaceStatus, plCustomer } = filters;
    if (plSource || plStatus || plMarketplaceStatus || plCustomer) {
      finalGrouped = finalGrouped.filter(group => {
        const pl = group.pickingList;
        if (!pl) return false;
        
        if (plSource && pl.source !== plSource) return false;
        if (plStatus && pl.status !== plStatus) return false;
        if (plMarketplaceStatus && pl.marketplaceStatus !== plMarketplaceStatus) return false;
        if (plCustomer && !pl.customerName?.toLowerCase().includes(plCustomer.toLowerCase())) return false;
        
        return true;
      });
    }

    return finalGrouped;
  } finally {
    connection.release();
  }
};
