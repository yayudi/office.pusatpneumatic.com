<!-- login.vue -->
<template>
  <div class="flex h-screen items-center justify-center bg-gray-100">
    <div class="w-full max-w-sm bg-white p-6 rounded-xl shadow-md">
      <h2 class="text-2xl font-bold text-center mb-6">Login</h2>

      <form @submit.prevent="login" class="space-y-4">
        <input
          v-model="username"
          type="text"
          placeholder="Username"
          class="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300"
          required
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-300"
          required
        />
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? "Loading..." : "Login" }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 mt-3 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import api from "../api/axios.js"
import { useToast } from "../composables/UseToast.js"

const username = ref("")
const password = ref("")
const error = ref("")
const loading = ref(false)

const router = useRouter()
const { show } = useToast()

async function login() {
  loading.value = true
  error.value = ""
  try {
    const res = await api.post("/auth/login", {
      username: username.value,
      password: password.value,
    })

    if (res.data.success) {
      show("Login berhasil 🚀", "success")
      router.push("/home")
    } else {
      error.value = res.data.message
      show(res.data.message || "Username/password salah ❌", "error")
    }
  } catch (err) {
    error.value = "Server error!"
    show("Server error! ⚠️", "error")
  } finally {
    loading.value = false
  }
}
</script>
