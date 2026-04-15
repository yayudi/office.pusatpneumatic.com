// backend/scripts/workers/devCron.js
import db from '../../config/db.js'

// Import jobs
import { processQueue as exportQueue } from './exportQueue.js'
import { importQueue } from './importQueue.js'
import { runMediaWorker } from './mediaWorker.js'

const EXPORT_INTERVAL = 10000 // 10s
const IMPORT_INTERVAL = 15000 // 15s
const MEDIA_INTERVAL = 5000 // 5s

// Locks / Flags
let isExporting = false
let isImporting = false
let isProcessingMedia = false

console.log('[DevCron] 🔥 Unified Development Worker Started!')

// Wrapper runners
const runExport = async () => {
  if (isExporting) return
  isExporting = true
  try {
    await exportQueue()
  } catch (err) {
    console.error('[DevCron] ❌ Export Worker Error:', err.message)
  } finally {
    isExporting = false
  }
}

const runImport = async () => {
  if (isImporting) return
  isImporting = true
  try {
    await importQueue()
  } catch (err) {
    console.error('[DevCron] ❌ Import Worker Error:', err.message)
  } finally {
    isImporting = false
  }
}

const runMedia = async () => {
  if (isProcessingMedia) return
  isProcessingMedia = true
  try {
    await runMediaWorker()
  } catch (err) {
    console.error('[DevCron] ❌ Media Worker Error:', err.message)
  } finally {
    isProcessingMedia = false
  }
}

// -----------------------------------------------------
// INIT & TIMERS DENGAN STAGGER/DELAY MITIGASI EVENT LOOP
// -----------------------------------------------------

// 1. Media Worker (Ringan/Cepat tp bisa CPU Bound)
setTimeout(() => {
  console.log('[DevCron] ⏱️ Memulai Interval Media Worker (tiap 5s)...')
  runMedia() // Initial run
  setInterval(runMedia, MEDIA_INTERVAL)
}, 1000)

// 2. Export Worker (Offset 3 detik dari boot/media)
setTimeout(() => {
  console.log('[DevCron] ⏱️ Memulai Interval Export Worker (tiap 10s)...')
  runExport() // Initial run
  setInterval(runExport, EXPORT_INTERVAL)
}, 3000)

// 3. Import Worker (Offset 6 detik dari boot/media)
setTimeout(() => {
  console.log('[DevCron] ⏱️ Memulai Interval Import Worker (tiap 15s)...')
  runImport() // Initial run
  setInterval(runImport, IMPORT_INTERVAL)
}, 6000)

// -----------------------------------------------------
// GRACEFUL SHUTDOWN
// -----------------------------------------------------
function shutdown() {
  console.log('\n[DevCron] 🛑 Menghentikan Unified Worker. Menutup pool koneksi...')
  if (db.pool) {
    db.pool.end()
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
