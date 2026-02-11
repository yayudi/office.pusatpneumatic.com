
import 'dotenv/config';
import db from '../config/db.js';

async function check() {
  try {
    const [rows] = await db.query('SELECT id, sku, name, image_path FROM products WHERE name LIKE ?', ['MPC 4-01']);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
