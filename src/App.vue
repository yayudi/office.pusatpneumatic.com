<template>
  <div id="app">
    <!-- global toast -->
    <MessageToast ref="toast" />
    <!-- halaman berubah via router -->
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick  } from "vue"
import MessageToast from "@/components/MessageToast.vue"
import { registerToast } from "@/composables/UseToast.js"
const toast = ref(null)

onMounted(async () => {
  await nextTick()
  // pass instance komponen, bukan DOM
  if (toast.value) {
    registerToast(toast.value)
  } else {
    console.warn("⚠️ Toast instance belum siap")
  }
})
</script>

<style>
/* pindahin ke src/assets/main.css kalau bisa */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}
</style>
