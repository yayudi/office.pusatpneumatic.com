<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import * as fabric from 'fabric';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  line1: {
    type: String,
    default: ''
  },
  line2: {
    type: String,
    default: ''
  }
});

const canvasRef = ref(null);
let staticCanvas = null;

const renderSticker = () => {
  if (!canvasRef.value) return;
  if (!staticCanvas) {
    staticCanvas = new fabric.StaticCanvas(canvasRef.value, {
      width: 604,
      height: 302,
      backgroundColor: '#ffffff'
    });
  }
  
  // Clone config to prevent mutating the original prop
  const configClone = JSON.parse(JSON.stringify(props.config));
  
  staticCanvas.loadFromJSON(configClone, () => {
    // Traverse objects and replace variables
    staticCanvas.getObjects().forEach(obj => {
      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
        let text = obj.text;
        if (text) {
          text = text.replace(/\{\{\s*line1\s*\}\}/g, props.line1);
          text = text.replace(/\{\{\s*line2\s*\}\}/g, props.line2);
          obj.set('text', text);
        }
      }
    });
    staticCanvas.renderAll();
  });
};

watch(() => [props.config, props.line1, props.line2], () => {
  renderSticker();
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    renderSticker();
  });
});
</script>

<template>
  <div class="dynamic-sticker-wrapper">
    <!-- Skala diperkecil karena canvas asli 604x302 (resolusi 2x) -->
    <!-- Untuk menyesuaikan CSS wrapper 80x40mm (sekitar 302x151px), kita set lebar 100% -->
    <canvas ref="canvasRef" style="width: 100%; height: 100%; object-fit: contain;"></canvas>
  </div>
</template>

<style scoped>
.dynamic-sticker-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
