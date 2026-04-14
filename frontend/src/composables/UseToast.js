// frontend/src/composables/useToast.js
import { ref } from 'vue'

const toastRef = ref(null)

export function registerToast(instance) {
  toastRef.value = instance
}

/**
 * Composable untuk menampilkan toast notification dari komponen manapun.
 * @returns {{ toast: (msg: string, type?: 'info'|'success'|'error'|'warning', duration?: number) => void }}
 */
export function useToast() {
  const toast = (msg, type = 'info', duration = 3000) => {
    if (toastRef.value) {
      toastRef.value.showMessage(msg, type, duration)
    } else {
      console.warn('⚠️ Toast belum diregister')
    }
  }
  return { toast }
}
