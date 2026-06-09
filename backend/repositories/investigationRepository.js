/**
 * @file backend/repositories/investigationRepository.js
 * @description Repository for stock movement investigations (duplicate detection).
 */

/**
 * Mendapatkan data transaksi ganda (duplikat) berdasarkan kesamaan 'notes' dan 'product_id'.
 * 
 * @param {Object} connection - Database connection
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.startDate] - Start date (YYYY-MM-DD)
 * @param {string} [filters.endDate] - End date (YYYY-MM-DD)
 * @param {string} [filters.includeNotes] - REGEXP pattern to include in notes
 * @param {string} [filters.excludeNotes] - REGEXP pattern to exclude in notes
 * @param {string} [filters.movementType] - Type of movement (e.g., 'SALE')
 * @returns {Promise<Array>} List of stock movements indicating duplicates
 */
export const findDuplicateTransactions = async (
  connection,
  { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location }
) => {
  const cteParams = [];
  const cteConditions = ["sm.notes IS NOT NULL", "sm.notes != ''"];

  if (startDate && endDate) {
    cteConditions.push("DATE(sm.created_at) BETWEEN ? AND ?");
    cteParams.push(startDate, endDate);
  } else if (startDate) {
    cteConditions.push("DATE(sm.created_at) >= ?");
    cteParams.push(startDate);
  }

  if (movementType) {
    cteConditions.push("sm.movement_type = ?");
    cteParams.push(movementType);
  }

  if (includeNotes) {
    cteConditions.push("sm.notes REGEXP ?");
    cteParams.push(includeNotes);
  }

  if (excludeNotes) {
    cteConditions.push("sm.notes NOT REGEXP ?");
    cteParams.push(excludeNotes);
  }

  const cteWhereClause = cteConditions.length > 0 ? `WHERE ${cteConditions.join(" AND ")}` : "";

  // Main query conditions
  const mainParams = [...cteParams];
  const mainConditions = [];

  if (productName) {
    mainConditions.push("(p.name LIKE ? OR p.sku LIKE ?)");
    mainParams.push(`%${productName}%`, `%${productName}%`);
  }

  if (username) {
    mainConditions.push("u.username LIKE ?");
    mainParams.push(`%${username}%`);
  }

  if (location) {
    mainConditions.push("(fl.code LIKE ? OR tl.code LIKE ?)");
    mainParams.push(`%${location}%`, `%${location}%`);
  }

  const mainWhereAddendum = mainConditions.length > 0 ? `AND ${mainConditions.join(" AND ")}` : "";

  const query = `
    WITH duplicate_groups AS (
      SELECT notes, product_id, movement_type
      FROM stock_movements sm
      ${cteWhereClause}
      GROUP BY notes, product_id, movement_type
      HAVING COUNT(*) > 1
    )
    SELECT 
      sm.id,
      sm.product_id,
      sm.quantity,
      sm.from_location_id,
      fl.code as from_location_code,
      sm.to_location_id,
      tl.code as to_location_code,
      sm.movement_type,
      sm.user_id,
      u.username,
      sm.notes,
      sm.created_at,
      p.sku,
      p.name as product_name
    FROM stock_movements sm
    JOIN duplicate_groups dg 
      ON sm.notes = dg.notes 
      AND sm.product_id = dg.product_id 
      AND sm.movement_type = dg.movement_type
    LEFT JOIN products p ON sm.product_id = p.id
    LEFT JOIN users u ON sm.user_id = u.id
    LEFT JOIN locations fl ON sm.from_location_id = fl.id
    LEFT JOIN locations tl ON sm.to_location_id = tl.id
    ${cteWhereClause}
    ${mainWhereAddendum}
    ORDER BY sm.notes ASC, sm.created_at DESC
  `;

  const finalParams = [...cteParams, ...mainParams];

  const [rows] = await connection.query(query, finalParams);
  return rows;
};

/**
 * Mendapatkan detail picking lists beserta items-nya berdasarkan daftar invoice ID.
 * 
 * @param {Object} connection - Database connection
 * @param {string[]} invoiceIds - Array of original_invoice_id
 * @returns {Promise<Array>}
 */
export const findPickingListDetailsByInvoices = async (connection, invoiceIds) => {
  if (!invoiceIds || invoiceIds.length === 0) return [];
  
  const placeholders = invoiceIds.map(() => '?').join(',');
  const query = `
    SELECT 
      pl.id as picking_list_id,
      pl.original_invoice_id,
      pl.customer_name,
      pl.source,
      pl.order_date,
      pl.status as list_status,
      pl.marketplace_status,
      pl.shop_name,
      pli.id as item_id,
      pli.product_id,
      pli.original_sku,
      pli.quantity,
      pli.price,
      pli.status as item_status,
      p.name as product_name
    FROM picking_lists pl
    JOIN picking_list_items pli ON pl.id = pli.picking_list_id
    LEFT JOIN products p ON pli.product_id = p.id
    WHERE pl.original_invoice_id IN (${placeholders})
  `;
  
  const [rows] = await connection.query(query, invoiceIds);
  return rows;
};

/**
 * Mendapatkan detail picking lists beserta items-nya berdasarkan daftar item ID.
 * 
 * @param {Object} connection - Database connection
 * @param {number[]} itemIds - Array of picking_list_items.id
 * @returns {Promise<Array>}
 */
export const findPickingListDetailsByItemIds = async (connection, itemIds) => {
  if (!itemIds || itemIds.length === 0) return [];
  
  const placeholders = itemIds.map(() => '?').join(',');
  const query = `
    SELECT 
      pl.id as picking_list_id,
      pl.original_invoice_id,
      pl.customer_name,
      pl.source,
      pl.order_date,
      pl.status as list_status,
      pl.marketplace_status,
      pl.shop_name,
      pli.id as item_id,
      pli.product_id,
      pli.original_sku,
      pli.quantity,
      pli.price,
      pli.status as item_status,
      p.name as product_name
    FROM picking_lists pl
    JOIN picking_list_items pli ON pl.id = pli.picking_list_id
    LEFT JOIN products p ON pli.product_id = p.id
    WHERE pl.id IN (
      SELECT picking_list_id FROM picking_list_items WHERE id IN (${placeholders})
    )
  `;
  
  const [rows] = await connection.query(query, itemIds);
  return rows;
};
