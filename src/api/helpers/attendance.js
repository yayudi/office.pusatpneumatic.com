// src/api/helpers/attendance.js
import api from "../axios" // instance axios lo
/**
 * Aturan denda keterlambatan
 * Format: [batas menit, nominal denda]
 */
const aturanDenda = [
  [5, 0],
  [15, 10000],
  [30, 25000],
  [60, 50000],
  [Infinity, 100000],
]

/**
 * Hitung denda berdasarkan menit telat
 */
export function hitungDendaTelat(menitTelat) {
  return aturanDenda.find(([max]) => menitTelat <= max)[1]
}

/**
 * Cek apakah tanggal adalah Sabtu / Minggu
 */
export function isWeekend(year, month, tanggal) {
  const d = new Date(year, month - 1, tanggal)
  return d.getDay() === 6 || d.getDay() === 0
}

/**
 * Ambil data absensi
 */
export async function getAbsensiData(year, month) {
  const url = `/json/${year}/${year}-${month}.json`
  const { data } = await api.get(url)
  return data
}
