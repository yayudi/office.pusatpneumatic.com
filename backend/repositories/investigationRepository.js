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
export const getDuplicateGroups = async (
  connection,
  { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location, exactQuantity, revertStatus, minOccurrences, maxOccurrences, minSku, maxSku, maxTimeGap, sortBy = 'latest_created_at', sortDirection = 'DESC' },
  limit = 20,
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
    if (movementType.include && movementType.include.length > 0) {
      conditions.push(`sm.movement_type IN (${movementType.include.map(() => '?').join(',')})`);
      params.push(...movementType.include);
    }
    if (movementType.exclude && movementType.exclude.length > 0) {
      conditions.push(`sm.movement_type NOT IN (${movementType.exclude.map(() => '?').join(',')})`);
      params.push(...movementType.exclude);
    }
    if (typeof movementType === 'string') {
      conditions.push("sm.movement_type = ?");
      params.push(movementType);
    }
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

  const havingConditions = [];
  const havingParams = [];
  
  if (minOccurrences) {
    havingConditions.push("occurrences >= ?");
    havingParams.push(minOccurrences);
  }
  if (maxOccurrences) {
    havingConditions.push("occurrences <= ?");
    havingParams.push(maxOccurrences);
  }
  if (minSku) {
    havingConditions.push("total_sku >= ?");
    havingParams.push(minSku);
  }
  if (maxSku) {
    havingConditions.push("total_sku <= ?");
    havingParams.push(maxSku);
  }
  if (maxTimeGap) {
    havingConditions.push("TIMESTAMPDIFF(MINUTE, MIN(fm.created_at), MAX(fm.created_at)) <= ?");
    havingParams.push(maxTimeGap);
  }

  const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";
  
  let orderCol = "latest_created_at";
  if (sortBy === 'OCCURRENCES') orderCol = "occurrences";
  else if (sortBy === 'TOTAL_SKU') orderCol = "total_sku";
  else if (sortBy === 'TOTAL_QTY') orderCol = "total_qty";
  
  const sortDir = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const orderByClause = `ORDER BY ${orderCol} ${sortDir}, base_note ASC`;

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
    duplicate_products AS (
      SELECT 
        SUBSTRING_INDEX(notes, ' (Item', 1) as base_note, 
        product_id, 
        movement_type
        ${exactQuantity ? ', quantity' : ''}
      FROM filtered_movements
      GROUP BY base_note, product_id, movement_type ${exactQuantity ? ', quantity' : ''}
      HAVING COUNT(*) > 1
      ${revertStatus === 'REVERTED' ? "AND SUM(CASE WHEN notes LIKE '%[REVERTED]%' THEN 1 ELSE 0 END) > 0" : ""}
      ${revertStatus === 'NOT_REVERTED' ? "AND SUM(CASE WHEN notes LIKE '%[REVERTED]%' THEN 1 ELSE 0 END) = 0" : ""}
    ),
    duplicate_groups AS (
      SELECT 
        dp.base_note,
        dp.movement_type,
        COUNT(DISTINCT fm.product_id) as total_sku,
        COUNT(DISTINCT fm.created_at) as occurrences,
        SUM(fm.quantity) as total_qty,
        MAX(fm.created_at) as latest_created_at
      FROM duplicate_products dp
      JOIN filtered_movements fm 
        ON dp.base_note = SUBSTRING_INDEX(fm.notes, ' (Item', 1)
        AND dp.product_id = fm.product_id
        AND dp.movement_type = fm.movement_type
        ${exactQuantity ? 'AND dp.quantity = fm.quantity' : ''}
      GROUP BY dp.base_note, dp.movement_type
      ${havingClause}
      ${orderByClause}
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
    JOIN duplicate_products dp 
      ON SUBSTRING_INDEX(fm.notes, ' (Item', 1) = dp.base_note 
      AND fm.product_id = dp.product_id 
      AND fm.movement_type = dp.movement_type
      ${exactQuantity ? 'AND fm.quantity = dp.quantity' : ''}
    JOIN duplicate_groups dg 
      ON dp.base_note = dg.base_note 
      AND dp.movement_type = dg.movement_type
    ORDER BY dg.${orderCol} ${sortDir}, SUBSTRING_INDEX(fm.notes, ' (Item', 1) ASC, fm.created_at DESC
  `;

  // Final params include standard params then having params, then limit/offset
  const finalParams = [...params, ...havingParams, Number(limit), Number(offset)];

  const [rows] = await connection.query(query, finalParams);
  return rows;
};

/**
 * Menghitung total grup transaksi ganda untuk keperluan pagination.
 */
export const countDuplicateGroups = async (
  connection,
  { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location, exactQuantity, revertStatus, minOccurrences, maxOccurrences, minSku, maxSku, maxTimeGap }
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
    if (movementType.include && movementType.include.length > 0) {
      conditions.push(`sm.movement_type IN (${movementType.include.map(() => '?').join(',')})`);
      params.push(...movementType.include);
    }
    if (movementType.exclude && movementType.exclude.length > 0) {
      conditions.push(`sm.movement_type NOT IN (${movementType.exclude.map(() => '?').join(',')})`);
      params.push(...movementType.exclude);
    }
    if (typeof movementType === 'string') {
      conditions.push("sm.movement_type = ?");
      params.push(movementType);
    }
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

  const havingConditions = [];
  const havingParams = [];
  
  if (minOccurrences) {
    havingConditions.push("occurrences >= ?");
    havingParams.push(minOccurrences);
  }
  if (maxOccurrences) {
    havingConditions.push("occurrences <= ?");
    havingParams.push(maxOccurrences);
  }
  if (minSku) {
    havingConditions.push("total_sku >= ?");
    havingParams.push(minSku);
  }
  if (maxSku) {
    havingConditions.push("total_sku <= ?");
    havingParams.push(maxSku);
  }
  if (maxTimeGap) {
    havingConditions.push("TIMESTAMPDIFF(MINUTE, MIN(fm.created_at), MAX(fm.created_at)) <= ?");
    havingParams.push(maxTimeGap);
  }

  const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

  const query = `
    WITH filtered_movements AS (
      SELECT 
        sm.id, sm.product_id, sm.quantity, sm.movement_type, sm.notes, sm.created_at
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN locations fl ON sm.from_location_id = fl.id
      LEFT JOIN locations tl ON sm.to_location_id = tl.id
      ${whereClause}
    ),
    duplicate_products AS (
      SELECT 
        SUBSTRING_INDEX(notes, ' (Item', 1) as base_note, 
        product_id, 
        movement_type
        ${exactQuantity ? ', quantity' : ''}
      FROM filtered_movements
      GROUP BY base_note, product_id, movement_type ${exactQuantity ? ', quantity' : ''}
      HAVING COUNT(*) > 1
      ${revertStatus === 'REVERTED' ? "AND SUM(CASE WHEN notes LIKE '%[REVERTED]%' THEN 1 ELSE 0 END) > 0" : ""}
      ${revertStatus === 'NOT_REVERTED' ? "AND SUM(CASE WHEN notes LIKE '%[REVERTED]%' THEN 1 ELSE 0 END) = 0" : ""}
    ),
    duplicate_groups AS (
      SELECT 
        COUNT(DISTINCT fm.product_id) as total_sku,
        COUNT(DISTINCT fm.created_at) as occurrences
      FROM duplicate_products dp
      JOIN filtered_movements fm 
        ON dp.base_note = SUBSTRING_INDEX(fm.notes, ' (Item', 1)
        AND dp.product_id = fm.product_id
        AND dp.movement_type = fm.movement_type
        ${exactQuantity ? 'AND dp.quantity = fm.quantity' : ''}
      GROUP BY dp.base_note, dp.movement_type
      ${havingClause}
    )
    SELECT COUNT(*) as total FROM duplicate_groups
  `;

  const finalParams = [...params, ...havingParams];

  const [rows] = await connection.query(query, finalParams);
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
