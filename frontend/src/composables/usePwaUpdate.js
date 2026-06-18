// frontend/src/composables/usePwaUpdate.js
import { useRegisterSW } from 'virtual:pwa-register/vue'

/**
 * Composable for detecting and handling PWA service worker updates.
 * Uses prompt-based registration — user must explicitly accept the update.
 *
 * @returns {{ needRefresh: import('vue').Ref<boolean>, updateServiceWorker: () => Promise<void>, dismissUpdate: () => void }}
 */
export const usePwaUpdate = () => {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Check for updates periodically (e.g. every 1 hour)
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)

        // Cek update instan saat user kembali membuka tab aplikasi (Throttled: max 1 kali per 5 menit)
        let lastCheck = 0;
        const THROTTLE_MS = 5 * 60 * 1000; // 5 menit

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            const now = Date.now();
            if (now - lastCheck > THROTTLE_MS) {
              registration.update();
              lastCheck = now;
            }
          }
        });
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })

  const dismissUpdate = () => {
    needRefresh.value = false
  }

  return { needRefresh, updateServiceWorker, dismissUpdate }
}
