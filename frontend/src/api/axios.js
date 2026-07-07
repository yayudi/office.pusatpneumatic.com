// frontend\src\api\axios.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loadingStore'

// Buat instance axios
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000, // Timeout dalam 30 detik untuk shared hosting
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
    const loadingStore = useLoadingStore()
    const token = authStore.token || localStorage.getItem('token')

    loadingStore.startLoading()

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
    const loadingStore = useLoadingStore()
    loadingStore.stopLoading()
    return Promise.reject(error)
  }
)

/**
 * RESPONSE INTERCEPTOR (Refactored)
 * Menangkap error global, khususnya saat token kadaluwarsa (401/403).
 */
instance.interceptors.response.use(
  response => {
    const loadingStore = useLoadingStore()
    loadingStore.stopLoading()
    return response
  },
  async error => {
    const authStore = useAuthStore() // Pastikan import store sudah benar di sini
    const loadingStore = useLoadingStore()
    
    loadingStore.stopLoading()

    if (error.response) {
      const { status, data } = error.response

      // Token Expired / Tidak Valid (401)
      // -> HANYA Logout jika statusnya 401 dan BUKAN request dari login
      if (status === 401 && !error.config.url.includes('/auth/login')) {
        authStore.logout()
        // Tampilkan Toast "Sesi expired"
        // Redirect ke login page
        window.location.href = '/login'
      }
      // Tidak Punya Izin (403)
      // -> JANGAN Logout, tapi beri tahu user
      else if (status === 403) {
//         const serverMessage = data?.message || 'Akses ditolak.' // Disabled due to unused var
      }
      // Global Error Handler untuk Server Error atau Bad Request
      else if (status >= 400 && status !== 401 && status !== 403) {
        // Abaikan endpoint login karena biasanya login page punya penanganan error spesifik di komponennya
        if (!error.config.url.includes('/auth/login')) {
           let serverMessage = data?.message || 'Terjadi kesalahan pada server.'

           // Format error validasi Zod agar lebih enak dibaca (menghilangkan prefix body. / query.)
           if (data?.error_code === 'VALIDATION_ERROR' && data?.message) {
             serverMessage = serverMessage.replace(/(body\.|query\.|params\.)/g, '')
             data.message = serverMessage // Sinkronkan ke response agar komponen menerima pesan yang sudah bersih
           }
        }
      }
    } else {
      // Network Error atau server mati
    }

    return Promise.reject(error)
  }
)

export default instance
