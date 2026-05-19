import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (..)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function debugVirtualStock() {
  const connection = await createConnection(dbConfig);
  const targetSku = 'PP0000503'; // US 25 AC 220

  try {
    Logger.info(`--- Debugging Virtual Stock for SKU: ${targetSku} ---`, "DEBUG_VIRTUAL_STOCK");

    // 1. Get Product ID
    const [products] = await connection.query('SELECT id, name, is_package FROM products WHERE sku = ?', [targetSku]);
    if (products.length === 0) {
      Logger.warn('Product not found.', "DEBUG_VIRTUAL_STOCK");
      return;
    }
    const product = products[0];
    Logger.info(`Product: ${JSON.stringify(product)}`, "DEBUG_VIRTUAL_STOCK");

    if (!product.is_package) {
      Logger.warn('Not a package.', "DEBUG_VIRTUAL_STOCK");
      return;
    }

    // 2. Get Components
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
            WHERE pc.package_product_id = ?
        `;
    const [componentRows] = await connection.query(componentsQuery, [product.id]);
    Logger.info(`Components Found: ${componentRows.length}`, "DEBUG_VIRTUAL_STOCK");
    Logger.info(JSON.stringify(componentRows), "DEBUG_VIRTUAL_STOCK");

    // 3. Get Stock for Components
    const componentIds = [...new Set(componentRows.map(c => c.id))];
    Logger.info(`Component IDs: ${JSON.stringify(componentIds)}`, "DEBUG_VIRTUAL_STOCK");

    if (componentIds.length === 0) {
      Logger.warn('No components IDs found.', "DEBUG_VIRTUAL_STOCK");
      return;
    }

    const stockQuery = `
            SELECT sl.product_id, SUM(sl.quantity) as total_stock
            FROM stock_locations sl
            JOIN locations l ON sl.location_id = l.id
            WHERE sl.product_id IN (?)
            GROUP BY sl.product_id
        `;

    Logger.info('Executing Stock Query...', "DEBUG_VIRTUAL_STOCK");
    const [stockRows] = await connection.query(stockQuery, [componentIds]);
    Logger.info(`Stock Rows Result: ${JSON.stringify(stockRows)}`, "DEBUG_VIRTUAL_STOCK");

    // 4. Mimic Repository Map Logic
    let componentStockMap = {};
    stockRows.forEach(row => {
      componentStockMap[row.product_id] = row.total_stock;
    });
    Logger.info(`Stock Map: ${JSON.stringify(componentStockMap)}`, "DEBUG_VIRTUAL_STOCK");

    // 5. Calculate Final Output
    const componentsWithStock = componentRows.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      quantity: row.quantity,
      weight: row.weight,
      stock_available: componentStockMap[row.id] || 0
    }));

    Logger.info('Final Components Data (as sent to Frontend):', "DEBUG_VIRTUAL_STOCK");
    Logger.info(JSON.stringify(componentsWithStock), "DEBUG_VIRTUAL_STOCK");

  } catch (error) {
    Logger.error('Error occurred in debugging virtual stock', error, "DEBUG_VIRTUAL_STOCK");
  } finally {
    await connection.end();
  }
}

debugVirtualStock();
