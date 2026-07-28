import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from '../../config/r2.js';
import Logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const ARCHIVE_DIR = path.resolve(__dirname, '../../uploads/archive');

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

async function uploadFolder(folderName) {
  const sourceFolder = path.join(UPLOADS_DIR, folderName);
  const targetArchiveFolder = path.join(ARCHIVE_DIR, folderName);

  await ensureDir(targetArchiveFolder);

  let files = [];
  try {
    files = await fs.readdir(sourceFolder);
  } catch (error) {
    Logger.warn(`Folder ${sourceFolder} tidak ditemukan atau kosong.`, 'MIGRATE_R2');
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const sourcePath = path.join(sourceFolder, file);
    const archivePath = path.join(targetArchiveFolder, file);
    const r2Key = `${folderName}/${file}`; // e.g. main/file.webp

    // Skip jika direktori
    const stat = await fs.stat(sourcePath);
    if (stat.isDirectory()) continue;

    try {
      const fileBuffer = await fs.readFile(sourcePath);
      const contentType = getContentType(sourcePath);

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await s3Client.send(command);

      // Pindahkan ke archive setelah sukses
      await fs.rename(sourcePath, archivePath);

      successCount++;
      if (successCount % 50 === 0) {
        Logger.info(`[${folderName}] Progress: ${successCount} files uploaded...`, 'MIGRATE_R2');
      }
    } catch (error) {
      failedCount++;
      Logger.error(`[${folderName}] Gagal upload file: ${file}`, error, 'MIGRATE_R2');
    }
  }

  return { success: successCount, failed: failedCount };
}

async function startMigration() {
  Logger.info('Memulai migrasi file fisik ke Cloudflare R2...', 'MIGRATE_R2');

  if (!process.env.R2_BUCKET_NAME) {
     Logger.warn('R2_BUCKET_NAME env variable is missing, trying to load dotenv manually', 'MIGRATE_R2');
     // Usually loaded by config/r2.js, but just in case
  }

  if (!s3Client) {
    Logger.error('S3 Client belum diinisialisasi. Periksa kredensial di .env', 'MIGRATE_R2');
    process.exit(1);
  }

  // Ensure archive root exists
  await ensureDir(ARCHIVE_DIR);

  Logger.info('Memproses folder "main"...', 'MIGRATE_R2');
  const mainResult = await uploadFolder('main');

  Logger.info('Memproses folder "thumb"...', 'MIGRATE_R2');
  const thumbResult = await uploadFolder('thumb');

  Logger.info('-----------------------------------------', 'MIGRATE_R2');
  Logger.info('Migrasi Selesai!', 'MIGRATE_R2');
  Logger.info(`Main  : ${mainResult.success} sukses, ${mainResult.failed} gagal.`, 'MIGRATE_R2');
  Logger.info(`Thumb : ${thumbResult.success} sukses, ${thumbResult.failed} gagal.`, 'MIGRATE_R2');
  Logger.info('-----------------------------------------', 'MIGRATE_R2');

  process.exit(0);
}

startMigration();
