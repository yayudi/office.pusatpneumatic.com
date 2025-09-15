<template>
  <div
    v-if="visible"
    :class="['fixed top-5 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-medium text-white rounded-md shadow-lg z-50 transition-opacity duration-500',
      typeClass]"
  >
    {{ message }}
  </div>
</template>

<script setup>
import { ref } from "vue"

const message = ref("")
const visible = ref(false)
const typeClass = ref("bg-blue-600")

const showMessage = (msg, type = "info", duration = 3000) => {
  message.value = msg
  typeClass.value =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-blue-600"

  visible.value = true
  setTimeout(() => (visible.value = false), duration)
}

// expose supaya bisa dipanggil dari luar
defineExpose({ showMessage })
</script>
