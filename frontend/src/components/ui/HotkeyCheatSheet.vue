<!-- frontend/src/components/ui/HotkeyCheatSheet.vue -->
<script setup>
import { isCheatSheetOpen } from '@/composables/useAppHotkeys'

const globalHotkeys = [
  { keys: ['Alt', '1'], desc: 'Buka Modul WMS' },
  { keys: ['Alt', '2'], desc: 'Buka Modul Media' },
  { keys: ['Alt', '3'], desc: 'Buka Modul Absensi' },
  { keys: ['Alt', '4'], desc: 'Buka Modul Stats' },
  { keys: ['Alt', '5'], desc: 'Buka Panel Admin' },
  { keys: ['Alt', 'T'], desc: 'Ganti Tema (Cycle)' },
  { keys: ['Alt', '/'], desc: 'Tampilkan Bantuan Shortcut' },
  { keys: ['Alt', 'Shift', 'L'], desc: 'Logout' },
]

const localHotkeys = [
  { keys: ['/'], desc: 'Fokus Pencarian' },
  { keys: ['Alt', 'S'], desc: 'Simpan / Submit Form' },
  { keys: ['Alt', 'N'], desc: 'Tambah Data Baru' },
  { keys: ['Alt', 'R'], desc: 'Refresh Tabel / Data' },
  { keys: ['Alt', 'A'], desc: 'Pilih Semua (Bulk Action)' },
  { keys: ['Esc'], desc: 'Tutup Modal / Batal' },
]

function close() {
  isCheatSheetOpen.value = false
}
</script>

<template>
  <div v-if="isCheatSheetOpen"
    class="fixed inset-0 z-[99999] flex h-screen items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    @click.self="close">
    <div
      class="bg-background mx-auto my-auto border border-secondary/20 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
      <div class="p-6 border-b border-secondary/20 flex justify-between items-center bg-secondary/10">
        <h2 class="text-xl font-bold text-primary flex items-center gap-2">
          <font-awesome-icon icon="fa-solid fa-keyboard" />
          Keyboard Shortcuts
        </h2>
        <button @click="close" class="text-text/60 hover:text-danger transition-colors" title="Tutup (Esc)">
          <font-awesome-icon icon="fa-solid fa-xmark" class="text-xl" />
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-8 text-text">
        <section>
          <h3 class="text-lg font-semibold mb-4 text-text/90 border-b border-secondary/20 pb-2">Global Navigation</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="hk in globalHotkeys" :key="hk.desc"
              class="flex justify-between items-center bg-secondary/25 p-3 rounded-lg border border-secondary/10">
              <span class="text-sm font-medium">{{ hk.desc }}</span>
              <div class="flex gap-1">
                <kbd v-for="k in hk.keys" :key="k"
                  class="bg-background border border-secondary/40 text-text/80 rounded px-2 py-1 text-xs font-mono shadow-sm">
                  {{ k }}
                </kbd>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 class="text-lg font-semibold mb-4 text-text/90 border-b border-secondary/20 pb-2">Form & WMS Actions</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="hk in localHotkeys" :key="hk.desc"
              class="flex justify-between items-center bg-secondary/25 p-3 rounded-lg border border-secondary/10">
              <span class="text-sm font-medium">{{ hk.desc }}</span>
              <div class="flex gap-1">
                <kbd v-for="k in hk.keys" :key="k"
                  class="bg-background border border-secondary/40 text-text/80 rounded px-2 py-1 text-xs font-mono shadow-sm">
                  {{ k }}
                </kbd>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.2s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
