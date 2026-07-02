import db from './backend/config/db.js';

async function main() {
  try {
    const [rows1] = await db.query('DESCRIBE stock_requests');
    console.log('--- stock_requests ---');
    console.table(rows1);

    const [rows2] = await db.query('DESCRIBE stock_request_items');
    console.log('--- stock_request_items ---');
    console.table(rows2);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
