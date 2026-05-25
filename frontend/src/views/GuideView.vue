<script setup>
import { ref, onMounted } from 'vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const activeTab = ref('fitur')
const activeGuide = ref('pwa')

const tabs = [
  { value: 'fitur', label: 'Fitur Baru', icon: 'fa-solid fa-timeline' },
  { value: 'panduan', label: 'Panduan', icon: 'fa-solid fa-book-open' },
  { value: 'faq', label: 'FAQ', icon: 'fa-solid fa-circle-question' }
]

const timelineFeatures = ref([])
const isLoadingTimeline = ref(false)

const fetchTimeline = async () => {
  isLoadingTimeline.value = true
  try {
    const { data } = await api.get('/changelogs')
    if (data.success) {
      timelineFeatures.value = data.data.map(log => {
        const d = new Date(log.releaseDate)
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        return {
          date: dateStr,
          title: `[${log.version}] ${log.title}`,
          desc: log.description,
          type: log.type
        }
      })
    }
  } catch (error) {
    console.error('Failed to fetch changelog:', error)
  } finally {
    isLoadingTimeline.value = false
  }
}

onMounted(() => {
  fetchTimeline()
})

const hotkeys = [
  { group: 'Navigasi Global', keys: ['Alt', '1 - 5'], desc: 'Pindah antar modul utama (WMS, Media, Absensi, dll).' },
  { group: 'Navigasi Global', keys: ['Alt', 'T'], desc: 'Mengubah tema secara bergiliran.' },
  { group: 'Navigasi Global', keys: ['Alt', 'Shift', 'L'], desc: 'Keluar dari aplikasi (Logout).' },
  { group: 'Navigasi Global', keys: ['Alt', '/'], desc: 'Membuka modal contekan hotkey.' },
  { group: 'Aksi Modal & Tabel', keys: ['/'], desc: 'Memfokuskan kursor ke kolom pencarian.' },
  { group: 'Aksi Modal & Tabel', keys: ['Alt', 'S'], desc: 'Simpan / Submit data (saat form terbuka).' },
  { group: 'Aksi Modal & Tabel', keys: ['Alt', 'N'], desc: 'Tambah data baru (membuka modal).' },
  { group: 'Aksi Modal & Tabel', keys: ['Alt', 'R'], desc: 'Refresh tabel secara instan.' },
  { group: 'Aksi Modal & Tabel', keys: ['Alt', 'A'], desc: 'Pilih semua item di tabel untuk Bulk Action.' },
  { group: 'Aksi Modal & Tabel', keys: ['Esc'], desc: 'Tutup modal yang sedang terbuka.' },
]

const pwaSteps = [
  { step: 1, title: 'Buka Menu Dropdown', desc: 'Klik pada ikon profil (nama Anda) di sudut kanan atas layar.' },
  { step: 2, title: 'Klik "Install Aplikasi"', desc: 'Opsi "Install Aplikasi" akan muncul jika perangkat/browser Anda mendukung. Klik opsi tersebut.' },
  { step: 3, title: 'Konfirmasi Instalasi', desc: 'Tekan Install pada popup browser, dan WMS HRIS akan ditambahkan ke layar utama atau desktop Anda.' },
]

const openFaqIndex = ref(null)
const toggleFaq = (index) => {
  openFaqIndex.value = openFaqIndex.value === index ? null : index
}

