// backend/scripts/workers/devCron.js
import db from '../../config/db.js'
import Logger from '../../utils/logger.js'

// Import jobs
import { processQueue as exportQueue } from './exportQueue.js'
import { importQueue } from './importQueue.js'
import { runMediaWorker } from './mediaWorker.js'
import { runAutoRecovery } from './autoRecoveryWorker.js'

const EXPORT_INTERVAL = 10000 // 10s
const IMPORT_INTERVAL = 15000 // 15s
const MEDIA_INTERVAL = 5000 // 5s
const AUTO_RECOVERY_INTERVAL = 300000 // 5 menit

// Locks / Flags
let isExporting = false
let isImporting = false
let isProcessingMedia = false
let isRecovering = false

Logger.info('Unified Development Worker Started!', 'DEV_CRON')

// Wrapper runners
const runExport = async () => {
  if (isExporting) return
  isExporting = true
  try {
    await exportQueue()
  } catch (err) {
    Logger.error('Export Worker Error', err, 'DEV_CRON')
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
    Logger.error('Import Worker Error', err, 'DEV_CRON')
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
    Logger.error('Media Worker Error', err, 'DEV_CRON')
  } finally {
    isProcessingMedia = false
  }
}

const runRecovery = async () => {
  if (isRecovering) return
  
  const currentHour = new Date().getHours()
  // Rush Hour check: 08:00 - 18:00 (8 <= hour < 18)
  if (currentHour >= 8 && currentHour < 18) {
    return // Skip execution during rush hour
  }

  isRecovering = true
  try {
    await runAutoRecovery()
  } catch (err) {
    Logger.error('Auto Recovery Worker Error', err, 'DEV_CRON')
  } finally {
    isRecovering = false
  }
}

// -----------------------------------------------------
// INIT & TIMERS DENGAN STAGGER/DELAY MITIGASI EVENT LOOP
// -----------------------------------------------------

// 1. Media Worker (Ringan/Cepat tp bisa CPU Bound)
setTimeout(() => {
  Logger.info('Memulai Interval Media Worker (tiap 5s)...', 'DEV_CRON')
  runMedia() // Initial run
  setInterval(runMedia, MEDIA_INTERVAL)
}, 1000)

// 2. Export Worker (Offset 3 detik dari boot/media)
setTimeout(() => {
  Logger.info('Memulai Interval Export Worker (tiap 10s)...', 'DEV_CRON')
  runExport() // Initial run
  setInterval(runExport, EXPORT_INTERVAL)
}, 3000)

// 3. Import Worker (Offset 6 detik dari boot/media)
setTimeout(() => {
  Logger.info('Memulai Interval Import Worker (tiap 15s)...', 'DEV_CRON')
  runImport() // Initial run
  setInterval(runImport, IMPORT_INTERVAL)
}, 6000)

// 4. Auto Recovery Worker (Offset 9 detik dari boot/media)
setTimeout(() => {
  Logger.info('Memulai Interval Auto-Recovery Worker (tiap 5 menit, di luar rush hour)...', 'DEV_CRON')
  runRecovery() // Initial run
  setInterval(runRecovery, AUTO_RECOVERY_INTERVAL)
}, 9000)

// -----------------------------------------------------
// GRACEFUL SHUTDOWN
// -----------------------------------------------------
function shutdown() {
  Logger.info('Menghentikan Unified Worker. Menutup pool koneksi...', 'DEV_CRON')
  if (db.pool) {
    db.pool.end()
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
