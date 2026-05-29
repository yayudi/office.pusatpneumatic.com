<!-- frontend\src\App.vue -->
<script setup>
import { computed, ref, onMounted } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppHeader from '@/components/layout/AppHeader.vue'
import MessageToast from '@/components/ui/MessageToast.vue'
import { registerToast } from '@/composables/useToast.js'
import { useTheme } from '@/composables/useTheme'
import PwaUpdatePrompt from '@/components/ui/PwaUpdatePrompt.vue'
import PwaInstallBanner from '@/components/ui/PwaInstallBanner.vue'
import GlobalDownloadManager from '@/components/shared/GlobalDownloadManager.vue'
import { useMobile } from '@/composables/useMobile.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { initTheme } = useTheme()
const { isMobile } = useMobile()

const toastComponentRef = ref(null)
const showHeader = computed(() => route.name && route.name !== 'Login' && auth.isAuthenticated)

onMounted(() => {
  initTheme()
  if (toastComponentRef.value) {
    registerToast(toastComponentRef.value)
  }
})

function handleLogout() {
  auth.clearToken()
  router.push('/login')
}
</script>

<template>
  <div class="bg-background text-text min-h-screen font-sans custom-scrollbar overflow-y-auto">
    <MessageToast ref="toastComponentRef" />
    <PwaUpdatePrompt />
    <PwaInstallBanner />

    <AppHeader v-if="showHeader" @logout="handleLogout" />
    <GlobalDownloadManager v-if="showHeader && auth.user?.permissions?.includes('view-reports')" />
    <main class="container mx-auto mt-12" :class="isMobile ? 'px-3 py-2' : 'p-4'">
      <RouterView />
    </main>
  </div>
</template>
