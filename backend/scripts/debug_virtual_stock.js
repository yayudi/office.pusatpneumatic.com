
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    console.log(`\n--- Debugging Virtual Stock for SKU: ${targetSku} ---`);

    // 1. Get Product ID
    const [products] = await connection.query('SELECT id, name, is_package FROM products WHERE sku = ?', [targetSku]);
    if (products.length === 0) {
      console.log('Product not found.');
      return;
    }
    const product = products[0];
    console.log('Product:', JSON.stringify(product, null, 2));

    if (!product.is_package) {
      console.log('Not a package.');
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
    console.log('\nComponents Found:', componentRows.length);
    console.log(JSON.stringify(componentRows, null, 2));

    // 3. Get Stock for Components
    const componentIds = [...new Set(componentRows.map(c => c.id))];
    console.log('\nComponent IDs:', componentIds);

    if (componentIds.length === 0) {
      console.log('No components IDs found.');
      return;
    }

    const stockQuery = `
            SELECT sl.product_id, SUM(sl.quantity) as total_stock
            FROM stock_locations sl
            JOIN locations l ON sl.location_id = l.id
            WHERE sl.product_id IN (?)
            GROUP BY sl.product_id
        `;

    console.log('\nExecuting Stock Query...');
    const [stockRows] = await connection.query(stockQuery, [componentIds]);
    console.log('Stock Rows Result:', JSON.stringify(stockRows, null, 2));

    // 4. Mimic Repository Map Logic
    let componentStockMap = {};
    stockRows.forEach(row => {
      componentStockMap[row.product_id] = row.total_stock;
    });
    console.log('\nStock Map:', JSON.stringify(componentStockMap, null, 2));

    // 5. Calculate Final Output
    const componentsWithStock = componentRows.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      quantity: row.quantity,
      weight: row.weight,
      stock_available: componentStockMap[row.id] || 0
    }));

    console.log('\nFinal Components Data (as sent to Frontend):');
    console.log(JSON.stringify(componentsWithStock, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugVirtualStock();
