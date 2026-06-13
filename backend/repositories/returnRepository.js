// backend/repositories/returnRepository.js
import { WMS_STATUS } from "../config/wmsConstants.js";

/**
 * Mengambil item dari Picking List yang statusnya 'RETURNED' (Siap divalidasi gudang)
 */
export const getPendingReturns = async (connection, { limit = 10, offset = 0, search = '', source = '' }) => {
  let whereClauses = "pli.status = ? AND pl.is_active = 1";
  const queryParams = [WMS_STATUS?.RETURNED || "RETURNED"];

  if (source) {
    whereClauses += " AND pl.source = ?";
    queryParams.push(source);
  }

  if (search) {
    whereClauses += " AND (pl.original_invoice_id LIKE ? OR p.name LIKE ? OR pli.original_sku LIKE ?)";
    const searchVal = `%${search}%`;
    queryParams.push(searchVal, searchVal, searchVal);
  }

  const query = `
    SELECT SQL_CALC_FOUND_ROWS
      pli.id,
      pli.picking_list_id,
      pli.product_id,
      pli.original_sku as sku,
      pli.quantity,
      p.name as product_name,
      p.price,
      pl.original_invoice_id,
      pl.source,
      pl.customer_name,
      pl.marketplace_status,
      pl.created_at as order_date
    FROM picking_list_items pli
    JOIN picking_lists pl ON pli.picking_list_id = pl.id
    LEFT JOIN products p ON pli.product_id = p.id
    WHERE ${whereClauses}
    ORDER BY pl.created_at DESC
    LIMIT ? OFFSET ?
  `;

  queryParams.push(limit, offset);

  const [rows] = await connection.query(query, queryParams);
  const [[{ total }]] = await connection.query("SELECT FOUND_ROWS() as total");

  return { rows, total };
};

/**
 * Mengambil Riwayat Retur (Gabungan dari Picking List Items & Manual Returns)
 */
export const getReturnHistory = async (connection, { limit = 10, offset = 0, search = '', source = '', sortOrder = 'desc' }) => {
  let pickingWhere = "pli.status = 'COMPLETED_RETURN'";
  let manualWhere = "1=1";
  const queryParams = [];

  if (source) {
    if (source.toLowerCase() === 'manual') {
      pickingWhere += " AND 1=0"; // Don't match picking items
    } else {
      pickingWhere += ` AND LOWER(pl.source) = LOWER(?)`;
      queryParams.push(source);
      manualWhere += " AND 1=0"; // Don't match manual items
    }
  }

  if (search) {
    const searchVal = `%${search}%`;
    pickingWhere += " AND (pl.original_invoice_id LIKE ? OR p.name LIKE ? OR pli.original_sku LIKE ?)";
    queryParams.push(searchVal, searchVal, searchVal);

    manualWhere += " AND (mr.reference LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)";
    queryParams.push(searchVal, searchVal, searchVal);
  }

  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT SQL_CALC_FOUND_ROWS * FROM (
      -- Retur Marketplace (Picking Items)
      SELECT
        'MARKETPLACE' as type,
        pli.id,
        pl.original_invoice_id as reference,
        p.name as product_name,
        pli.original_sku as sku,
        pli.quantity,
        pli.return_condition as \`condition\`,
        pli.return_notes as notes,
        l.code as location_code,
        pl.updated_at as date,
        pl.source
      FROM picking_list_items pli
      JOIN picking_lists pl ON pli.picking_list_id = pl.id
      JOIN products p ON pli.product_id = p.id
      LEFT JOIN locations l ON pli.confirmed_location_id = l.id
      WHERE ${pickingWhere}

      UNION ALL

      -- Retur Manual
      SELECT
        'MANUAL' as type,
        mr.id,
        mr.reference,
        p.name as product_name,
        p.sku,
        mr.quantity,
        mr.\`condition\`,
        mr.notes,
        NULL as location_code, -- Manual return tidak memiliki link langsung ke locations di view ini
        mr.created_at as date,
        'MANUAL' as source
      FROM manual_returns mr
      JOIN products p ON mr.product_id = p.id
      WHERE ${manualWhere}
    ) as combined_history
    ORDER BY date ${orderDir}
    LIMIT ? OFFSET ?
  `;

  queryParams.push(limit, offset);

  const [rows] = await connection.query(query, queryParams);
  const [[{ total }]] = await connection.query("SELECT FOUND_ROWS() as total");

  return { rows, total };
};

/**
 * Ambil detail satu item picking berdasarkan ID
 */
export const getItemById = async (connection, itemId) => {
  const [rows] = await connection.query(`SELECT * FROM picking_list_items WHERE id = ?`, [itemId]);
  return rows[0] || null;
};

/**
 * Update item picking menjadi COMPLETED_RETURN
 * Digunakan saat item retur divalidasi dan diterima gudang.
 */
export const completeReturnItem = async (connection, itemId, { condition, notes, locationId }) => {
  return connection.query(
    `UPDATE picking_list_items
     SET
       status = 'COMPLETED_RETURN',
       return_condition = ?,
       return_notes = ?,
       confirmed_location_id = ?
     WHERE id = ?`,
    [condition, notes, locationId, itemId]
  );
};

/**
 * Kurangi Qty Item (Untuk Split/Partial Return)
 * Mengurangi jumlah item di baris picking list saat ini (sisa yang tidak diretur/belum diproses).
 */
export const decreaseItemQty = async (connection, itemId, qtyToDeduct) => {
  return connection.query(`UPDATE picking_list_items SET quantity = quantity - ? WHERE id = ?`, [
    qtyToDeduct,
    itemId,
  ]);
};

/**
 * Buat Item Baru untuk Retur (Split)
 * Jika retur hanya sebagian, item lama dikurangi qty-nya, dan item baru dibuat dengan status COMPLETED_RETURN.
 */
export const createSplitReturnItem = async (
  connection,
  originItem,
  { qtyReturn, condition, notes, locationId }
) => {
  const [res] = await connection.query(
    `INSERT INTO picking_list_items
      (picking_list_id, product_id, original_sku, quantity, status, return_condition, return_notes, confirmed_location_id, suggested_location_id, picked_from_location_id)
     VALUES (?, ?, ?, ?, 'COMPLETED_RETURN', ?, ?, ?, ?, ?)`,
    [
      originItem.picking_list_id,
      originItem.product_id,
      originItem.original_sku,
      qtyReturn,
      condition,
      notes,
      locationId,
      originItem.suggested_location_id,
      originItem.picked_from_location_id,
    ]
  );
  return res.insertId;
};

/**
 * Buat Data Retur Manual (Barang Offline/Tanpa Invoice System)
 */
export const createManualReturn = async (
  connection,
  { userId, productId, quantity, condition, reference, notes }
) => {
  return connection.query(
    `INSERT INTO manual_returns
      (user_id, product_id, quantity, \`condition\`, reference, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', NOW())`,
    [userId, productId, quantity, condition, reference, notes]
  );
};
