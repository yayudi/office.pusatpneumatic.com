// backend/repositories/statisticRepository.js

/**
 * @param {Object} connection
 * @param {string} startDate
 * @param {string} endDate
 */
export const getStockMovementStats = async (connection, filters) => {
  const { startDate, endDate, searchQuery, buildings } = filters;
  
  let queryParams = [];
  
  // Stock Locations Subquery
  let locSubquery = `
    SELECT product_id, SUM(quantity) as current_stock
    FROM stock_locations
  `;
  
  if (buildings && Array.isArray(buildings) && buildings.length > 0) {
    locSubquery = `
      SELECT sl.product_id, SUM(sl.quantity) as current_stock
      FROM stock_locations sl
      JOIN locations l ON sl.location_id = l.id
      WHERE l.building IN (?)
      GROUP BY sl.product_id
    `;
    queryParams.push(buildings);
  } else {
    locSubquery += ` GROUP BY product_id`;
  }

  // Main Query
  let query = `
    SELECT 
      p.id as product_id,
      p.sku,
      p.name,
      p.is_active,
      IFNULL(s_loc.current_stock, 0) AS current_stock,
      IFNULL(s_mov.total_sold, 0) AS total_sold,
      IFNULL(s_mov.total_inbound, 0) AS total_inbound
    FROM products p
    LEFT JOIN (
      ${locSubquery}
    ) s_loc ON p.id = s_loc.product_id
    LEFT JOIN (
      SELECT 
        product_id,
        SUM(CASE WHEN movement_type IN ('SALE', 'OUT') THEN quantity ELSE 0 END) AS total_sold,
        SUM(CASE WHEN movement_type = 'INBOUND' THEN quantity ELSE 0 END) AS total_inbound
      FROM stock_movements
      WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
      GROUP BY product_id
    ) s_mov ON p.id = s_mov.product_id
    WHERE p.is_package = 0
  `;

  queryParams.push(startDate, endDate);

  // Search Filter
  if (searchQuery) {
    query += ` AND (p.sku LIKE ? OR p.name LIKE ?)`;
    const likeTerm = `%${searchQuery}%`;
    queryParams.push(likeTerm, likeTerm);
  }

  query += ` ORDER BY total_sold DESC`;

  const [rows] = await connection.query(query, queryParams);
  return rows;
};

/**
 * @param {Object} connection
 * @param {Object} filters
 */
export const getInventoryValueStats = async (connection, filters) => {
  const { searchQuery, building, purpose, isPackage, stockStatus } = filters;
  
  let whereClauses = ["p.is_active = 1"];
  const queryParams = [];

  // Logic Filter
  if (stockStatus) {
    if (stockStatus === "positive") {
      whereClauses.push("COALESCE(sl.quantity, 0) > 0");
    } else if (stockStatus === "negative") {
      whereClauses.push("COALESCE(sl.quantity, 0) < 0");
    } else if (stockStatus === "zero") {
      whereClauses.push("COALESCE(sl.quantity, 0) = 0");
    }
  }

  if (building && building !== "all" && building.length > 0) {
    whereClauses.push("l.building IN (?)");
    queryParams.push(building);
  }

  if (searchQuery) {
    whereClauses.push("(p.sku LIKE ? OR p.name LIKE ?)");
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  if (purpose) {
    whereClauses.push("l.purpose = ?");
    queryParams.push(purpose);
  }

  if (isPackage !== null && isPackage !== undefined && isPackage !== "") {
    whereClauses.push("p.is_package = ?");
    queryParams.push(isPackage);
  }

  const query = `
    SELECT 
      p.id as product_id,
      p.sku,
      p.name,
      p.category,
      p.price,
      SUM(COALESCE(sl.quantity, 0)) AS total_quantity,
      (SUM(COALESCE(sl.quantity, 0)) * p.price) AS total_value
    FROM products p
    LEFT JOIN stock_locations sl ON p.id = sl.product_id
    LEFT JOIN locations l ON sl.location_id = l.id
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY p.id, p.sku, p.name, p.category, p.price
    ORDER BY total_value DESC
  `;

  const [rows] = await connection.query(query, queryParams);
  return rows;
};

/**
 * @param {Object} connection
 * @param {Object} filters
 */
export const getMovementTimelineStats = async (connection, filters) => {
  const { startDate, endDate, searchQuery, buildings, timeResolution } = filters;
  
  const queryParams = [startDate, endDate];
  
  let buildingJoin = "";
  let buildingFilter = "";
  
  if (buildings && Array.isArray(buildings) && buildings.length > 0) {
    buildingJoin = "JOIN locations l ON sm.location_id = l.id";
    buildingFilter = "AND l.building IN (?)";
    queryParams.push(buildings);
  }
  
  let searchJoin = "";
  let searchFilter = "";
  if (searchQuery) {
    searchJoin = "JOIN products p ON sm.product_id = p.id";
    searchFilter = "AND (p.sku LIKE ? OR p.name LIKE ?)";
    const likeTerm = `%${searchQuery}%`;
    queryParams.push(likeTerm, likeTerm);
  }

  let dateSelect = "DATE(sm.created_at)";
  if (timeResolution === 'monthly') {
    dateSelect = "DATE_FORMAT(sm.created_at, '%Y-%m')";
  } else if (timeResolution === 'annual') {
    dateSelect = "DATE_FORMAT(sm.created_at, '%Y')";
  }

  const query = `
    SELECT 
      ${dateSelect} as date,
      SUM(CASE WHEN sm.movement_type IN ('SALE', 'OUT') THEN sm.quantity ELSE 0 END) AS total_out,
      SUM(CASE WHEN sm.movement_type = 'INBOUND' THEN sm.quantity ELSE 0 END) AS total_in
    FROM stock_movements sm
    ${buildingJoin}
    ${searchJoin}
    WHERE DATE(sm.created_at) >= ? AND DATE(sm.created_at) <= ?
    ${buildingFilter}
    ${searchFilter}
    GROUP BY ${dateSelect}
    ORDER BY date ASC
  `;

  const [rows] = await connection.query(query, queryParams);
  return rows;
};
