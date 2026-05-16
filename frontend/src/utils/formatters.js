/**
 * Cached Intl.NumberFormat instances for better performance.
 */
const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const defaultNumberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Memformat angka menjadi string mata uang Rupiah (IDR).
 * @param {number|string} value - Nilai angka.
 * @returns {string} - String mata uang yang sudah diformat (e.g., "Rp 5.000").
 */
export function formatCurrency(value) {
  if (value == null || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return value;
  return idrFormatter.format(num);
}

// Alias for backward compatibility
export const formatRupiah = formatCurrency;

/**
 * Format angka ke format lokal Indonesia (ribuan pakai titik).
 * @param {number|string} val
 * @param {object} options Intl options (optional)
 * @returns {string}
 */
export function formatNumber(val, options = {}) {
  if (val == null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return val;

  if (Object.keys(options).length === 0) {
    return defaultNumberFormatter.format(num);
  }

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  }).format(num);
}

/**
 * Memformat string comma-separated tags atau JSON array menjadi array
 * @param {string|array} tagsStr 
 * @returns {string[]}
 */
export const formatTags = (tagsStr) => {
  if (!tagsStr) return [];
  if (Array.isArray(tagsStr)) return tagsStr;
  
  // Coba parse sebagai JSON array dulu
  if (typeof tagsStr === 'string') {
    try {
      const parsed = JSON.parse(tagsStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Jika bukan JSON, fallback ke comma-separated
      return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return [];
};

