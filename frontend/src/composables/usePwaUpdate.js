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
        // Check for updates every 60 minutes
        setInterval(() => registration.update(), 60 * 60 * 1000)
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
