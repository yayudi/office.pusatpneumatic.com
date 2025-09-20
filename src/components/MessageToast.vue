<!-- components/MessageToast.vue -->
<template>
  <div class="fixed top-5 right-5 space-y-2 z-50">
    <transition-group name="fade" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'px-4 py-2 text-sm font-medium text-white rounded-md shadow-lg',
          toast.typeClass
        ]"
      >
        {{ toast.message }}
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref } from "vue"

const toasts = ref([])

let idCounter = 0

const showMessage = (msg, type = "info", duration = 3000) => {
  const id = ++idCounter
  const typeClass =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-blue-600"

  const toast = { id, message: msg, typeClass }
  toasts.value.push(toast)

  // auto remove
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

defineExpose({ showMessage })
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
