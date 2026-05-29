// backend/repositories/productRepository.js
// ============================================================================
// READ OPERATIONS (Complex Queries & Aggregations)
// ============================================================================

export const getProductsWithFilters = async (connection, filters) => {
  const {
    limit,
    offset,
    search,
    searchBy,
    location,
    stockStatus,
    packageOnly,
    is_package,
    status,
    building,
    floor,
    sortBy,
    sortOrder,
  } = filters;

  const allowedSortColumns = ["name", "sku", "price", "updated_at", "deleted_at", "weight"];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? `p.${sortBy}` : "p.name";

  // LOGIKA STATUS: Menggunakan is_active DAN deleted_at
  let whereClauses = [];
  let queryParams = [];

  // Filter Status
  if (status === "archived") {
    // Produk arsip = yang is_active 0 ATAU deleted_at terisi
    whereClauses.push("(p.is_active = 0 OR p.deleted_at IS NOT NULL)");
  } else if (status === "all") {
    whereClauses.push("1=1");
  } else {
    // Default: Active only
    whereClauses.push("(p.is_active = 1 AND p.deleted_at IS NULL)");
  }

  // Filter Tipe Package
  if (is_package !== undefined) {
    whereClauses.push(`p.is_package = ?`);
    queryParams.push(is_package ? 1 : 0);
  } else if (packageOnly) {
    whereClauses.push("p.is_package = 1");
  }

  // Filter Kategori
  if (filters.categoryId && filters.categoryId !== "all") {
    whereClauses.push("p.category_id = ?");
    queryParams.push(filters.categoryId);
  }

  // Filter Lokasi (Subquery EXISTS)
  let purpose = "";
  if (location === "gudang") purpose = "WAREHOUSE";
  else if (location === "pajangan") purpose = "DISPLAY";
  else if (location === "ltc") purpose = "BRANCH";

  if (location !== "all") {
    let existsConditions = ["l.purpose = ?"];
    queryParams.push(purpose);

    if (location === "gudang") {
      if (building !== "all") {
        existsConditions.push("l.building = ?");
        queryParams.push(building);
      }
      if (floor !== "all") {
        existsConditions.push("l.floor = ?");
        queryParams.push(floor);
      }
    }

    const existsSql = `EXISTS (
        SELECT 1 FROM stock_locations sl
        JOIN locations l ON sl.location_id = l.id
        WHERE sl.product_id = p.id AND ${existsConditions.join(" AND ")}
      )`;
    whereClauses.push(existsSql);
  }

  // Filter Pencarian
  let keywordClauses = [];
  if (search) {
    const keywords = search.split(" ").filter((k) => k.length > 0);
    if (searchBy === "sku") {
      keywordClauses = keywords.map(() => "(p.sku LIKE ?)");
    } else {
      keywordClauses = keywords.map(() => "(p.name LIKE ?)");
    }
    if (keywordClauses.length > 0) {
      whereClauses.push(`(${keywordClauses.join(" AND ")})`);
      keywords.forEach((keyword) => queryParams.push(`%${keyword}%`));
    }
  }

  // Filter Stock Status (All / Minus / Positive)
  if (stockStatus !== "all") {
    // Note: Logic minus stock direplikasi sesuai versi asli
    const statusConditions = [];
    if (location !== "all") {
      statusConditions.push("l.purpose = ?");
      // Parameter purpose sudah ada di queryParams jika location != all,
      queryParams.push(purpose);
    }

    // Jika ada filter lokasi gudang detail
    if (location === "gudang") {
      if (building !== "all") {
        statusConditions.push("l.building = ?");
        queryParams.push(building);
      }
      if (floor !== "all") {
        statusConditions.push("l.floor = ?");
        queryParams.push(floor);
      }
    }

    const statusWhere =
      statusConditions.length > 0 ? `AND ${statusConditions.join(" AND ")}` : "";

    // Subquery untuk cek total stok
    const operator = stockStatus === "minus" ? "<" : ">=";
    const statusStockSql = `(
        COALESCE((
          SELECT SUM(sl.quantity)
          FROM stock_locations sl
          JOIN locations l ON sl.location_id = l.id
          WHERE sl.product_id = p.id ${statusWhere}
        ), 0) ${operator} 0
      )`;
    whereClauses.push(statusStockSql);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p ${whereSql}`;
  const [totalRows] = await connection.query(countQuery, queryParams);
  const totalProducts = totalRows[0]?.total || 0;
  const productsQuery = `
      SELECT p.id, p.sku, p.name, p.category_id, c.name as category_name, p.price, p.weight, p.is_package, p.is_active, p.deleted_at,
      (SELECT ma.main_path FROM product_images pi JOIN media_assets ma ON pi.media_id = ma.id WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_path,
      (SELECT ma.thumbnail_path FROM product_images pi JOIN media_assets ma ON pi.media_id = ma.id WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as thumbnail_path
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      GROUP BY p.id
      ORDER BY ${safeSortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
  let finalParams = [];
  finalParams = [...queryParams, limit, offset];

  const [products] = await connection.query(productsQuery, finalParams);

  if (products.length === 0) {
    return { data: [], total: totalProducts };
  }
  const productIds = products.map((p) => p.id);
  const stockLocationsQuery = `
      SELECT sl.product_id, l.code as location_code, l.purpose, sl.quantity
      FROM stock_locations sl
      JOIN locations l ON sl.location_id = l.id
      WHERE sl.quantity != 0 AND sl.product_id IN (?)
    `;
  const [stockLocations] = await connection.query(stockLocationsQuery, [productIds]);

  const productsWithStock = products.map((product) => {
    const relevantLocations = stockLocations.filter((sl) => sl.product_id === product.id);
    const total_stock = relevantLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    const all_locations_code = relevantLocations.map((loc) => loc.location_code).join(", ");
    return {
      ...product,
      stock_locations: relevantLocations,
      total_stock: total_stock,
      all_locations_code: all_locations_code,
      components: [],
    };
  });
  const packageIds = products.filter((p) => p.is_package === 1).map((p) => p.id);

  if (packageIds.length > 0) {
    const componentsQuery = `
      SELECT
        pc.package_product_id,
        pc.component_product_id as id,
        pc.quantity_per_package as quantity,
        p.name,
        p.sku,
        p.weight
      FROM package_components pc
      JOIN products p ON pc.component_product_id = p.id
      WHERE pc.package_product_id IN (?)
    `;
    const [componentRows] = await connection.query(componentsQuery, [packageIds]);
    const componentIds = [...new Set(componentRows.map((c) => c.id))];
    let componentStockMap = {}; // Map<ComponentID, TotalStock>

    if (componentIds.length > 0) {
      let stockQuery = `
          SELECT sl.product_id, SUM(sl.quantity) as total_stock
          FROM stock_locations sl
          JOIN locations l ON sl.location_id = l.id
          WHERE sl.product_id IN (?)
      `;
      let stockParams = [componentIds];
      if (location !== "all") {
        stockQuery += " AND l.purpose = ?";
        stockParams.push(purpose);

        if (location === "gudang") {
          if (building !== "all") {
            stockQuery += " AND l.building = ?";
            stockParams.push(building);
          }
          if (floor !== "all") {
            stockQuery += " AND l.floor = ?";
            stockParams.push(floor);
          }
        }
      }

      stockQuery += " GROUP BY sl.product_id";

      const [stockRows] = await connection.query(stockQuery, stockParams);
      stockRows.forEach((row) => {
        componentStockMap[row.product_id] = row.total_stock;
      });
    }

    // Grouping components by package_product_id
    const componentsMap = {};
    componentRows.forEach((row) => {
      if (!componentsMap[row.package_product_id]) {
        componentsMap[row.package_product_id] = [];
      }
      componentsMap[row.package_product_id].push({
        id: row.id,
        name: row.name,
        sku: row.sku,
        quantity: row.quantity,
        weight: row.weight, // calc total weight frontend
        stock_available: componentStockMap[row.id] || 0, // calc virtual stock frontend
      });
    });

    // Assign to products
    productsWithStock.forEach((product) => {
      if (product.is_package && componentsMap[product.id]) {
        product.components = componentsMap[product.id];
      }
    });
  }

  return { data: productsWithStock, total: totalProducts };
};

export const getProductDetailWithStock = async (connection, id) => {
  const [rows] = await connection.query(
    "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?",
    [id]
  );
  if (rows.length === 0) return null;
  const product = rows[0];
  const [images] = await connection.query(
    "SELECT pi.id, ma.main_path as image_path, ma.thumbnail_path, ma.title, pi.is_primary FROM product_images pi JOIN media_assets ma ON pi.media_id = ma.id WHERE pi.product_id = ? ORDER BY pi.is_primary DESC, pi.sort_order ASC",
    [id]
  );
  product.images = images;
  // Fallback for UI if needed (though UI should check images array)
  product.image_path = images.length > 0 ? images[0].image_path : null;

  product.components = [];
  product.stock_locations = [];

  let productIdsToCheck = [product.id];

  // 2. Jika Paket, Ambil Komponen
  if (product.is_package) {
    const [components] = await connection.query(
      `SELECT pc.component_product_id as id, p.sku, p.name, pc.quantity_per_package, pc.quantity_per_package as quantity
        FROM package_components pc
        JOIN products p ON pc.component_product_id = p.id
        WHERE pc.package_product_id = ?`,
      [id]
    );
    product.components = components;
    components.forEach((comp) => productIdsToCheck.push(comp.id));
  }

  if (productIdsToCheck.length > 0) {
    const stockLocationsQuery = `
        SELECT sl.product_id, l.code as location_code, l.purpose, sl.quantity
        FROM stock_locations sl
        JOIN locations l ON sl.location_id = l.id
        WHERE sl.quantity > 0 AND sl.product_id IN (?)`;

    const [stockRows] = await connection.query(stockLocationsQuery, [productIdsToCheck]);
    product.stock_locations = stockRows.filter((stock) => stock.product_id === product.id);
    if (product.components.length > 0) {
      product.components = product.components.map((comp) => {
        return {
          ...comp,
          stock_locations: stockRows.filter((stock) => stock.product_id === comp.id),
        };
      });
    }
  }

  return product;
};

// ============================================================================
// SIMPLE READS & LOOKUPS
// ============================================================================

export const getProductById = async (connection, id) => {
  const [rows] = await connection.query(
    "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const getIdBySku = async (connection, sku) => {
  const [rows] = await connection.query("SELECT id FROM products WHERE sku = ?", [sku]);
  return rows.length > 0 ? rows[0].id : null;
};

export const getProductsBySkus = async (connection, skuList) => {
  if (!skuList || skuList.length === 0) return [];
  const [rows] = await connection.query(
    `SELECT id, sku, is_package, name, price, weight FROM products WHERE sku IN (?)`,
    [skuList]
  );
  return rows;
};

export const getAllActiveProducts = async (connection) => {
  const [rows] = await connection.query(
    "SELECT p.id, p.sku, p.name, p.category_id, c.name as category_name, p.price, p.is_package, p.is_active FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 ORDER BY p.name ASC"
  );
  return rows;
};

export const searchProducts = async (connection, searchTerm, locationId) => {
  let query, queryParams;
  if (locationId && locationId !== "null" && locationId !== "undefined" && locationId !== "") {
    query = `SELECT p.id, p.sku, p.name, p.price, p.weight, sl.quantity AS current_stock
              FROM products p JOIN stock_locations sl ON p.id = sl.product_id
              WHERE sl.location_id = ? AND (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?)
              AND sl.quantity != 0 LIMIT 10`;
    queryParams = [locationId, searchTerm, searchTerm];
  } else {
    query = `SELECT p.id, p.sku, p.name, p.price, p.weight FROM products p
              WHERE (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?) AND p.is_active = 1 LIMIT 10`;
    queryParams = [searchTerm, searchTerm];
  }
  const [results] = await connection.query(query, queryParams);
  return results;
};

export const getProductStockDetails = async (connection, id) => {
  const query = `
    SELECT l.id as location_id, l.code as location_code, l.building, l.floor, l.purpose, COALESCE(sl.quantity, 0) as quantity
    FROM locations l
    LEFT JOIN stock_locations sl ON l.id = sl.location_id AND sl.product_id = ?
    ORDER BY l.code;`;
  const [rows] = await connection.query(query, [id]);
  return rows;
};

export const getProductTotalStock = async (connection, id, filters = {}) => {
  const { buildings } = filters;
  let query = `SELECT SUM(sl.quantity) as total_stock FROM stock_locations sl`;
  const params = [];

  if (buildings && buildings.length > 0) {
    query += ` JOIN locations l ON sl.location_id = l.id`;
  }

  query += ` WHERE sl.product_id = ?`;
  params.push(id);

  if (buildings && buildings.length > 0) {
    query += ` AND l.building IN (?)`;
    params.push(buildings);
  }

  const [rows] = await connection.query(query, params);
  return rows[0]?.total_stock ? parseInt(rows[0].total_stock, 10) : 0;
};

export const getProductStockMovementsAll = async (connection, id, filters = {}) => {
  const { buildings } = filters;
  let query = `
    SELECT
      sm.id,
      sm.quantity,
      sm.from_location_id,
      sm.to_location_id,
      sm.movement_type,
      sm.notes,
      sm.created_at,
      u.username as user_name,
      l_from.building as from_building,
      l_to.building as to_building
    FROM stock_movements sm
    LEFT JOIN users u ON sm.user_id = u.id
    LEFT JOIN locations l_from ON sm.from_location_id = l_from.id
    LEFT JOIN locations l_to ON sm.to_location_id = l_to.id
    WHERE sm.product_id = ?
  `;
  const params = [id];

  if (buildings && buildings.length > 0) {
    query += ` AND (l_from.building IN (?) OR l_to.building IN (?))`;
    params.push(buildings, buildings);
  }

  query += ` ORDER BY sm.created_at DESC`;
  const [rows] = await connection.query(query, params);
  return rows;
};

export const getBulkPackageComponents = async (connection, packageProductIds) => {
  if (packageProductIds.length === 0) return [];
  const [rows] = await connection.query(
    `SELECT
      pc.package_product_id,
      pc.component_product_id,
      pc.quantity_per_package,
      p.sku as component_sku,
      p.name as component_name
      FROM package_components pc
      JOIN products p ON pc.component_product_id = p.id
      WHERE pc.package_product_id IN (?)`,
    [packageProductIds]
  );
  return rows;
};

export const getProductMapWithComponents = async (connection, skuArray) => {
  const productMap = new Map();
  if (!skuArray || skuArray.length === 0) return productMap;
  const products = await getProductsBySkus(connection, skuArray);
  const packageIds = [];
  products.forEach((p) => {
    productMap.set(p.sku, {
      id: p.id,
      name: p.name,
      sku: p.sku,
      is_package: p.is_package === 1,
      components: [],
    });
    if (p.is_package === 1) packageIds.push(p.id);
  });
  if (packageIds.length > 0) {
    const components = await getBulkPackageComponents(connection, packageIds);
    components.forEach((c) => {
      for (const [sku, data] of productMap.entries()) {
        if (data.id === c.package_product_id) {
          data.components.push({
            id: c.component_product_id,
            sku: c.component_sku,
            name: c.component_name,
            qty_ratio: c.quantity_per_package,
            quantity_per_package: c.quantity_per_package,
          });
          break;
        }
      }
    });
  }
  return productMap;
};

export const getProductHistory = async (connection, productId) => {
  const [rows] = await connection.query(
    `SELECT
      pal.id,
      pal.action,
      pal.field,
      pal.old_value,
      pal.new_value,
      pal.created_at,
      u.username as user_name,
      u.nickname
    FROM product_audit_logs pal
    LEFT JOIN users u ON pal.user_id = u.id
    WHERE pal.product_id = ?
    ORDER BY pal.created_at DESC`,
    [productId]
  );
  return rows;
};

export const getAllPackagesWithComponents = async (connection) => {
  const query = `
    SELECT
      p.id,
      p.sku as package_sku,
      p.name as package_name,
      p.price as package_price,
      c.sku as component_sku,
      pc.quantity_per_package as component_qty
    FROM products p
    LEFT JOIN package_components pc ON p.id = pc.package_product_id
    LEFT JOIN products c ON pc.component_product_id = c.id
    WHERE p.is_package = 1 AND p.is_active = 1 AND p.deleted_at IS NULL
    ORDER BY p.sku ASC, c.sku ASC
  `;
  const [rows] = await connection.query(query);
  return rows;
};

// ============================================================================
// WRITE OPERATIONS (ATOMIC SQL ONLY)
// ============================================================================

export const createProduct = async (connection, { sku, name, category_id, price, weight, is_package }) => {
  const [result] = await connection.query(
    "INSERT INTO products (sku, name, category_id, price, weight, is_package, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [sku, name, category_id || null, parseFloat(price || 0), parseFloat(weight || 0), is_package ? 1 : 0]
  );
  return result.insertId;
};

export const updateProduct = async (connection, id, { name, category_id, price, weight, is_package }) => {
  let sql = "UPDATE products SET name = ?, category_id = ?, price = ?, weight = ?, is_package = ?";
  const params = [name, category_id || null, parseFloat(price || 0), parseFloat(weight || 0), is_package ? 1 : 0];

  sql += " WHERE id = ?";
  params.push(id);

  await connection.query(sql, params);
};

// Menangani Soft Delete & Restore
export const updateProductStatus = async (connection, id, isActive) => {
  const deletedAt = isActive ? null : new Date(); // null for restore, Date for delete
  await connection.query("UPDATE products SET is_active = ?, deleted_at = ? WHERE id = ?", [
    isActive ? 1 : 0,
    deletedAt,
    id,
  ]);
};

export const insertComponents = async (connection, packageId, components) => {
  if (!components || components.length === 0) return;

  const values = components.map((c) => [packageId, c.id, c.quantity]);
  await connection.query(
    "INSERT INTO package_components (package_product_id, component_product_id, quantity_per_package) VALUES ?",
    [values]
  );
};

export const deleteComponents = async (connection, packageId) => {
  await connection.query("DELETE FROM package_components WHERE package_product_id = ?", [
    packageId,
  ]);
};

export const insertAuditLog = async (
  connection,
  { productId, userId, action, field, oldVal, newVal }
) => {
  const changes = {
    [field]: { old: String(oldVal || ""), new: String(newVal || "") }
  };

  await connection.query(
    `INSERT INTO system_audit_logs (user_id, action, target_type, target_id, changes, created_at)
      VALUES (?, ?, 'PRODUCT', ?, ?, NOW())`,
    [userId, action, productId, JSON.stringify(changes)]
  );
};

export const updateProductTransaction = async (
  connection,
  id,
  updates,
  components = [],
  userId
) => {
  const [oldRows] = await connection.query("SELECT * FROM products WHERE id = ?", [id]);
  const oldData = oldRows[0];

  if (!oldData) return;

  const fields = [];
  const values = [];
  const auditPromises = [];

  // Helper untuk Check Perubahan & Collect Data Update
  const processField = (fieldName, newValue, type = "string") => {
    let isChanged = false;
    const oldValue = oldData[fieldName];

    if (type === "number") {
      // Bandingkan Number secara presisi (handle string/decimal dari DB)
      const numNew = parseFloat(newValue || 0);
      const numOld = parseFloat(oldValue || 0);
      // Gunakan epsilon untuk float comparison jika perlu, atau simple inequality
      if (numNew !== numOld) isChanged = true;
    } else if (type === "boolean") {
      const boolNew = !!newValue;
      const boolOld = !!oldValue;
      if (boolNew !== boolOld) isChanged = true;
    } else {
      // String Comparison
      if (String(newValue).trim() !== String(oldValue).trim()) isChanged = true;
    }

    if (isChanged) {
      if (type === 'boolean') {
        fields.push(`${fieldName} = ?`);
        values.push(newValue ? 1 : 0);
      } else {
        fields.push(`${fieldName} = ?`);
        values.push(newValue);
      }
      auditPromises.push(
        insertAuditLog(connection, {
          productId: id,
          userId,
          action: "UPDATE",
          field: fieldName,
          oldVal: oldValue,
          newVal: newValue,
        })
      );
    }
  };

  // Cek setiap field
  if (updates.name !== undefined) processField("name", updates.name, "string");
  if (updates.category_id !== undefined) processField("category_id", updates.category_id, "number");
  if (updates.price !== undefined) processField("price", updates.price, "number");
  if (updates.weight !== undefined) processField("weight", updates.weight, "number");
  if (updates.price !== undefined) processField("price", updates.price, "number");
  if (updates.weight !== undefined) processField("weight", updates.weight, "number");
  if (updates.is_package !== undefined) processField("is_package", updates.is_package, "boolean");

  // Jika ada perubahan, jalankan UPDATE
  if (fields.length > 0) {
    values.push(id);
    await connection.query(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  // Jalankan Audit Logs
  if (auditPromises.length > 0) {
    await Promise.all(auditPromises);
  }
};

// ============================================================================
// IMAGE MANAGEMENT
// ============================================================================
export const deleteImage = async (connection, imageId) => {
  await connection.query("DELETE FROM product_images WHERE id = ?", [imageId]);
};

export const linkMedia = async (connection, productId, mediaIds) => {
  if (!mediaIds || mediaIds.length === 0) return;

  // Cek apakah sudah punya primary image
  const [existingPrimary] = await connection.query(
    "SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1 LIMIT 1",
    [productId]
  );
  let hasPrimary = existingPrimary.length > 0;

  const values = mediaIds.map(mediaId => {
    let isPrimary = 0;
    if (!hasPrimary) {
      isPrimary = 1;
      hasPrimary = true;
    }
    return [productId, mediaId, isPrimary];
  });
  
  await connection.query("INSERT INTO product_images (product_id, media_id, is_primary) VALUES ?", [values]);
};

export const resetPrimaryImage = async (connection, productId) => {
  await connection.query("UPDATE product_images SET is_primary = 0 WHERE product_id = ?", [
    productId,
  ]);
};

export const setPrimaryImage = async (connection, imageId) => {
  await connection.query("UPDATE product_images SET is_primary = 1 WHERE id = ?", [imageId]);
};

export const getImageById = async (connection, imageId) => {
  const [rows] = await connection.query("SELECT pi.*, ma.main_path as image_path FROM product_images pi JOIN media_assets ma ON pi.media_id = ma.id WHERE pi.id = ?", [imageId]);
  return rows.length > 0 ? rows[0] : null;
};
