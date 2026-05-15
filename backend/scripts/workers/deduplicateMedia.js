import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import db from '../../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base uploads directory
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

async function deduplicateMedia() {
  console.log('🚀 Memulai pembersihan duplikat media...');
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Temukan hash yang memiliki lebih dari satu entry
    const [duplicates] = await connection.query(`
      SELECT hash, COUNT(*) as count 
      FROM media_assets 
      WHERE hash IS NOT NULL 
      GROUP BY hash 
      HAVING count > 1
    `);

    console.log(`Menemukan ${duplicates.length} grup hash duplikat.`);

    let totalDeleted = 0;
    let totalMergedLinks = 0;

    for (const group of duplicates) {
      console.log(`\nProcessing hash: ${group.hash}`);
      
      // 2. Ambil detail semua aset dalam grup ini beserta jumlah link produknya
      const [assets] = await connection.query(`
        SELECT m.id, m.main_path, m.thumbnail_path, m.created_at,
          (SELECT COUNT(*) FROM product_images WHERE media_id = m.id) as usage_count
        FROM media_assets m
        WHERE m.hash = ?
      `, [group.hash]);

      // 3. Tentukan "Master" (Canonical)
      // Kriteria: Utamakan yang sudah memiliki link (usage_count DESC), lalu yang paling lama (created_at ASC)
      assets.sort((a, b) => {
        if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      const master = assets[0];
      const itemsToDelete = assets.slice(1);

      console.log(`  Keeping ID: ${master.id} (Usage: ${master.usage_count}, Created: ${master.created_at})`);

      for (const dupe of itemsToDelete) {
        console.log(`  Processing Duplicate ID: ${dupe.id}...`);

        // A. Pindahkan link produk ke Master
        // Gunakan INSERT IGNORE pattern untuk menghindari duplikasi link pada produk yang sama
        const [links] = await connection.query(`SELECT product_id, is_primary, sort_order FROM product_images WHERE media_id = ?`, [dupe.id]);
        
        for (const link of links) {
          // Cek apakah produk sudah punya master image ini
          const [existingLink] = await connection.query(
            `SELECT id FROM product_images WHERE product_id = ? AND media_id = ?`,
            [link.product_id, master.id]
          );

          if (existingLink.length === 0) {
            await connection.query(
              `UPDATE product_images SET media_id = ? WHERE product_id = ? AND media_id = ?`,
              [master.id, link.product_id, dupe.id]
            );
            totalMergedLinks++;
          } else {
            // Jika produk sudah punya master, hapus saja link yang duplikat ini
            await connection.query(`DELETE FROM product_images WHERE product_id = ? AND media_id = ?`, [link.product_id, dupe.id]);
          }
        }

        // B. Hapus file fisik (Main & Thumbnail)
        // Jika file master dan file duplikat menunjuk ke path yang sama (jarang terjadi tapi mungkin), jangan hapus
        if (dupe.main_path && dupe.main_path !== master.main_path) {
          const mainFile = path.join(UPLOADS_DIR, dupe.main_path);
          await fs.unlink(mainFile).catch(err => console.log(`    ⚠️ Gagal hapus main file: ${mainFile} (${err.code})`));
        }

        if (dupe.thumbnail_path && dupe.thumbnail_path !== master.thumbnail_path) {
          const thumbFile = path.join(UPLOADS_DIR, dupe.thumbnail_path);
          await fs.unlink(thumbFile).catch(err => console.log(`    ⚠️ Gagal hapus thumb file: ${thumbFile} (${err.code})`));
        }

        // C. Hapus record dari media_assets
        await connection.query(`DELETE FROM media_assets WHERE id = ?`, [dupe.id]);
        totalDeleted++;
        console.log(`    ✅ ID ${dupe.id} berhasil dihapus.`);
      }
    }

    await connection.commit();
    console.log('\n=======================================');
    console.log('🎉 Pembersihan Duplikat Selesai!');
    console.log(`Total Aset Dihapus: ${totalDeleted}`);
    console.log(`Total Link Produk Dimigrasi: ${totalMergedLinks}`);
    console.log('=======================================');

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Terjadi kesalahan fatal saat deduplikasi:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

deduplicateMedia();
