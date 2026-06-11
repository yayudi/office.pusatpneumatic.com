// frontend/src/composables/useToast.js
import Swal from 'sweetalert2'

const tailwindCustomClass = {
  popup: 'bg-background text-text rounded-xl shadow-lg border border-gray-200 dark:border-gray-700',
  title: 'text-text font-medium text-sm',
}

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timerProgressBar: true,
  background: 'transparent',
  customClass: tailwindCustomClass,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
})

/**
 * Composable untuk menampilkan toast notification dari komponen manapun.
 * Menggunakan SweetAlert2 under the hood.
 * @returns {{ toast: (msg: string, type?: 'info'|'success'|'error'|'warning', duration?: number) => void }}
 */
export function useToast() {
  const toast = (msg, type = 'info', duration = 3000) => {
    Toast.fire({
      icon: type,
      title: msg,
      timer: duration
    })
  }
  return { toast }
}
