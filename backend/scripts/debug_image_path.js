import 'dotenv/config';
import db from '../config/db.js';
import Logger from '../utils/logger.js';

async function check() {
  try {
    const [rows] = await db.query('SELECT id, sku, name, image_path FROM products WHERE name LIKE ?', ['MPC 4-01']);
    Logger.info("Debug image paths: " + JSON.stringify(rows, null, 2), "DEBUG_IMAGE_PATH");
  } catch (err) {
    Logger.error("Debug image path error", err, "DEBUG_IMAGE_PATH");
  } finally {
    process.exit(0);
  }
}

check();
