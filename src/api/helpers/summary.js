import {
  JAM_KERJA_MULAI,
  JAM_KERJA_SELESAI,
  JAM_KERJA_SELESAI_SABTU,
  TOLERANSI_MENIT,
  TARIF_LEMBUR_PER_JAM
} from './config.js';
import { formatJamMenit, isWeekend } from './time.js';
import { hitungDendaTelat } from './attendance.js';
import { normalizeLogs } from './logs.js';   // ✅ import dari modul baru

export async function calculateSummaryForUser(rawDays, year, month) {
  const logs = normalizeLogs(rawDays, year, month);

  if (!logs || logs.length === 0) return { /* ... default kosong */ };

  // 🔹 perhitungan summary sama kayak versi lama
  // ...
}
