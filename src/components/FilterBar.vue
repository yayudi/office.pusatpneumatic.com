<!-- FilterBar.vue -->
<template>
  <div class="flex flex-wrap gap-4 items-center bg-white p-3 rounded-lg shadow border">
    <template v-for="(filter, index) in filters" :key="index">
      <!-- Text Input -->
      <div v-if="filter.type === 'text'" class="flex items-center gap-2">
        <label v-if="filter.label" :for="filter.key" class="text-sm font-medium text-gray-600 whitespace-nowrap">
          {{ filter.label }}:
        </label>
        <input
          :id="filter.key"
          type="text"
          :placeholder="filter.placeholder || ''"
          class="px-3 py-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
          v-model="localValues[filter.key]"
          @input="emitChange"
        />
      </div>

      <!-- Select -->
      <div v-else-if="filter.type === 'select'" class="flex items-center gap-2">
        <label v-if="filter.label" :for="filter.key" class="text-sm font-medium text-gray-600 whitespace-nowrap">
          {{ filter.label }}:
        </label>
        <select
          :id="filter.key"
          class="px-3 py-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
          v-model="localValues[filter.key]"
          @change="emitChange"
        >
          <option v-for="opt in filter.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Date -->
      <div v-else-if="filter.type === 'date'" class="flex items-center gap-2">
        <label v-if="filter.label" :for="filter.key" class="text-sm font-medium text-gray-600 whitespace-nowrap">
          {{ filter.label }}:
        </label>
        <input
          :id="filter.key"
          type="date"
          class="px-3 py-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
          v-model="localValues[filter.key]"
          @input="emitChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue"

const props = defineProps({
  filters: {
    type: Array,
    required: true,
    // contoh: [{ type:"text", key:"name", label:"Nama", placeholder:"Cari nama..." }]
  },
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(["update:modelValue", "change"])

// bikin local copy supaya reactive
const localValues = reactive({ ...props.modelValue })

// kalau parent update modelValue, sync ke local
watch(() => props.modelValue, (val) => {
  Object.assign(localValues, val)
}, { deep: true })

function emitChange() {
  emit("update:modelValue", { ...localValues })
  emit("change", { ...localValues })
}
</script>