const faqCategories = [
  {
    label: 'Akun & Akses',
    icon: 'fa-solid fa-circle-info',
    items: [
      { q: 'Saya lupa password, bagaimana cara reset?', a: 'Sistem tidak menyediakan fitur self-reset password. Hubungi Admin IT agar melakukan reset melalui menu Admin Panel > Manajemen Pengguna.' },
      { q: 'Kenapa saya tidak bisa melihat beberapa menu (misalnya Admin Panel)?', a: 'Menu yang tampil disesuaikan dengan role dan permission akun Anda. Hanya user dengan izin tertentu yang bisa mengakses fitur tertentu. Hubungi Admin jika Anda merasa perlu akses tambahan.' },
      { q: 'Apakah data saya aman jika saya menutup browser tanpa logout?', a: 'Sesi Anda akan tetap aktif selama token belum kedaluwarsa. Namun untuk keamanan, disarankan logout (Alt+Shift+L) setelah selesai bekerja, terutama di perangkat bersama.' },
    ]
  },
  {
    label: 'WMS (Konsep & Aturan)',
    icon: 'fa-solid fa-warehouse',
    items: [
      { q: 'Bisakah stok menjadi minus (negatif)?', a: 'Tidak. Sistem secara ketat memblokir operasi apapun (penjualan, transfer, adjustment) yang menghasilkan kuantitas stok di bawah 0. Ini adalah aturan validasi fundamental yang tidak bisa dilewati.' },
      { q: 'Apa perbedaan Produk biasa dan Paket (Bundling)?', a: 'Produk adalah unit tunggal dengan SKU unik (misal: Sabun). Paket adalah bundling virtual dari beberapa produk dengan SKU baru (misal: Paket Mandi = 3x Sabun + 1x Shampoo). Stok paket dihitung berdasarkan komponen terkecilnya.' },
      { q: 'Apa bedanya Stock Opname dan Stock Adjustment?', a: 'Stock Opname adalah koreksi massal menggunakan file Excel untuk mencocokkan seluruh gudang sekaligus. Stock Adjustment adalah koreksi satuan pada satu produk di satu lokasi tertentu.' },
      { q: 'Kenapa barang saya tidak muncul di pencarian?', a: 'Pastikan produk berstatus Aktif (tidak di-soft-delete) dan SKU-nya sudah terdaftar. Pencarian bersifat case-insensitive dan mencakup kolom SKU serta Nama Produk.' },
      { q: 'Apakah perpindahan stok bisa dibatalkan setelah disubmit?', a: 'Tidak. Setiap perpindahan stok bersifat final dan tercatat di audit log. Jika terjadi kesalahan, lakukan perpindahan balik (reverse transfer) sebagai koreksi.' },
      { q: 'Apa arti status pada Picking List (PENDING, PICKED, CANCELLED)?', a: 'PENDING berarti pesanan belum diproses. PICKED berarti barang sudah diambil dari rak dan siap kirim. CANCELLED berarti pesanan dibatalkan (misalnya karena stok kosong atau permintaan pembeli).' },
      { q: 'File apa saja yang bisa diimpor ke sistem?', a: 'Sistem mendukung impor file Excel (.xlsx) untuk tiga jenis data: Picking List (pesanan masuk), Stock Adjustment (koreksi stok massal), dan data Kehadiran (absensi karyawan).' },
      { q: 'Bagaimana cara mengekspor data dari sistem?', a: 'Fitur ekspor tersedia di halaman Reports (Admin Panel > Reports). Ekspor diproses di latar belakang (background job) dan file hasilnya bisa diunduh setelah selesai.' },
      { q: 'Apa arti kondisi GOOD dan BAD pada retur?', a: 'GOOD berarti barang yang dikembalikan masih layak jual dan stoknya akan dikembalikan ke inventaris. BAD berarti barang rusak atau cacat dan tidak akan menambah stok jual.' },
    ]
  },
  {
    label: 'HRIS (Absensi & Kepegawaian)',
    icon: 'fa-solid fa-users',
    items: [
      { q: 'Karyawan lupa absen pulang (clock-out), apa yang terjadi?', a: 'Sistem akan mencatat jam keluar sebagai kosong (NULL). Admin HR perlu melakukan koreksi manual melalui modul Absensi agar perhitungan durasi kerja dan lembur akurat.' },
      { q: 'Apa itu toleransi keterlambatan (flexible minutes) pada Shift?', a: 'Setiap shift memiliki buffer waktu yang disebut \"flexible_minutes\". Jika diset 15 menit dan shift dimulai pukul 08:00, karyawan yang datang hingga 08:15 tetap dianggap \"Hadir\", bukan \"Terlambat\".' },
      { q: 'Apakah hari libur nasional otomatis dikenali sistem?', a: 'Ya, jika tanggal tersebut sudah dimasukkan ke tabel Hari Libur (holidays) oleh Admin. Karyawan yang tidak masuk pada hari libur terdaftar akan diberi status \"LIBUR\", bukan \"ALPHA\".' },
    ]
  },
]
</script>

