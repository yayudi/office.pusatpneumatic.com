<!-- frontend/src/components/ui/PwaInstallBanner.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { usePwaInstall } from '@/composables/usePwaInstall.js'

const { isInstallable, isBannerDismissed, isIos, installPwa, dismissPrompt } = usePwaInstall()

// Hotkey Banner Logic
const isHotkeyBannerDismissed = ref(true) // Default true until checked
onMounted(() => {
  const dismissedAt = localStorage.getItem('hotkey_banner_dismissed')
  if (!dismissedAt) {
    isHotkeyBannerDismissed.value = false
  }
})

const dismissHotkeyBanner = () => {
  isHotkeyBannerDismissed.value = true
  localStorage.setItem('hotkey_banner_dismissed', Date.now().toString())
}
</script>

<template>
  <Transition name="pwa-install-slide">
    <div v-if="isInstallable && !isBannerDismissed" id="pwa-install-banner"
      class="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md bg-secondary border border-primary/20 rounded-xl shadow-2xl px-5 py-4">
      <!-- iOS Safari: Instruksi manual -->
      <div v-if="isIos" class="flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 bg-background/50 p-2 rounded-lg">
            <font-awesome-icon icon="fa-solid fa-mobile-screen-button" class="text-primary text-2xl" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-text text-sm font-semibold">Install Aplikasi WMS</p>
            <p class="text-text/60 text-xs mt-1 leading-relaxed">
              Untuk menginstall di iPhone/iPad:
            </p>
          </div>
          <button @click="dismissPrompt" class="flex-shrink-0 p-1 text-text/40 hover:text-text transition-colors"
            aria-label="Tutup">
            <font-awesome-icon icon="fa-solid fa-xmark" />
          </button>
        </div>

        <div class="flex items-center gap-3 bg-background/30 rounded-lg px-3 py-2.5 text-xs text-text/80">
          <span class="font-medium">1.</span>
          <span>Ketuk tombol <strong class="text-primary">Share</strong></span>
          <font-awesome-icon icon="fa-solid fa-arrow-up-from-bracket" class="text-primary text-sm" />
        </div>
        <div class="flex items-center gap-3 bg-background/30 rounded-lg px-3 py-2.5 text-xs text-text/80">
          <span class="font-medium">2.</span>
          <span>Pilih <strong class="text-primary">"Add to Home Screen"</strong></span>
          <font-awesome-icon icon="fa-solid fa-plus-square" class="text-primary text-sm" />
        </div>
      </div>

      <!-- Chrome/Edge: Tombol install native -->
      <div v-else class="flex items-center gap-4">
        <div class="flex-shrink-0 bg-background/50 p-2 rounded-lg">
          <font-awesome-icon icon="fa-solid fa-mobile-screen-button" class="text-primary text-2xl" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-text text-sm font-semibold">Install Aplikasi WMS</p>
          <p class="text-text/60 text-xs mt-0.5">Akses lebih cepat & optimal langsung dari layar Home HP Anda.</p>
        </div>
        <div class="flex flex-col items-center gap-2 flex-shrink-0">
          <button @click="installPwa"
            class="w-full px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/80 rounded-lg transition-colors">
            Install
          </button>
          <button @click="dismissPrompt"
            class="w-full px-4 py-1 text-xs font-medium text-text/50 hover:text-text rounded-lg transition-colors">
            Nanti
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Hotkey Notification Banner -->
  <Transition name="pwa-install-slide">
    <div v-if="!isHotkeyBannerDismissed && (!isInstallable || isBannerDismissed)" id="hotkey-info-banner"
      class="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm bg-secondary border border-primary/20 rounded-xl shadow-2xl px-5 py-4 flex items-start gap-4">
      <div class="flex-shrink-0 bg-background/50 p-2 rounded-lg mt-4">
        <font-awesome-icon icon="fa-solid fa-keyboard" class="text-primary text-xl" />
      </div>
      <div class="flex-1 min-w-0 text-text font-mono text-[10px]">
        <p class="text-text text-sm font-semibold">Gunakan Keyboard Shortcut!</p>
        <p class="flex items-center gap-2 mt-0.5">
          <kbd class="px-1.5 py-0.5 bg-background border border-secondary/50 rounded-md shadow-sm">Alt</kbd>
          + <kbd class="px-1.5 py-0.5 bg-background border border-secondary/50 rounded-md shadow-sm">/</kbd>
          untuk melihat daftar Hotkey
        </p>
        <p class="flex items-center gap-2 mt-0.5">
          <kbd class="px-1.5 py-0.5 bg-background border border-secondary/50 rounded-md shadow-sm">Alt</kbd>
          + <kbd class="px-1.5 py-0.5 bg-background border border-secondary/50 rounded-md shadow-sm">H</kbd>untuk
          panduan sistem.
        </p>
      </div>
      <div class="flex-shrink-0">
        <button @click="dismissHotkeyBanner"
          class="p-1.5 text-text/40 hover:text-text hover:bg-background/50 rounded-lg transition-colors"
          aria-label="Tutup">
          <font-awesome-icon icon="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-install-slide-enter-active,
.pwa-install-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.pwa-install-slide-enter-from,
.pwa-install-slide-leave-to {
  transform: translateX(-50%) translateY(120%);
  opacity: 0;
}
</style>
