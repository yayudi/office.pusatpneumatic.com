
import 'dotenv/config';
import db from '../config/db.js';

const migrate = async () => {
  console.log('Starting Image Migration...');
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [products] = await connection.query("SELECT id, image_path FROM products WHERE image_path IS NOT NULL AND image_path != ''");
    console.log(`Found ${products.length} products with legacy images.`);

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
    console.log(`Successfully migrated ${migrated} images.`);
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    console.error('Migration Failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
};

migrate();
