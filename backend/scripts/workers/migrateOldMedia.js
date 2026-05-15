import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import db from '../../config/db.js';
import { stripExif } from '../../utils/imageProcessor.js';
import { calcHash } from '../../utils/hash.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base uploads directory
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

async function migrateOldMedia() {
  console.log('🚀 Memulai migrasi media lama...');
  let connection;

  try {
    connection = await db.getConnection();

    // Ambil semua media yang belum memiliki hash ATAU metadata masih kosong
    const [assets] = await connection.query(`
      SELECT id, main_path, title
      FROM media_assets
      WHERE hash IS NULL OR size_bytes IS NULL OR width IS NULL
    `);

    console.log(`Menemukan ${assets.length} media yang perlu dimigrasi.`);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const filePath = path.join(UPLOADS_DIR, asset.main_path);

      try {
        // Cek apakah file fisik ada
        await fs.access(filePath);

        // Baca file
        const originalBuffer = await fs.readFile(filePath);

        // Strip EXIF
        const { buffer: cleanBuffer, width, height } = await stripExif(originalBuffer);

        // Kalkulasi Hash
        const hash = calcHash(cleanBuffer);

        // Simpan kembali file yang sudah bersih
        await fs.writeFile(filePath, cleanBuffer);

        // Cek apakah hash sudah ada di database
        const [existing] = await connection.query(`
          SELECT id FROM media_assets WHERE hash = ? AND id != ? LIMIT 1
        `, [hash, asset.id]);

        if (existing.length > 0) {
          // Jika duplikat, set duplicate_of
          await connection.query(`
            UPDATE media_assets SET duplicate_of = ?, size_bytes = ?, width = ?, height = ? WHERE id = ?
          `, [existing[0].id, cleanBuffer.length, width, height, asset.id]);
          duplicateCount++;
          console.log(`[${i + 1}/${assets.length}] ⚠️ Duplikat ditemukan: ID ${asset.id} adalah duplikat dari ID ${existing[0].id}`);
        } else {
          // Jika unik, update hash dan metadata
          await connection.query(`
            UPDATE media_assets SET hash = ?, size_bytes = ?, width = ?, height = ? WHERE id = ?
          `, [hash, cleanBuffer.length, width, height, asset.id]);
          successCount++;
          console.log(`[${i + 1}/${assets.length}] ✅ Berhasil memproses ID ${asset.id}`);
        }

      } catch (err) {
        errorCount++;
        console.error(`[${i + 1}/${assets.length}] ❌ Gagal memproses ID ${asset.id} (${asset.main_path}):`, err.message);
      }
    }

    console.log('\n=======================================');
    console.log('🎉 Migrasi Selesai!');
    console.log(`Berhasil hash baru: ${successCount}`);
    console.log(`Duplikat ditandai: ${duplicateCount}`);
    console.log(`Gagal/File Hilang: ${errorCount}`);
    console.log('=======================================');

  } catch (error) {
    console.error('Terjadi kesalahan fatal saat migrasi:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

migrateOldMedia();