<template>
  <div class="p-6 md:p-8 bg-background min-h-[calc(100vh-64px)] overflow-y-auto">
    <div class="max-w-8xl mx-auto">

      <!-- Header Section -->
      <div class="mb-8 border-b border-secondary/20 pb-6">
        <h1 class="text-3xl font-bold text-text flex items-center gap-3">
          <span class="bg-primary/10 text-primary p-2 rounded-lg text-2xl leading-none">
            <font-awesome-icon icon="fa-solid fa-graduation-cap" />
          </span>
          <span>Fitur & Panduan</span>
        </h1>
        <p class="text-text/70 mt-3 max-w-2xl text-base leading-relaxed">
          Pusat informasi terbaru tentang sistem WMS & HRIS DPS. Telusuri pembaruan rilis fitur, pelajari panduan
          pintasan, atau cari solusi di daftar pertanyaan umum (FAQ).
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="mb-8">
        <BaseTabs :tabs="tabs" v-model="activeTab" />
      </div>

      <!-- TAB CONTENT: FITUR (TIMELINE) -->
      <div v-show="activeTab === 'fitur'" class="animate-fade-in space-y-2">
        <div v-if="isLoadingTimeline" class="flex flex-col items-center justify-center py-12 text-primary">
          <font-awesome-icon icon="fa-solid fa-circle-notch" class="animate-spin text-4xl mb-4" />
          <p class="text-sm font-bold animate-pulse">Memuat riwayat pembaruan...</p>
        </div>
        <div v-else class="relative border-l-2 border-secondary/20 ml-3 md:ml-4 py-2">
          <div v-for="(feat, idx) in timelineFeatures" :key="idx" class="mb-10 ml-8 relative group">

            <!-- Timeline Dot -->
            <div
              class="absolute -left-[41px] md:-left-[43px] top-1 h-5 w-5 rounded-full border-4 border-background bg-primary shadow-sm group-hover:scale-125 transition-transform duration-300">
            </div>

            <!-- Content -->
            <div
              class="bg-secondary/5 rounded-2xl p-5 border border-secondary/10 hover:border-primary/30 transition-colors shadow-sm">
              <span class="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-full mb-3 inline-block">
                {{ feat.date }}
              </span>
              <h3 class="text-xl font-bold text-text mb-2">{{ feat.title }}</h3>
              <p class="text-text/80 leading-relaxed text-sm">
                {{ feat.desc }}
              </p>
            </div>
          </div>

          <!-- End Node -->
          <div class="ml-8 relative">
            <div
              class="absolute -left-[39px] md:-left-[41px] top-1 h-4 w-4 rounded-full border-4 border-background bg-secondary/30">
            </div>
            <p class="text-xs text-text/40 font-bold italic">Awal sejarah versi tercatat.</p>
          </div>
        </div>
      </div>

      <!-- TAB CONTENT: PANDUAN -->
      <div v-show="activeTab === 'panduan'" class="animate-fade-in">
        <div class="flex flex-col md:flex-row gap-6 md:items-start">
          
          <!-- Sidebar Navigasi -->
          <div class="w-full md:w-64 shrink-0">
            <div class="bg-secondary/5 border border-secondary/10 rounded-xl p-3 sticky top-24">
              <h3 class="text-xs font-bold text-text/40 uppercase tracking-wider mb-3 px-3">Daftar Topik Utama</h3>
              <nav class="space-y-1">
                <button @click="activeGuide = 'pwa'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'pwa' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-mobile-screen" class="w-4 opacity-70" /> Instalasi PWA
                </button>
                <button @click="activeGuide = 'hotkeys'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'hotkeys' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-keyboard" class="w-4 opacity-70" /> Pintasan Keyboard
                </button>
                <button @click="activeGuide = 'search'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'search' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-search" class="w-4 opacity-70" /> Pencarian Global
                </button>

                <button @click="activeGuide = 'theme'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'theme' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-palette" class="w-4 opacity-70" /> Ganti Tema
                </button>

                <!-- WMS Guides -->
                <template v-if="auth.hasPermission('perform-batch-movement') || auth.hasPermission('manage-stock-adjustment') || auth.hasPermission('upload-picking-list')">
                <h3 class="text-xs font-bold text-text/40 uppercase tracking-wider mt-6 mb-3 px-3">Operasional WMS</h3>
                <button v-if="auth.hasPermission('perform-batch-movement')" @click="activeGuide = 'movement'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'movement' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-truck-fast" class="w-4 opacity-70" /> Perpindahan Stok
                </button>
                <button v-if="auth.hasPermission('manage-stock-adjustment')" @click="activeGuide = 'opname'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'opname' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-boxes-stacked" class="w-4 opacity-70" /> Stock Opname
                </button>
                <button v-if="auth.hasPermission('manage-stock-adjustment')" @click="activeGuide = 'return'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'return' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-arrow-rotate-left" class="w-4 opacity-70" /> Retur Manual
                </button>
                <button v-if="auth.hasPermission('upload-picking-list')" @click="activeGuide = 'picking'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'picking' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-clipboard-list" class="w-4 opacity-70" /> Picking List
                </button>
                </template>

                <!-- Media & Products Guides -->
                <template v-if="auth.hasPermission('manage-products') || auth.hasPermission('product.image.view')">
                <h3 class="text-xs font-bold text-text/40 uppercase tracking-wider mt-6 mb-3 px-3">Produk & Media</h3>
                <button v-if="auth.hasPermission('manage-products')" @click="activeGuide = 'package'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'package' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-cubes-stacked" class="w-4 opacity-70" /> Manajemen Paket
                </button>
                <button v-if="auth.hasPermission('product.image.view')" @click="activeGuide = 'media'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'media' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-image" class="w-4 opacity-70" /> Batch Linking Media
                </button>
                </template>

                <!-- HR Guides -->
                <h3 class="text-xs font-bold text-text/40 uppercase tracking-wider mt-6 mb-3 px-3">Sistem HRIS</h3>
                <button @click="activeGuide = 'attendance'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'attendance' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-clock" class="w-4 opacity-70" /> Panduan Absensi
                </button>
                <button v-if="auth.hasPermission('manage-users')" @click="activeGuide = 'shift'" class="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-3"
                  :class="activeGuide === 'shift' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-text/70 hover:bg-secondary/10 border border-transparent'">
                  <font-awesome-icon icon="fa-solid fa-calendar-alt" class="w-4 opacity-70" /> Manajemen Shift
                </button>
              </nav>
            </div>
          </div>

          <!-- Main Content Area -->
          <div class="flex-grow min-w-0">
            
            <!-- PWA Guide -->
            <section v-if="activeGuide === 'pwa'" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 relative overflow-hidden animate-fade-in shadow-sm">
              <div class="absolute -right-10 -top-10 text-primary/5 text-9xl pointer-events-none">
                <font-awesome-icon icon="fa-brands fa-chrome" />
              </div>
              <div class="relative z-10">
                <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                  <span class="bg-accent/10 text-accent w-10 h-10 rounded-xl flex items-center justify-center">
                    <font-awesome-icon icon="fa-solid fa-mobile-screen" />
                  </span>
                  <span>Cara Instalasi Aplikasi (PWA)</span>
                </h2>
                <p class="text-text/80 mb-8 max-w-3xl text-sm leading-relaxed">
                  Instal website ini sebagai aplikasi *native* di Desktop maupun Mobile. Aplikasi akan berjalan lebih cepat, memiliki ikon mandiri di *home screen*, dan beroperasi secara layar penuh (*full-screen*). Ini sangat disarankan bagi pengguna operasional WMS harian.
                </p>
                <div class="grid grid-cols-1 gap-4">
                  <div v-for="item in pwaSteps" :key="item.step" class="bg-background rounded-xl p-5 shadow-sm border border-secondary/10 flex gap-5 items-start hover:border-accent/30 transition-colors">
                    <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-lg border border-primary/20">
                      {{ item.step }}
                    </div>
                    <div>
                      <h3 class="font-bold text-text mb-1">{{ item.title }}</h3>
                      <p class="text-sm text-text/70 leading-relaxed">{{ item.desc }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Hotkeys Guide -->
            <section v-if="activeGuide === 'hotkeys'" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-primary/10 text-primary w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-keyboard" />
                </span>
                <span>Jalan Pintas Keyboard (Hotkeys)</span>
              </h2>
              <p class="text-text/70 mb-8 text-sm">Pelajari pintasan ini untuk menguasai navigasi tanpa *mouse*. Sangat efisien untuk Admin input data.</p>

              <div class="space-y-8">
                <div v-for="groupName in ['Navigasi Global', 'Aksi Modal & Tabel']" :key="groupName">
                  <h3 class="text-xs font-bold text-text/40 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <font-awesome-icon icon="fa-solid fa-layer-group" /> {{ groupName }}
                  </h3>
                  <div class="grid grid-cols-1 gap-3">
                    <div v-for="(hotkey, index) in hotkeys.filter(h => h.group === groupName)" :key="index"
                      class="flex flex-col sm:flex-row sm:items-center justify-between bg-background p-4 rounded-xl border border-secondary/10 hover:border-primary/30 transition-all shadow-sm group">
                      <span class="text-sm font-medium text-text/80 order-2 sm:order-1 mt-3 sm:mt-0 group-hover:text-text transition-colors">{{ hotkey.desc }}</span>
                      <div class="flex items-center gap-2 order-1 sm:order-2 shrink-0">
                        <kbd v-for="key in hotkey.keys" :key="key"
                          class="px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-lg text-xs font-mono font-bold text-text shadow-[0_2px_0_hsl(var(--color-secondary)/0.15)] group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                          {{ key }}
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Search Guide -->
            <section v-if="activeGuide === 'search'" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-success/10 text-success w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-search" />
                </span>
                <span>Pencarian Global (Slash)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Setiap halaman modul dengan tabel yang panjang (seperti WMS Dashboard, Manajemen Produk, Paket, dsb) kini dilengkapi dengan integrasi Pencarian Instan.
                </p>
                <div class="bg-background border border-secondary/10 p-5 rounded-xl flex gap-4 items-start mb-6 shadow-sm">
                  <kbd class="px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-lg text-lg font-mono font-bold text-text shadow-[0_3px_0_hsl(var(--color-secondary)/0.15)]">
                    /
                  </kbd>
                  <p class="text-sm pt-1">
                    Tekan tombol <strong>Garis Miring (Slash)</strong> pada *keyboard* Anda di mana saja untuk langsung memfokuskan kursor ke dalam kotak pencarian utama.
                  </p>
                </div>
                <ul class="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>Otomatis Blok:</strong> Saat Anda menekan slash, seluruh teks yang ada di kotak pencarian sebelumnya akan langsung terblokir (*highlighted*), sehingga Anda bisa langsung menimpa teks lama dengan pencarian baru tanpa perlu menekan *backspace*.</li>
                  <li><strong>Aman dari Modal:</strong> Pintasan ini secara pintar dinonaktifkan secara otomatis apabila Anda sedang membuka Modal (seperti Modal Edit atau Modal Retur), sehingga tidak akan tertik secara tidak sengaja di dalam *form*.</li>
                </ul>
              </div>
            </section>

            <!-- Movement Guide -->
            <section v-if="activeGuide === 'movement' && auth.hasPermission('perform-batch-movement')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-primary/10 text-primary w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-truck-fast" />
                </span>
                <span>Panduan Perpindahan Stok (Movement)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Sistem WMS menyediakan dua metode untuk memindahkan stok barang antar rak, lantai, atau gedung, tergantung dari skala pekerjaan Anda.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div class="bg-background border border-secondary/10 p-5 rounded-xl shadow-sm">
                    <h3 class="font-bold text-primary mb-2 flex items-center gap-2"><font-awesome-icon icon="fa-solid fa-box" /> Transfer Satuan (Manual)</h3>
                    <p class="text-sm">Gunakan metode ini jika Anda hanya ingin memindahkan satu jenis barang dalam jumlah kecil.</p>
                    <ul class="list-disc pl-4 mt-2 text-sm text-text/70">
                      <li>Akses dari <strong>Dashboard WMS</strong>.</li>
                      <li>Klik ikon Transfer (panah ganda) pada baris produk.</li>
                      <li>Pilih lokasi tujuan dan kuantitas.</li>
                    </ul>
                  </div>
                  <div class="bg-background border border-secondary/10 p-5 rounded-xl shadow-sm">
                    <h3 class="font-bold text-accent mb-2 flex items-center gap-2"><font-awesome-icon icon="fa-solid fa-boxes-packing" /> Batch Movement</h3>
                    <p class="text-sm">Gunakan metode ini jika Anda perlu memindahkan banyak produk sekaligus antar gedung (skala besar).</p>
                    <ul class="list-disc pl-4 mt-2 text-sm text-text/70">
                      <li>Akses dari menu <strong>WMS Actions > Batch Movement</strong>.</li>
                      <li>Anda bisa *scan barcode* berurutan atau *upload* file CSV/Excel.</li>
                      <li>Meminimalisir kesalahan input manual.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <!-- Stock Opname Guide -->
            <section v-if="activeGuide === 'opname' && auth.hasPermission('manage-stock-adjustment')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-warning/10 text-warning w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-boxes-stacked" />
                </span>
                <span>Panduan Stock Opname (Penyesuaian Massal)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  <em>Stock Opname</em> adalah kegiatan mencocokkan stok fisik di gudang dengan catatan di sistem. Modul <strong>Batch Adjustment</strong> memungkinkan Anda memperbaiki selisih secara massal menggunakan file Excel/CSV.
                </p>
                <div class="bg-warning/5 border border-warning/20 p-4 rounded-xl mb-6">
                  <h4 class="font-bold text-warning mb-2"><font-awesome-icon icon="fa-solid fa-circle-exclamation" /> Aturan Validasi Krusial</h4>
                  <ul class="list-disc pl-5 text-sm">
                    <li>Kuantitas stok <strong>TIDAK BOLEH MINUS</strong>. Sistem akan menolak seluruh file jika ada perhitungan akhir yang menghasilkan stok di bawah 0.</li>
                    <li>Pastikan Anda menggunakan kode <strong>SKU</strong> yang valid. SKU tidak bersifat <em>case-sensitive</em> (huruf besar/kecil dianggap sama).</li>
                  </ul>
                </div>
                <h3 class="font-bold text-text mb-2">Langkah Pelaksanaan:</h3>
                <ol class="list-decimal pl-5 space-y-2 text-sm">
                  <li>Unduh template CSV/Excel dari halaman <strong>WMS Actions > Batch Adjustment</strong>.</li>
                  <li>Isi kolom <code>sku</code>, <code>quantity</code> (jumlah fisik aktual), dan <code>notes</code> (contoh: "Opname Q2 2026").</li>
                  <li>Unggah kembali file tersebut. Sistem akan memverifikasi dan mendeteksi baris mana yang mengalami selisih (kurang/lebih).</li>
                  <li>Jika ada <em>error</em> (seperti SKU tidak ditemukan), perbaiki langsung di layar sebelum memproses penyimpanannya.</li>
                </ol>
              </div>
            </section>

            <!-- Attendance Guide -->
            <section v-if="activeGuide === 'attendance'" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-success/10 text-success w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-clock-rotate-left" />
                </span>
                <span>Sistem Absensi & Koreksi</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Sistem Kehadiran (Absensi) terintegrasi secara *real-time* dengan Jadwal Shift pegawai. Admin HR memiliki wewenang penuh untuk memantau dan memperbaiki anomali kehadiran.
                </p>
                
                <h3 class="font-bold text-text mb-2">Status Kehadiran</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                  <div class="bg-background border border-secondary/10 p-3 rounded-lg"><span class="text-success font-bold block mb-1">Hadir</span> Tepat waktu</div>
                  <div class="bg-background border border-secondary/10 p-3 rounded-lg"><span class="text-warning font-bold block mb-1">Terlambat</span> Melewati batas toleransi</div>
                  <div class="bg-background border border-secondary/10 p-3 rounded-lg"><span class="text-accent font-bold block mb-1">Izin/Sakit</span> Dengan lampiran/catatan</div>
                  <div class="bg-background border border-secondary/10 p-3 rounded-lg"><span class="text-danger font-bold block mb-1">Mangkir</span> Tidak ada kabar</div>
                </div>

                <h3 class="font-bold text-text mb-2">Cara Melakukan Koreksi (Edit Absensi)</h3>
                <p class="text-sm mb-3">Jika terjadi *human error* (seperti lupa *clock-out* atau izin mendadak), HR dapat mengubahnya secara manual:</p>
                <ol class="list-decimal pl-5 space-y-2 text-sm bg-background border border-secondary/10 p-5 rounded-xl">
                  <li>Masuk ke modul <strong>Absensi</strong>.</li>
                  <li>Gunakan filter tanggal dan nama pegawai untuk mencari rekaman yang salah.</li>
                  <li>Klik tombol <strong>Edit (Ikon Pensil)</strong> pada baris bersangkutan.</li>
                  <li>Ubah jam Masuk/Keluar, ubah status, dan <strong>wajib mengisi alasan koreksi</strong> untuk keperluan jejak audit (*audit trail*).</li>
                  <li>Tekan <kbd class="px-2 py-0.5 bg-secondary/10 border border-secondary/20 rounded font-mono text-xs shadow-sm">Alt + S</kbd> untuk menyimpan perubahan.</li>
                </ol>
              </div>
            </section>

            <!-- Manual Return Guide -->
            <section v-if="activeGuide === 'return' && auth.hasPermission('manage-stock-adjustment')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-danger/10 text-danger w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-arrow-rotate-left" />
                </span>
                <span>Pemrosesan Retur (Manual Return)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Fitur <strong>Manual Return</strong> digunakan ketika pelanggan mengembalikan barang (baik dalam kondisi rusak, cacat produksi, atau salah kirim). Sistem mencatat proses ini secara terpisah untuk menjaga keakuratan audit.
                </p>
                <h3 class="font-bold text-text mt-6 mb-2">Alur Kerja Retur</h3>
                <ol class="list-decimal pl-5 space-y-2 text-sm bg-background border border-secondary/10 p-5 rounded-xl">
                  <li><strong>Terima Fisik:</strong> Pastikan barang retur sudah tiba secara fisik di gudang.</li>
                  <li><strong>Akses Modul:</strong> Buka menu WMS Actions > Manual Return.</li>
                  <li><strong>Input Data:</strong> Masukkan nomor referensi pesanan asli (misalnya SO-90210), pilih SKU yang diretur, dan catat kondisi barang.</li>
                  <li><strong>Validasi Stok:</strong> Begitu form disubmit, barang tersebut akan <em>secara otomatis ditambahkan kembali</em> ke stok rak yang dipilih.</li>
                </ol>
                <div class="bg-primary/5 border border-primary/20 p-4 rounded-xl mt-6">
                  <h4 class="font-bold text-primary mb-2">Tips</h4>
                  <p class="text-sm">Biasakan membuat rak khusus (misalnya "Rak Retur/Karantina") untuk menampung barang-barang yang belum jelas status kelayakannya, sebelum dicampur dengan barang dagangan normal.</p>
                </div>
              </div>
            </section>

            <!-- Picking List Guide -->
            <section v-if="activeGuide === 'picking' && auth.hasPermission('upload-picking-list')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-accent/10 text-accent w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-clipboard-list" />
                </span>
                <span>Pemenuhan Pesanan (Picking List)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  <strong>Picking List</strong> adalah daftar barang yang harus diambil oleh petugas gudang untuk memenuhi pesanan pelanggan (Order Fulfillment). Anda dapat mengunggah file pesanan harian dari e-Commerce/ERP untuk diproses massal.
                </p>
                <ul class="list-disc pl-5 space-y-3 text-sm">
                  <li><strong>Upload File:</strong> Gunakan file Excel/CSV dengan format <code>order_id</code>, <code>sku</code>, <code>quantity</code>.</li>
                  <li><strong>Validasi Sistem:</strong> Sistem otomatis akan mengecek apakah stok mencukupi untuk memenuhi pesanan tersebut.</li>
                  <li><strong>Eksekusi (Pengambilan):</strong> Setelah dieksekusi, stok secara sistem akan dipotong (berkurang) secara otomatis.</li>
                </ul>
                <div class="bg-warning/5 border border-warning/20 p-4 rounded-xl mt-6">
                  <h4 class="font-bold text-warning mb-2"><font-awesome-icon icon="fa-solid fa-triangle-exclamation" /> Peringatan Stok Tidak Cukup</h4>
                  <p class="text-sm">Sistem akan memblokir proses pemenuhan jika kuantitas pesanan melebihi stok yang ada di gudang. Anda harus melakukan restock (inbound) terlebih dahulu sebelum dapat melanjutkan picking list pesanan tersebut.</p>
                </div>
              </div>
            </section>

            <!-- Package Management Guide -->
            <section v-if="activeGuide === 'package' && auth.hasPermission('manage-products')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-primary/10 text-primary w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-cubes-stacked" />
                </span>
                <span>Manajemen Paket (Bundling)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Sistem membedakan antara <strong>Unit Tunggal (Produk)</strong> dan <strong>Paket (Bundling)</strong>. Manajemen Paket memungkinkan Anda membuat SKU baru yang berisi gabungan dari beberapa produk tunggal.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div class="bg-background border border-secondary/10 p-4 rounded-lg">
                    <h4 class="font-bold text-text mb-1">Contoh Unit</h4>
                    <ul class="list-disc pl-4 text-sm text-text/70">
                      <li>Sabun Mandi (SKU: SBN-01)</li>
                      <li>Shampoo (SKU: SMP-01)</li>
                    </ul>
                  </div>
                  <div class="bg-background border border-secondary/10 p-4 rounded-lg">
                    <h4 class="font-bold text-text mb-1">Contoh Paket</h4>
                    <ul class="list-disc pl-4 text-sm text-text/70">
                      <li>Paket Mandi Keluarga (SKU: PKT-01)</li>
                      <li>Berisi: 3x Sabun, 1x Shampoo</li>
                    </ul>
                  </div>
                </div>
                <p class="mt-4 text-sm">
                  Ketika Anda menjual "Paket", pastikan sistem logistik (di ERP) telah memotong stok komponen penyusunnya dengan benar. Modul Paket mempermudah Anda mendefinisikan *Bill of Materials* (BOM) sederhana.
                </p>
              </div>
            </section>

            <!-- Media Linking Guide -->
            <section v-if="activeGuide === 'media' && auth.hasPermission('product.image.view')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-accent/10 text-accent w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-image" />
                </span>
                <span>Batch Linking Media</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Untuk mengaitkan gambar produk (foto/video) ke ribuan SKU sekaligus, kami merancang fitur <strong>Batch Linking</strong> pada Modul Media agar sistem tidak terbebani.
                </p>
                <ol class="list-decimal pl-5 space-y-2 text-sm bg-background border border-secondary/10 p-5 rounded-xl">
                  <li>Pilih satu atau lebih file media di galeri.</li>
                  <li>Tekan opsi <strong>Link to Products</strong>.</li>
                  <li>Cari dan beri centang pada semua produk yang relevan (Multi-select).</li>
                  <li>Sistem akan memprosesnya di latar belakang (*asynchronously*) sehingga layar Anda tidak akan membeku (*freeze*).</li>
                </ol>
              </div>
            </section>

            <!-- Shift Guide -->
            <section v-if="activeGuide === 'shift' && auth.hasPermission('manage-users')" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-warning/10 text-warning w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-calendar-alt" />
                </span>
                <span>Manajemen Jadwal & Shift (HR)</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Setiap pegawai harus memiliki jam kerja (Shift) yang telah diatur oleh sistem agar Modul Absensi dapat menghitung durasi kerja dan tingkat keterlambatan secara otomatis.
                </p>
                <h3 class="font-bold text-text mt-4 mb-2">Langkah Pengaturan Shift</h3>
                <ul class="list-disc pl-5 space-y-2 text-sm bg-background border border-secondary/10 p-5 rounded-xl">
                  <li><strong>Buat Pola Shift:</strong> Akses menu <code>Admin Panel > Shifts</code>. Buat pola shift dasar (contoh: Shift Pagi 08:00 - 16:00, Shift Malam 20:00 - 04:00).</li>
                  <li><strong>Jadwalkan Pegawai:</strong> Akses menu <code>Admin Panel > Schedules</code>. Pasangkan ID Pegawai dengan Shift yang telah dibuat beserta tanggal efektifnya.</li>
                </ul>
              </div>
            </section>

            <!-- Theme Guide -->
            <section v-if="activeGuide === 'theme'" class="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-sm">
              <h2 class="text-2xl font-bold text-text mb-4 flex items-center gap-3 border-b border-secondary/10 pb-4">
                <span class="bg-accent/10 text-accent w-10 h-10 rounded-xl flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-palette" />
                </span>
                <span>Mengubah Tema Tampilan</span>
              </h2>
              
              <div class="prose prose-sm max-w-none text-text/80 leading-relaxed">
                <p class="mb-4">
                  Aplikasi WMS & HRIS mendukung beberapa tema visual untuk kenyamanan kerja Anda. Tema berlaku secara global dan tersimpan di perangkat Anda.
                </p>
                <h3 class="font-bold text-text mt-4 mb-2">Cara Ganti Tema</h3>
                <ol class="list-decimal pl-5 space-y-2 text-sm bg-background border border-secondary/10 p-5 rounded-xl">
                  <li>Klik ikon <strong>profil</strong> (nama Anda) di pojok kanan atas.</li>
                  <li>Pada bagian bawah dropdown, Anda akan melihat pilihan <strong>Theme Switcher</strong>.</li>
                  <li>Klik untuk mengganti tema secara bergiliran. Atau tekan <kbd class="px-1.5 py-0.5 bg-secondary/20 rounded text-xs font-mono">Alt + T</kbd> dari halaman manapun.</li>
                </ol>
                <h3 class="font-bold text-text mt-6 mb-2">Tema yang Tersedia</h3>
                <ul class="list-disc pl-5 space-y-2 text-sm bg-background border border-secondary/10 p-5 rounded-xl">
                  <li><strong>Light:</strong> Tema terang standar, cocok untuk lingkungan dengan pencahayaan normal.</li>
                  <li><strong>Dark:</strong> Tema gelap untuk mengurangi kelelahan mata saat bekerja malam atau di ruangan minim cahaya.</li>
                  <li><strong>Sepia:</strong> Tema hangat kecokelatan yang nyaman untuk membaca data dalam waktu lama.</li>
                </ul>
              </div>
            </section>

          </div>
        </div>
      </div>

      <!-- TAB CONTENT: FAQ -->
      <div v-show="activeTab === 'faq'" class="animate-fade-in max-w-4xl space-y-8">

        <div v-for="(cat, catIdx) in faqCategories" :key="catIdx">
          <h3 class="text-sm font-bold text-text/40 uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
            <font-awesome-icon :icon="cat.icon" class="opacity-60" /> {{ cat.label }}
          </h3>

          <div class="space-y-3">
            <div v-for="(item, itemIdx) in cat.items" :key="itemIdx"
              class="bg-secondary/5 border border-secondary/10 rounded-xl overflow-hidden transition-all"
              :class="openFaqIndex === `${catIdx}-${itemIdx}` ? 'border-primary/30 shadow-sm' : 'hover:border-secondary/30'">

              <!-- Question Button -->
              <button @click="toggleFaq(`${catIdx}-${itemIdx}`)"
                class="w-full text-left px-5 py-4 flex items-center justify-between gap-4 group">
                <span class="font-bold text-text text-sm leading-relaxed">{{ item.q }}</span>
                <font-awesome-icon icon="fa-solid fa-chevron-down"
                  class="text-text/30 shrink-0 transition-transform duration-300"
                  :class="openFaqIndex === `${catIdx}-${itemIdx}` ? 'rotate-180 text-primary' : 'group-hover:text-text/50'" />
              </button>

              <!-- Answer (Collapsible) -->
              <div class="grid transition-all duration-300 ease-in-out"
                :class="openFaqIndex === `${catIdx}-${itemIdx}` ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'">
                <div class="overflow-hidden">
                  <p class="px-5 pb-4 text-sm text-text/70 leading-relaxed border-t border-secondary/10 pt-3">
                    {{ item.a }}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
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
