// backend/scripts/workers/mediaWorker.js
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import os from 'os'

// --- WORKAROUND UNTUK SHARED HOSTING (EAGAIN / LIMIT THREAD) ---
// wasm-vips membaca os.cpus() saat inisialisasi dan mencoba membuat puluhan Worker Thread.
// Pada shared hosting dengan resource ketat, ini memicu error "EAGAIN" (Cannot allocate memory/thread).
// Solusi: Kita 'mock' jumlah CPU menjadi 1 sebelum load library-nya.
const originalCpus = os.cpus
os.cpus = () => [{}] 
process.env.VIPS_CONCURRENCY = '1'
process.env.UV_THREADPOOL_SIZE = '1'

const { default: Vips } = await import('wasm-vips')

os.cpus = originalCpus
// -------------------------------------------------------------
import Logger from "../../utils/logger.js";
import {
  getAndLockPendingMediaJobs,
  completeMediaJob,
  failMediaJob,
  cleanupMediaJobs
} from '../../repositories/mediaJobRepository.js'

// Agar environment loaded dengan benar dari CWD cron maupun absolute path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendDir = path.resolve(__dirname, '../../') // naik dari scripts/workers ke root backend
dotenv.config({ path: path.join(backendDir, '.env') })

// Variabel module ganda untuk menyimpan instance Vips yang telah diinisiasi
let vipsInstance = null

const initVips = async () => {
  if (!vipsInstance) {
    vipsInstance = await Vips()
  }
  return vipsInstance
}

export const runMediaWorker = async () => {
  try {
    // 1. Cleanup Jobs Terjebak
    await cleanupMediaJobs()

    // 2. Ambil max 5 job pending dan langsung di-lock secara atomik
    const jobs = await getAndLockPendingMediaJobs(5)
    if (jobs.length === 0) {
      Logger.info('No pending media jobs.', "MEDIA_WORKER");
      return false
    }

    const jobIds = jobs.map((j) => j.id)

    Logger.info(`Processing ${jobs.length} media jobs: [${jobIds.join(',')}]`, "MEDIA_WORKER");

    const vips = await initVips()

    // 4. Proses masing-masing job
    for (const job of jobs) {
      try {
        // Safe relative string slice resolving against "uploads" directory
        const relativePath = job.temp_filepath.replace(/^\/+/, '')
        const effectivePath = relativePath.startsWith('uploads/') ? relativePath : path.join('uploads', relativePath)
        const rawPath = path.resolve(backendDir, effectivePath)

        // Memastikan file exist
        await fs.access(rawPath)

        // Membaca file menjadi instance Vips
        // wasm-vips tidak mendukung reading langsung the path on Node directly natively out the box depending on bindings, using buffer is safer
        const rawBuffer = await fs.readFile(rawPath)
        const image = vips.Image.newFromBuffer(rawBuffer)

        // WebP output paths
        const timestamp = Date.now()
        const uniqueSuffix = Math.round(Math.random() * 1e9)
        const mainName = `main-${timestamp}-${uniqueSuffix}.webp`
        const thumbName = `thumb-${timestamp}-${uniqueSuffix}.webp`

        const tempDir = path.resolve(backendDir, 'uploads')
        const mainDir = path.resolve(tempDir, 'main')
        const thumbDir = path.resolve(tempDir, 'thumb')

        await fs.mkdir(mainDir, { recursive: true }).catch(() => { })
        await fs.mkdir(thumbDir, { recursive: true }).catch(() => { })

        const finalMainFullPath = path.join(mainDir, mainName)
        const finalThumbFullPath = path.join(thumbDir, thumbName)

        // Bikin main image (max width 1600)
        let mainImage = image
        if (image.width > 1600) {
          mainImage = image.resize(1600 / image.width)
        }

        const mainOutBuffer = mainImage.writeToBuffer('.webp', { Q: 80 })
        await fs.writeFile(finalMainFullPath, mainOutBuffer)

        // Bikin thumbnail (max width 300, strict 1:1 crop centre)
        let thumbImage = image
        try {
          thumbImage = image.thumbnailImage(300, { height: 300, crop: 'centre' })
        } catch (error) {
          Logger.warn("Failed to generate strict 1:1 thumbnail, falling back to resize", "MEDIA_WORKER", error)
          // Fallback if thumbnailImage fails
          if (image.width > 300) {
            thumbImage = image.resize(300 / image.width)
          }
        }

        const thumbOutBuffer = thumbImage.writeToBuffer('.webp', { Q: 80 })
        await fs.writeFile(finalThumbFullPath, thumbOutBuffer)

        const finalWidth = mainImage.width;
        const finalHeight = mainImage.height;

        const fileStat = await fs.stat(finalMainFullPath);
        const fileSizeInBytes = fileStat.size;

        // Hapus file asli karena udah jadi .webp
        await fs.unlink(rawPath).catch(err => Logger.warn("Failed to delete raw image", "MEDIA_WORKER", err))

        // Update Job sebagai Completed dan set return path relative
        await completeMediaJob(
          job.id,
          `main/${mainName}`,
          `thumb/${thumbName}`,
          {
            width: finalWidth,
            height: finalHeight,
            size_bytes: fileSizeInBytes
          }
        )

        Logger.info(`Job ${job.id} completed.`, "MEDIA_WORKER");
      } catch (error) {
        Logger.error(`Job ${job.id} failed`, error, "MEDIA_WORKER");
        await failMediaJob(job.id, error.message || 'Unknown processing error')
      }
    }

    // Matikan manual (hanya di worker process standalone)
    return true
  } catch (globalErr) {
    Logger.error('Media Worker Error', globalErr, "MEDIA_WORKER");
    throw globalErr
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMediaWorker()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

