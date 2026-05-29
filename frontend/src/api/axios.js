// frontend\src\api\axios.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

// Buat instance axios
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000, // Timeout dalam 10 detik
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * REQUEST INTERCEPTOR
 * Menyisipkan token otomatis ke setiap request keluar.
 */
instance.interceptors.request.use(
  config => {
    // Lebih baik ambil dari store agar reaktif, tapi fallback ke localStorage aman
    const authStore = useAuthStore()
    const token = authStore.token || localStorage.getItem('token')

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    // --- AUTO TIMEOUT OVERRIDE ---
    // Jika payload adalah FormData (Upload File) atau response diharapkan Blob (Download File)
    // Perpanjang timeout menjadi 60 detik (60000 ms) agar tidak putus di tengah jalan.
    if (config.data instanceof FormData || config.responseType === 'blob') {
      config.timeout = 80000
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

/**
 * RESPONSE INTERCEPTOR (Refactored)
 * Menangkap error global, khususnya saat token kadaluwarsa (401/403).
 */
instance.interceptors.response.use(
  response => response,
  async error => {
    const authStore = useAuthStore() // Pastikan import store sudah benar di sini

    if (error.response) {
      const { status } = error.response

      // Token Expired / Tidak Valid (401)
      // -> HANYA Logout jika statusnya 401 dan BUKAN request dari login
      if (status === 401 && !error.config.url.includes('/auth/login')) {
        authStore.logout()
        // Tampilkan Toast "Sesi expired"
        toast('Sesi telah berakhir, silakan login kembali.', 'error')
        // Redirect ke login page
        window.location.href = '/login'
      }

      // Tidak Punya Izin (403)
      // -> JANGAN Logout, tapi beri tahu user
      else if (status === 403) {
        const serverMessage = error.response.data?.message || 'Akses ditolak.'
        toast(`Gagal: ${serverMessage}`, 'error')
      }
    }

    return Promise.reject(error)
  }
)

export default instance
