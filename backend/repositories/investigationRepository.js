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
  { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location, exactQuantity },
  limit = 10,
  offset = 0
) => {
  const params = [];
  const conditions = ["sm.notes IS NOT NULL", "sm.notes != ''"];

  if (startDate && endDate) {
    conditions.push("DATE(sm.created_at) BETWEEN ? AND ?");
    params.push(startDate, endDate);
  } else if (startDate) {
    conditions.push("DATE(sm.created_at) >= ?");
    params.push(startDate);
  }

  if (movementType) {
    conditions.push("sm.movement_type = ?");
    params.push(movementType);
  }

  if (includeNotes) {
    conditions.push("sm.notes REGEXP ?");
    params.push(includeNotes);
  }

  if (excludeNotes) {
    conditions.push("sm.notes NOT REGEXP ?");
    params.push(excludeNotes);
  }

  if (productName) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ?)");
    params.push(`%${productName}%`, `%${productName}%`);
  }

  if (username) {
    conditions.push("u.username LIKE ?");
    params.push(`%${username}%`);
  }

  if (location) {
    conditions.push("(fl.code LIKE ? OR tl.code LIKE ?)");
    params.push(`%${location}%`, `%${location}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    WITH filtered_movements AS (
      SELECT 
        sm.id, sm.product_id, sm.quantity, sm.from_location_id, sm.to_location_id, sm.movement_type, sm.user_id, sm.notes, sm.created_at,
        p.name as product_name, p.sku, 
        u.username, 
        fl.code as from_location_code, 
        tl.code as to_location_code
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN locations fl ON sm.from_location_id = fl.id
      LEFT JOIN locations tl ON sm.to_location_id = tl.id
      ${whereClause}
    ),
    duplicate_groups AS (
      SELECT 
        SUBSTRING_INDEX(notes, ' (Item', 1) as base_note, 
        product_id, 
        movement_type
        ${exactQuantity ? ', quantity' : ''}
      FROM filtered_movements
      GROUP BY base_note, product_id, movement_type ${exactQuantity ? ', quantity' : ''}
      HAVING COUNT(*) > 1
      ORDER BY base_note ASC, MAX(created_at) DESC
      LIMIT ? OFFSET ?
    )
    SELECT 
      fm.id,
      fm.product_id,
      fm.quantity,
      fm.from_location_id,
      fm.from_location_code,
      fm.to_location_id,
      fm.to_location_code,
      fm.movement_type,
      fm.user_id,
      fm.username,
      fm.notes,
      fm.created_at,
      fm.sku,
      fm.product_name
    FROM filtered_movements fm
    JOIN duplicate_groups dg 
      ON SUBSTRING_INDEX(fm.notes, ' (Item', 1) = dg.base_note 
      AND fm.product_id = dg.product_id 
      AND fm.movement_type = dg.movement_type
      ${exactQuantity ? 'AND fm.quantity = dg.quantity' : ''}
    ORDER BY SUBSTRING_INDEX(fm.notes, ' (Item', 1) ASC, fm.created_at DESC
  `;

  // Final params include standard params then limit/offset for the duplicate_groups CTE
  const finalParams = [...params, Number(limit), Number(offset)];

  const [rows] = await connection.query(query, finalParams);
  return rows;
};

/**
 * Menghitung total grup transaksi ganda untuk keperluan pagination.
 */
export const countDuplicateGroups = async (
  connection,
  { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location, exactQuantity }
) => {
  const params = [];
  const conditions = ["sm.notes IS NOT NULL", "sm.notes != ''"];

  if (startDate && endDate) {
    conditions.push("DATE(sm.created_at) BETWEEN ? AND ?");
    params.push(startDate, endDate);
  } else if (startDate) {
    conditions.push("DATE(sm.created_at) >= ?");
    params.push(startDate);
  }

  if (movementType) {
    conditions.push("sm.movement_type = ?");
    params.push(movementType);
  }

  if (includeNotes) {
    conditions.push("sm.notes REGEXP ?");
    params.push(includeNotes);
  }

  if (excludeNotes) {
    conditions.push("sm.notes NOT REGEXP ?");
    params.push(excludeNotes);
  }

  if (productName) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ?)");
    params.push(`%${productName}%`, `%${productName}%`);
  }

  if (username) {
    conditions.push("u.username LIKE ?");
    params.push(`%${username}%`);
  }

  if (location) {
    conditions.push("(fl.code LIKE ? OR tl.code LIKE ?)");
    params.push(`%${location}%`, `%${location}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    WITH filtered_movements AS (
      SELECT 
        sm.id, sm.product_id, sm.quantity, sm.movement_type, sm.notes
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN locations fl ON sm.from_location_id = fl.id
      LEFT JOIN locations tl ON sm.to_location_id = tl.id
      ${whereClause}
    ),
    duplicate_groups AS (
      SELECT 1
      FROM filtered_movements
      GROUP BY SUBSTRING_INDEX(notes, ' (Item', 1), product_id, movement_type ${exactQuantity ? ', quantity' : ''}
      HAVING COUNT(*) > 1
    )
    SELECT COUNT(*) as total FROM duplicate_groups
  `;

  const [rows] = await connection.query(query, params);
  return rows[0].total;
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
