// frontend/src/composables/usePwaInstall.js
import { ref, onMounted, onUnmounted } from 'vue'

export const usePwaInstall = () => {
  const deferredPrompt = ref(null)
  const isInstallable = ref(false)
  const isBannerDismissed = ref(false)

  // Cek apakah user pernah dismiss prompt akhir-akhir ini (batas: 14 hari)
  const checkDismissStatus = () => {
    const dismissedAt = localStorage.getItem('pwa_install_dismissed')
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 14) {
        isBannerDismissed.value = true
        return
      }
    }
    isBannerDismissed.value = false
  }

  const handleBeforeInstallPrompt = (e) => {
    // Mencegah mini-infobar default milik Chrome agar tidak muncul
    e.preventDefault()
    // Simpan event untuk di-trigger nanti melalui tombol UI kita
    deferredPrompt.value = e
    isInstallable.value = true
    checkDismissStatus()
  }

  const handleAppInstalled = () => {
    isInstallable.value = false
    deferredPrompt.value = null
    console.log('PWA was installed')
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    
    // Fallback deteksi jika sudah standalone/dinstall (iOS Safari / Chromium)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        isInstallable.value = false
    }
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  const dismissPrompt = () => {
    isBannerDismissed.value = true
    localStorage.setItem('pwa_install_dismissed', Date.now().toString())
  }

  const installPwa = async () => {
    if (!deferredPrompt.value) return

    // Tampilkan native prompt
    deferredPrompt.value.prompt()

    // Tunggu user merespon prompt native
    const { outcome } = await deferredPrompt.value.userChoice
    console.log(`User response to the install prompt: ${outcome}`)

    // Wajib mengosongkan prompt setelah digunakan 1x
    deferredPrompt.value = null
    isInstallable.value = false
  }

  return {
    isInstallable,
    isBannerDismissed,
    installPwa,
    dismissPrompt
  }
}
