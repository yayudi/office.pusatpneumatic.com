<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'

const isSidebarOpen = ref(false)
const isDesktopSidebarCollapsed = ref(false)
</script>

<template>
  <div class="flex font-sans text-text">
    <!-- Mobile Backdrop -->
    <div
      v-if="isSidebarOpen"
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
    ></div>

    <!-- Sidebar -->
    <aside
      class="fixed md:sticky top-12 bottom-0 left-0 md:h-[calc(100vh-3rem)] z-50 bg-background border-r border-secondary/20 transform transition-all duration-300 ease-in-out flex flex-col shadow-lg md:shadow-none overflow-y-auto"
      :class="[
        isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
        isDesktopSidebarCollapsed ? 'md:w-20' : 'md:w-64'
      ]"
    >
      <!-- Logo / Header -->
      <div
        class="p-6 border-b border-secondary/20 flex items-center bg-secondary/5 h-[72px]"
        :class="isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between'"
      >
        <h2
          class="text-xl font-bold text-text flex items-center gap-3 transition-opacity duration-200"
          :class="isDesktopSidebarCollapsed ? 'hidden' : 'block'"
        >
          <font-awesome-icon icon="fa-solid fa-screwdriver-wrench" class="text-primary" />
          <span>Panel Admin</span>
        </h2>
        <!-- Close button for mobile -->
        <button
          @click="isSidebarOpen = false"
          class="md:hidden text-text/60 hover:text-danger p-1 rounded-md transition-colors"
        >
          <font-awesome-icon icon="fa-solid fa-xmark" size="lg" />
        </button>
        <!-- Toggle button for desktop -->
        <button
          @click="isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed"
          class="hidden md:flex text-text/60 hover:text-primary p-2 rounded-lg transition-colors hover:bg-secondary/10"
          :class="isDesktopSidebarCollapsed ? 'mx-auto' : ''"
          title="Toggle Sidebar"
        >
          <font-awesome-icon
            :icon="isDesktopSidebarCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'"
            size="lg"
          />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        <div
          class="py-4 border-t border-secondary transition-all duration-300"
          :class="isDesktopSidebarCollapsed ? 'px-2 flex flex-col items-center' : 'px-4 pr-6'"
        >
          <span
            class="font-bold text-text/40 uppercase tracking-wider block mb-2 transition-all duration-300"
            :class="isDesktopSidebarCollapsed ? 'text-[10px] text-center w-full truncate' : 'text-xs'"
            :title="isDesktopSidebarCollapsed ? 'Manajemen' : ''"
          >
            {{ isDesktopSidebarCollapsed ? '...' : 'Manajemen' }}
          </span>

          <div class="space-y-1 w-full">
            <router-link
              to="/admin/users"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Pengguna"
            >
              <font-awesome-icon icon="fa-solid fa-users" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Pengguna</span
              >
            </router-link>

            <router-link
              to="/admin/roles"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Peran & Izin"
            >
              <font-awesome-icon icon="fa-solid fa-user-shield" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Peran & Izin</span
              >
            </router-link>

            <router-link
              to="/admin/shifts"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Master Shift"
            >
              <font-awesome-icon icon="fa-solid fa-clock" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Master Shift</span
              >
            </router-link>

            <router-link
              to="/admin/schedules"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Kalender Shift"
            >
              <font-awesome-icon icon="fa-solid fa-calendar-alt" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Kalender Shift</span
              >
            </router-link>
          </div>
        </div>

        <div
          class="py-4 border-t border-secondary transition-all duration-300"
          :class="isDesktopSidebarCollapsed ? 'px-2 flex flex-col items-center' : 'px-4 pr-6'"
        >
          <span
            class="font-bold text-text/40 uppercase tracking-wider block mb-2 transition-all duration-300"
            :class="isDesktopSidebarCollapsed ? 'text-[10px] text-center w-full truncate' : 'text-xs'"
            :title="isDesktopSidebarCollapsed ? 'Inventaris' : ''"
          >
            {{ isDesktopSidebarCollapsed ? '...' : 'Inventaris' }}
          </span>

          <div class="space-y-1 w-full">
            <router-link
              to="/admin/products"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Produk"
            >
              <font-awesome-icon icon="fa-solid fa-box-archive" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Produk</span
              >
            </router-link>

            <router-link
              to="/admin/packages"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Paket"
            >
              <font-awesome-icon icon="fa-solid fa-boxes-stacked" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Paket</span
              >
            </router-link>

            <router-link
              to="/admin/locations"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Lokasi"
            >
              <font-awesome-icon icon="fa-solid fa-map-location-dot" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Lokasi</span
              >
            </router-link>

            <router-link
              to="/admin/categories"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Kategori"
            >
              <font-awesome-icon icon="fa-solid fa-tags" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Kategori</span
              >
            </router-link>

            <router-link
              to="/admin/sales-channels"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Saluran / Toko"
            >
              <font-awesome-icon icon="fa-solid fa-store" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Saluran / Toko</span
              >
            </router-link>
          </div>
        </div>

        <div
          class="py-4 border-t border-secondary transition-all duration-300"
          :class="isDesktopSidebarCollapsed ? 'px-2 flex flex-col items-center' : 'px-4 pr-6'"
        >
          <span
            class="font-bold text-text/40 uppercase tracking-wider block mb-2 transition-all duration-300"
            :class="isDesktopSidebarCollapsed ? 'text-[10px] text-center w-full truncate' : 'text-xs'"
            :title="isDesktopSidebarCollapsed ? 'Sistem' : ''"
          >
            {{ isDesktopSidebarCollapsed ? '...' : 'Sistem' }}
          </span>

          <div class="space-y-1 w-full">
            <router-link
              to="/admin/reports"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Laporan"
            >
              <font-awesome-icon icon="fa-solid fa-chart-line" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Laporan</span
              >
            </router-link>

            <router-link
              to="/admin/logs"
              class="nav-item overflow-hidden"
              active-class="active"
              @click="isSidebarOpen = false"
              :class="isDesktopSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'"
              title="Log Aktivitas"
            >
              <font-awesome-icon icon="fa-solid fa-clipboard-list" class="w-5 shrink-0" />
              <span
                class="transition-opacity duration-200 whitespace-nowrap"
                :class="isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'"
                >Log Aktivitas</span
              >
            </router-link>
          </div>
        </div>
      </nav>
    </aside>

    <!-- Main Content Wrapper -->
    <div class="flex-1 flex flex-col min-w-0 transition-all duration-300">
      <!-- Mobile Header -->
      <header
        class="md:hidden bg-background border-t border-secondary/20 flex items-center justify-between sticky top-12 z-10 shadow-sm p-4"
      >
        <button
          @click="isSidebarOpen = !isSidebarOpen"
          class="p-2 -ml-2 text-text/70 hover:text-primary rounded-lg hover:bg-secondary/10 transition-colors"
        >
          <font-awesome-icon icon="fa-solid fa-bars" size="lg" />
        </button>
        <span class="font-bold text-text truncate">Admin Panel</span>
        <div class="w-8"></div>
        <!-- Spacer for balance -->
      </header>

      <!-- Page Content -->
      <main class="flex-1 lg:px-6 overflow-x-hidden w-full">
        <div class="max-w-7xl">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.nav-item {
  @apply flex items-center py-2.5 text-sm font-medium rounded-lg text-text/70 hover:bg-secondary/20 hover:text-primary transition-all duration-200;
}

.nav-item.active {
  @apply bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20;
}
</style>
