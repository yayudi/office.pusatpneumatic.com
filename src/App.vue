<template>
  <div id="app">
    <MessageToast ref="toast" />
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import MessageToast from "./components/MessageToast.vue"
import { registerToast } from "./composables/UseToast.js"

const toast = ref(null)

onMounted(() => {
  registerToast(toast.value)
})
</script>

<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}
</style>
