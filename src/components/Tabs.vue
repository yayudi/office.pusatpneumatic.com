<template>
  <div class="flex border rounded-md overflow-hidden w-fit">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      @click="selectTab(tab.value)"
      class="px-4 py-2 font-semibold text-sm transition-colors duration-200"
      :class="[
        modelValue === tab.value
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      ]"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  tabs: {
    type: Array,
    required: true,
    // contoh: [{ label: "Ringkasan", value: "summary" }, { label: "Detail Log", value: "detail" }]
  },
  modelValue: {
    type: String,
    required: true
  }
})

const emit = defineEmits(["update:modelValue"])

function selectTab(value) {
  emit("update:modelValue", value)
}
</script>
