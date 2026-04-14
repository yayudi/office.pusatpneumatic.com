// backend/scripts/workers/mediaWorker.js
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import Vips from 'wasm-vips'
import {
  getPendingMediaJobs,
  lockMediaJobs,
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

const runMediaWorker = async () => {
  try {
    // 1. Cleanup Jobs Terjebak
    await cleanupMediaJobs()

    // 2. Ambil max 5 job pending
    const jobs = await getPendingMediaJobs(5)
    if (jobs.length === 0) {
      console.log('No pending media jobs.')
      return false
    }

    const jobIds = jobs.map((j) => j.id)

    // 3. Langsung lock job menjadi processing
    const lockedRows = await lockMediaJobs(jobIds)
    if (lockedRows === 0) return false

    console.log(`Processing ${lockedRows} media jobs: [${jobIds.join(',')}]`)

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

        // Bikin thumbnail (max width 300)
        let thumbImage = image
        if (image.width > 300) {
          // Harus handle tinggi/lebar kalau mau strict kotak, tp disini resize maintain spec
          thumbImage = image.resize(300 / image.width)
        }

        const thumbOutBuffer = thumbImage.writeToBuffer('.webp', { Q: 80 })
        await fs.writeFile(finalThumbFullPath, thumbOutBuffer)

        const finalWidth = mainImage.width;
        const finalHeight = mainImage.height;

        const fileStat = await fs.stat(finalMainFullPath);
        const fileSizeInBytes = fileStat.size;

        // Hapus file asli karena udah jadi .webp
        await fs.unlink(rawPath).catch(err => console.warn("Failed to delete raw image:", err.message))

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

        console.log(`Job ${job.id} completed.`)
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error)
        await failMediaJob(job.id, error.message || 'Unknown processing error')
      }
    }

    // Matikan manual (hanya di worker process standalone)
    return true
  } catch (globalErr) {
    console.error('Media Worker Error:', globalErr)
    throw globalErr
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMediaWorker()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

