<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import * as fabric from 'fabric'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  variables: {
    type: Object,
    default: () => ({})
  },
  paperSize: {
    type: String,
    default: '80x40'
  }
})

const canvasRef = ref(null)
let staticCanvas = null

let renderTimeout = null
let isRendering = false
let pendingRender = false

const performRender = async () => {
  console.log('[DEBUG-RENDER] performRender started. canvasRef:', !!canvasRef.value, 'isRendering:', isRendering)
  if (!canvasRef.value) return
  if (isRendering) {
    console.log('[DEBUG-RENDER] isRendering is true, queueing pendingRender')
    pendingRender = true
    return
  }

  isRendering = true
  try {
    console.log('[DEBUG-RENDER] Lock acquired. Initializing canvas...')
    const [widthMm, heightMm] = props.paperSize.split('x').map(Number)
    const pxPerMm = 7.55
    const canvasWidth = Math.round(widthMm * pxPerMm) || 604
    const canvasHeight = Math.round(heightMm * pxPerMm) || 302

    if (!staticCanvas) {
      staticCanvas = new fabric.StaticCanvas(canvasRef.value, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff'
      })
    } else {
      staticCanvas.setDimensions({ width: canvasWidth, height: canvasHeight })
    }

    const configClone = JSON.parse(JSON.stringify(props.config))
    console.log('[DEBUG-RENDER] Loading JSON into staticCanvas...')

    await new Promise((resolveRender) => {
      staticCanvas
        .loadFromJSON(configClone)
        .then(() => {
          console.log('[DEBUG-RENDER] JSON loaded. Processing objects...')
          staticCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
          staticCanvas.setZoom(1)
          staticCanvas.backgroundColor = '#ffffff'

          staticCanvas.getObjects().forEach(obj => {
            if (obj.type === 'rect' && obj.fill === '#ffffff' && obj.left === 0 && obj.top === 0) {
              staticCanvas.remove(obj)
            }
          })

          const objects = staticCanvas.getObjects()
          if (configClone && configClone.objects) {
            configClone.objects.forEach((rawObj, index) => {
              if (rawObj.isDynamicBarcode && objects[index]) {
                objects[index].set({
                  isDynamicBarcode: rawObj.isDynamicBarcode,
                  barcodeType: rawObj.barcodeType,
                  barcodeValue: rawObj.barcodeValue,
                  barcodeDisplayValue: rawObj.barcodeDisplayValue
                })
              }
            })
          }

          const promises = []
          staticCanvas.getObjects().forEach(obj => {
            if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
              let text = obj.text
              if (text) {
                text = text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
                  return props.variables[varName] !== undefined ? props.variables[varName] : match
                })
                obj.set('text', text)
              }
            } else if (obj.isDynamicBarcode) {
              let barcodeVal = obj.barcodeValue || ''
              barcodeVal = barcodeVal.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
                return props.variables[varName] !== undefined ? props.variables[varName] : match
              })
              console.log('[DEBUG-RENDER] Generating barcode for value:', barcodeVal)

              promises.push(
                new Promise(resolve => {
                  ;(async () => {
                    try {
                      let dataUrl = ''
                      if (obj.barcodeType === 'qrcode') {
                        dataUrl = await QRCode.toDataURL(barcodeVal || ' ', { errorCorrectionLevel: 'M', margin: 2 })
                      } else {
                        const canvas = document.createElement('canvas')
                        JsBarcode(canvas, barcodeVal || ' ', {
                          format: 'CODE128',
                          displayValue: obj.barcodeDisplayValue,
                          margin: 10,
                          background: '#ffffff',
                          lineColor: '#000000'
                        })
                        dataUrl = canvas.toDataURL('image/png')
                      }

                      const setSrcResult = obj.setSrc(dataUrl, () => {
                        console.log('[DEBUG-RENDER] Barcode image loaded via callback')
                        resolve()
                      })
                      
                      // FabricJS 6+ returns a Promise instead of using a callback
                      if (setSrcResult && typeof setSrcResult.then === 'function') {
                        setSrcResult
                          .then(() => {
                            console.log('[DEBUG-RENDER] Barcode image loaded via Promise')
                            resolve()
                          })
                          .catch(err => {
                            console.error('[DEBUG-RENDER] setSrc Promise failed:', err)
                            resolve()
                          })
                      }
                    } catch (err) {
                      console.error('Barcode generation error:', err)
                      resolve()
                    }
                  })()
                })
              )
            }
          })

          console.log('[DEBUG-RENDER] Waiting for', promises.length, 'promises to resolve...')
          Promise.all(promises).then(() => {
            console.log('[DEBUG-RENDER] Promises resolved, rendering all.')
            staticCanvas.renderAll()
            resolveRender()
          })
        })
        .catch(err => {
          console.error('[DEBUG-RENDER] Failed to load fabric JSON', err)
          resolveRender()
        })
    })
  } catch (err) {
    console.error('[DEBUG-RENDER] Fatal error in performRender:', err)
  } finally {
    console.log('[DEBUG-RENDER] Lock released. pendingRender:', pendingRender)
    isRendering = false
    if (pendingRender) {
      pendingRender = false
      performRender()
    }
  }
}

const renderSticker = () => {
  if (renderTimeout) clearTimeout(renderTimeout)
  renderTimeout = setTimeout(() => {
    performRender()
  }, 150) // 150ms debounce
}

watch(
  () => [props.config, props.variables],
  () => {
    renderSticker()
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    renderSticker()
  })
})

const getDataURL = () => {
  if (staticCanvas) {
    return staticCanvas.toDataURL({ format: 'png', multiplier: 2 })
  }
  return null
}

defineExpose({
  getDataURL
})
</script>

<template>
  <div class="dynamic-sticker-wrapper">
    <!-- Skala diperkecil karena canvas asli 604x302 (resolusi 2x) -->
    <!-- Untuk menyesuaikan CSS wrapper 80x40mm (sekitar 302x151px), kita set lebar 100% -->
    <canvas ref="canvasRef" style="width: 100%; height: 100%; object-fit: contain"></canvas>
  </div>
</template>

<style scoped>
.dynamic-sticker-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Force fabric.js canvas to scale responsively */
.dynamic-sticker-wrapper :deep(canvas) {
  max-width: 100% !important;
  height: auto !important;
  object-fit: contain;
}
</style>
