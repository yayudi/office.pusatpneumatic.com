// api/helpers/attendance.js
import data from "../data" // axios instance khusus hosting
import { normalizeLogs } from "./normalize.js"

// Aturan denda keterlambatan
const aturanDenda = [
  [5, 0],
  [15, 10000],
  [30, 25000],
  [60, 50000],
  [Infinity, 100000],
]

export function hitungDendaTelat(menitTelat) {
  return aturanDenda.find(([max]) => menitTelat <= max)[1]
}

export function isWeekend(year, month, tanggal) {
  const d = new Date(year, month - 1, tanggal)
  return d.getDay() === 6 || d.getDay() === 0
}

export async function getAbsensiData(year, month) {
  const url = `/json/${year}/${year}-${month}.json`
  const { data: raw } = await data.get(url)

  return {
    summary: raw.i,
    users: normalizeLogs(raw) // 🚀 parsing pindah ke normalize.js
  }
}
