// src/api/helpers/format.js

/**
 * Format angka ke format ribuan Indonesia
 */
export function formatNumber(n) {
  return new Intl.NumberFormat("id-ID").format(n)
}

/**
 * Format angka ke Rupiah
 */
export function formatRupiah(n) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n)
}
