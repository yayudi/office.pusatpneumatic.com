<template>
  <form @submit.prevent="handleSubmit" enctype="multipart/form-data" class="flex items-center gap-4 w-full sm:w-auto">
    <input
      type="file"
      :accept="accept"
      class="block w-full text-sm text-gray-700
             file:mr-2 file:py-1 file:px-2
             file:rounded-md file:border-0 file:text-sm file:font-semibold
             file:bg-blue-100 file:text-blue-700
             hover:file:bg-blue-200"
      @change="onFileChange"
    />

    <button
      type="submit"
      :disabled="loading || !file"
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm whitespace-nowrap
             disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ loading ? "Uploading..." : submitLabel }}
    </button>
  </form>
</template>

<script setup>
import { ref } from "vue"

const props = defineProps({
  accept: {
    type: String,
    default: ".csv" // bisa diubah misal: ".jpg,.png,.pdf"
  },
  submitLabel: {
    type: String,
    default: "Upload"
  }
})

const emit = defineEmits(["submit"])

const file = ref(null)
const loading = ref(false)

function onFileChange(e) {
  file.value = e.target.files[0] || null
}

async function handleSubmit() {
  if (!file.value) return
  loading.value = true
  try {
    const formData = new FormData()
    formData.append("file", file.value)
    emit("submit", formData) // biar parent yang handle API call
  } catch (err) {
    console.error("UploadForm error:", err)
  } finally {
    loading.value = false
  }
}
</script>
