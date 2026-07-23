import { ref } from 'vue'

export function useStickerHistory(getFabricCanvas, syncLayers) {
  const historyStack = ref([])
  const historyIndex = ref(-1)
  let isHistoryProcessing = false
  let historyTimeout = null

  const saveHistory = () => {
    const canvas = getFabricCanvas()
    if (!canvas || isHistoryProcessing) return

    clearTimeout(historyTimeout)
    historyTimeout = setTimeout(() => {
      if (!canvas || isHistoryProcessing) return
      const json = canvas.toJSON([
        'id',
        'selectable',
        'evented',
        'hasControls',
        'lockMovementX',
        'lockMovementY',
        'lockRotation',
        'lockScalingX',
        'lockScalingY'
      ])
      const objects = canvas.getObjects()
      if (json.objects) {
        json.objects.forEach((rawObj, index) => {
          const obj = objects[index]
          if (obj && obj.isDynamicBarcode) {
            rawObj.isDynamicBarcode = obj.isDynamicBarcode
            rawObj.barcodeType = obj.barcodeType
            rawObj.barcodeValue = obj.barcodeValue
            rawObj.barcodeDisplayValue = obj.barcodeDisplayValue
          }
        })
      }
      const jsonString = JSON.stringify(json)

      if (historyIndex.value >= 0 && historyStack.value[historyIndex.value] === jsonString) {
        return
      }

      if (historyIndex.value < historyStack.value.length - 1) {
        historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
      }

      historyStack.value.push(jsonString)
      if (historyStack.value.length > 50) {
        historyStack.value.shift()
      } else {
        historyIndex.value++
      }
    }, 100)
  }

  const undo = () => {
    if (historyIndex.value > 0) {
      isHistoryProcessing = true
      historyIndex.value--
      loadHistoryState(historyStack.value[historyIndex.value])
    }
  }

  const redo = () => {
    if (historyIndex.value < historyStack.value.length - 1) {
      isHistoryProcessing = true
      historyIndex.value++
      loadHistoryState(historyStack.value[historyIndex.value])
    }
  }

  const loadHistoryState = jsonString => {
    const canvas = getFabricCanvas()
    if (!canvas) return
    const parsed = JSON.parse(jsonString)
    canvas.loadFromJSON(parsed).then(() => {
      const objects = canvas.getObjects()
      if (parsed && parsed.objects) {
        parsed.objects.forEach((rawObj, index) => {
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
      isHistoryProcessing = false
      canvas.requestRenderAll()
      syncLayers()
    })
  }

  return {
    historyStack,
    historyIndex,
    saveHistory,
    undo,
    redo
  }
}
