import { ref } from 'vue'
import apiClient from '@/api/axios'
import { useAuthStore } from '@/stores/auth.js'

/**
 * Single source of truth for backend URL derivation and image path resolution.
 * Replaces duplicated logic across ProductRow, ProductImageModal, MediaManagement,
 * MediaInfoModal, and MediaLightbox.
 */

const baseUrl =
  apiClient.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/** Backend root URL (without /api suffix) */
export const backendUrl = baseUrl.replace(/\/api\/?$/, '')

/**
 * Resolve any relative image path into a full URL.
 * Handles paths with or without leading slash, with or without 'uploads/' prefix.
 * @param {string | null | undefined} path
 * @returns {string | null}
 */
export const resolveUrl = (path) => {
  if (!path) return null
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  const prefix = cleanPath.startsWith('uploads/') ? '' : 'uploads/'
  const url = `${backendUrl}/${prefix}${cleanPath}`

  // Ambil token dari store (bypass reactivity jika dijalankan diluar setup, pinia sudah terinisialisasi)
  try {
    const auth = useAuthStore()
    if (auth.token) {
      return `${url}?token=${auth.token}`
    }
  } catch {
    // Abaikan error jika dipanggil sebelum pinia siap (misal saat boot)
  }
  return url
}

/**
 * Derive the best thumbnail URL from a product object.
 * Prefers thumbnail_path, falls back to image_path.
 * @param {object} product
 * @returns {string | null}
 */
export const resolveProductImageUrl = (product) => {
  const targetPath = product?.thumbnail_path || product?.image_path
  return resolveUrl(targetPath)
}

/**
 * Composable for tracking broken images.
 * Returns a shared reactive Set and an error handler.
 */
export function useBrokenImages() {
  const brokenImages = ref(new Set())

  /** @param {number|string} id */
  const onImgError = (id) => {
    brokenImages.value.add(id)
  }

  return { brokenImages, onImgError }
}
