<!-- home.vue -->
<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-blue-600 text-white p-4 flex justify-between items-center">
      <h2 class="text-xl font-bold">Dashboard</h2>
      <button
        @click="handleLogout"
        class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold"
      >
        Logout
      </button>
    </header>

    <!-- Main content -->
    <main class="p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Menu Utama</h3>

      <!-- Menu links -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <!-- Pernataan -->
        <router-link
          to="/pernataan"
          class="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center hover:shadow-lg transition"
        >
          <span class="text-blue-600 text-3xl mb-2">📦</span>
          <p class="font-medium">Pernataan (Inventory Stock Search)</p>
        </router-link>

        <!-- Absensi -->
        <router-link
          to="/absensi"
          class="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center hover:shadow-lg transition"
        >
          <span class="text-green-600 text-3xl mb-2">🕒</span>
          <p class="font-medium">Absensi</p>
        </router-link>

        <!-- Warehouse Management -->
        <div
          class="bg-gray-200 text-gray-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-not-allowed"
        >
          <span class="text-gray-500 text-3xl mb-2">🏭</span>
          <p class="font-medium">Warehouse Management (Upcoming)</p>
        </div>
      </div>

      <!-- Produk -->
      <h3 class="text-lg font-semibold text-gray-800 mb-2">Daftar Produk</h3>
      <ul class="space-y-2">
        <li
          v-for="p in products"
          :key="p.id"
          class="bg-white p-4 rounded-lg shadow-sm flex justify-between"
        >
          <span>{{ p.name }}</span>
          <span class="text-sm text-gray-600">Stock: {{ p.stock }}</span>
        </li>
      </ul>

      <!-- Error -->
      <p v-if="error" class="text-red-600 mt-4">{{ error }}</p>
    </main>
  </div>
</template>

<script>
import api from "../api/axios";
import { logout } from "../api/auth";

export default {
  data() {
    return {
      products: [],
      error: ""
    };
  },
  async mounted() {
    try {
      const res = await api.get("/products");
      this.products = res.data.data;
    } catch (err) {
      this.error = "Gagal ambil produk";
    }
  },
  methods: {
    async handleLogout() {
      const success = await logout();
      if (success) {
        this.$router.push("/login");
      } else {
        alert("Logout gagal, coba lagi.");
      }
    },
  },
};
</script>
