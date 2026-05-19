import 'dotenv/config';
import db from '../config/db.js';
import Logger from '../utils/logger.js';

const migrate = async () => {
  Logger.info('Starting Image Migration...', "MIGRATE_IMAGES");
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [products] = await connection.query("SELECT id, image_path FROM products WHERE image_path IS NOT NULL AND image_path != ''");
    Logger.info(`Found ${products.length} products with legacy images.`, "MIGRATE_IMAGES");

    let migrated = 0;
    for (const p of products) {
      // Check if already migrated
      const [existing] = await connection.query("SELECT id FROM product_images WHERE product_id = ? AND image_path = ?", [p.id, p.image_path]);

      if (existing.length === 0) {
        await connection.query(
          "INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, 1)",
          [p.id, p.image_path]
        );
        migrated++;
      }
    }

    await connection.commit();
    Logger.info(`Successfully migrated ${migrated} images.`, "MIGRATE_IMAGES");
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    Logger.error('Migration Failed', error, "MIGRATE_IMAGES");
    process.exit(1);
  } finally {
    connection.release();
  }
};

migrate();
