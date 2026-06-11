<script setup>
import { swalAlert } from '@/composables/useSweetAlert'
import { ref, onMounted, onUnmounted, watch, shallowRef, computed } from 'vue'
import * as fabric from 'fabric'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MediaPickerModal from '@/components/shared/MediaPickerModal.vue'
import { resolveUrl } from '@/composables/useImageUrl'

const props = defineProps({
  show: Boolean,
  initialTemplate: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const canvasEl = ref(null)
let fabricCanvas = null

const templateName = ref('')
const isSaving = ref(false)

const isMediaPickerOpen = ref(false)
const isBarcodeModalOpen = ref(false)
const barcodeConfig = ref({
  type: 'barcode', // 'barcode' or 'qrcode'
  value: '{{ sku }}',
  displayValue: true
})
const isDynamicMenuOpen = ref(false)

const paperWidth = ref(80)
const paperHeight = ref(40)

const canvasWrapper = ref(null)
const canvasZoom = ref(1)
const minimapUrl = ref('')
const minimapRect = ref({ left: 0, top: 0, width: 100, height: 100 })

const minimapImgWidth = computed(() => {
  const w = paperWidth.value
  const h = paperHeight.value
  const maxW = 256
  const maxH = 128
  const ratio = Math.min(maxW / w, maxH / h)
  return w * ratio
})

const minimapImgHeight = computed(() => {
  const w = paperWidth.value
  const h = paperHeight.value
  const maxW = 256
  const maxH = 128
  const ratio = Math.min(maxW / w, maxH / h)
  return h * ratio
})

const activeObject = shallowRef(null)
const activeObjLeft = ref(0)
const activeObjTop = ref(0)
const activeObjWidth = ref(0)
const activeObjHeight = ref(0)
const activeObjAngle = ref(0)
const activeObjFlipX = ref(false)
const activeObjFlipY = ref(false)
const activeObjFontSize = ref(40)
const activeObjTextAlign = ref('center')
const activeObjFontWeight = ref('normal')
const activeObjFontStyle = ref('normal')
const activeObjUnderline = ref(false)
const activeObjLinethrough = ref(false)
const activeObjFill = ref('#000000')
const activeObjStroke = ref('#000000')
const activeObjStrokeWidth = ref(0)
const activeObjOpacity = ref(1)

const handleSelection = async () => {
  const active = fabricCanvas?.getActiveObject()
  if (active) {
    activeObject.value = active

    // Transform Properties
    activeObjLeft.value = Math.round(active.left || 0)
    activeObjTop.value = Math.round(active.top || 0)
    activeObjWidth.value = Math.round((active.width || 0) * (active.scaleX || 1))
    activeObjHeight.value = Math.round((active.height || 0) * (active.scaleY || 1))
    activeObjAngle.value = Math.round(active.angle || 0)
    activeObjFlipX.value = active.flipX || false
    activeObjFlipY.value = active.flipY || false

    // Appearance Properties (All objects)
    activeObjFill.value = active.fill || '#000000'
    activeObjStroke.value = active.stroke || '#000000'
    activeObjStrokeWidth.value = active.strokeWidth || 0
    activeObjOpacity.value = active.opacity ?? 1

    // Text Properties
    if (active.type === 'i-text' || active.type === 'text' || active.type === 'textbox') {
      activeObjFontSize.value = active.fontSize || 40
      activeObjTextAlign.value = active.textAlign || 'left'
      activeObjFontWeight.value = active.fontWeight || 'normal'
      activeObjFontStyle.value = active.fontStyle || 'normal'
      activeObjUnderline.value = active.underline || false
      activeObjLinethrough.value = active.linethrough || false
    }
  } else {
    activeObject.value = null
  }
}

const canvasLayers = shallowRef([])

const updateMinimapViewport = () => {
  if (!fabricCanvas || !canvasWrapper.value) return

  const pxPerMm = 7.55
  const w = Math.round(paperWidth.value * pxPerMm)
  const h = Math.round(paperHeight.value * pxPerMm)

  const vpt = fabricCanvas.viewportTransform
  const zoom = fabricCanvas.getZoom()

  const wrapperW = canvasWrapper.value.clientWidth
  const wrapperH = canvasWrapper.value.clientHeight

  const logicalLeft = -vpt[4] / zoom
  const logicalTop = -vpt[5] / zoom
  const logicalW = wrapperW / zoom
  const logicalH = wrapperH / zoom

  minimapRect.value = {
    left: (logicalLeft / w) * 100,
    top: (logicalTop / h) * 100,
    width: (logicalW / w) * 100,
    height: (logicalH / h) * 100
  }
}

let minimapTimeout = null
const debouncedUpdateMinimapBg = () => {
  clearTimeout(minimapTimeout)
  minimapTimeout = setTimeout(() => {
    if (!fabricCanvas) return
    const vpt = fabricCanvas.viewportTransform.slice()
    const zoom = fabricCanvas.getZoom()

    const pxPerMm = 7.55
    const w = Math.round(paperWidth.value * pxPerMm)
    const h = Math.round(paperHeight.value * pxPerMm)

    const prevW = fabricCanvas.width
    const prevH = fabricCanvas.height

    fabricCanvas.setDimensions({ width: w, height: h })
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])

    isExporting = true
    minimapUrl.value = fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: 0.5,
      multiplier: 150 / Math.max(w, h)
    })
    isExporting = false

    fabricCanvas.setDimensions({ width: prevW, height: prevH })

    fabricCanvas.setViewportTransform(vpt)
    fabricCanvas.setZoom(zoom)
    updateMinimapViewport()
  }, 300)
}

const syncLayers = () => {
  if (!fabricCanvas) return
  const allObjects = fabricCanvas.getObjects()
  const filteredObjects = allObjects.filter(obj => obj.id !== 'paper-bg')

  canvasLayers.value = filteredObjects
    .map((obj, idx) => {
      let iconType = obj.type
      let text = 'Layer ' + idx
      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
        text = obj.text.substring(0, 15) || 'Teks Kosong'
        iconType = 'text'
      } else if (obj.type === 'image') {
        text = 'Gambar'
      } else if (obj.type === 'rect') {
        text = 'Kotak'
      } else if (obj.type === 'circle') {
        text = 'Lingkaran'
      } else if (obj.type === 'line') {
        text = 'Garis'
      }

      if (!obj.id) obj.id = 'layer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)

      const isLocked = !obj.selectable && !obj.evented && !obj.hasControls

      return {
        id: obj.id,
        obj: obj,
        type: iconType,
        text: text,
        isActive: activeObject.value === obj,
        isTop: idx === filteredObjects.length - 1,
        isBottom: idx === 0,
        isLocked
      }
    })
    .reverse()

  saveHistory()
}

const historyStack = ref([])
const historyIndex = ref(-1)
let isHistoryProcessing = false
let historyTimeout = null

const saveHistory = () => {
  if (!fabricCanvas || isHistoryProcessing) return

  clearTimeout(historyTimeout)
  historyTimeout = setTimeout(() => {
    if (!fabricCanvas || isHistoryProcessing) return
    const json = fabricCanvas.toJSON(['id', 'selectable', 'evented', 'hasControls', 'lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY'])
    const objects = fabricCanvas.getObjects()
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
  if (!fabricCanvas) return
  const parsed = JSON.parse(jsonString)
  fabricCanvas.loadFromJSON(parsed).then(() => {
    const objects = fabricCanvas.getObjects()
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
    fabricCanvas.requestRenderAll()
    syncLayers()
  })
}

// Drag & Drop Layers Logic
const draggedLayerIndex = ref(null)
const dragOverLayerIndex = ref(null)

const onDragStart = (e, idx) => {
  draggedLayerIndex.value = idx
  e.dataTransfer.effectAllowed = 'move'
}

const onDragOver = (e, idx) => {
  e.preventDefault()
  dragOverLayerIndex.value = idx
}

const onDrop = (e, dropIdx) => {
  e.preventDefault()
  const dragIdx = draggedLayerIndex.value
  if (dragIdx === null || dragIdx === dropIdx) {
    draggedLayerIndex.value = null
    dragOverLayerIndex.value = null
    return
  }

  // Reorder in a new array to avoid in-place mutation of shallowRef before sync
  const newLayers = [...canvasLayers.value]
  const draggedLayer = newLayers[dragIdx]
  newLayers.splice(dragIdx, 1)
  newLayers.splice(dropIdx, 0, draggedLayer)

  // Apply to Fabric.js explicitly by absolute z-index
  // paper-bg is at index 0. User layers start at index 1.
  // newLayers is ordered [TopLayer, ..., BottomLayer]
  const totalLayers = newLayers.length
  for (let i = 0; i < totalLayers; i++) {
    const layer = newLayers[i]
    // Top layer (i=0) gets highest index (totalLayers)
    // Bottom layer (i=totalLayers-1) gets index 1
    fabricCanvas.moveObjectTo(layer.obj, totalLayers - i)
  }

  fabricCanvas.requestRenderAll()
  syncLayers()

  draggedLayerIndex.value = null
  dragOverLayerIndex.value = null
}

const onDragEnd = () => {
  draggedLayerIndex.value = null
  dragOverLayerIndex.value = null
}

const selectLayer = layer => {
  if (!fabricCanvas) return
  fabricCanvas.setActiveObject(layer.obj)
  fabricCanvas.requestRenderAll()
}

const bringLayerForward = layer => {
  if (!fabricCanvas) return
  fabricCanvas.bringObjectForward(layer.obj)
  fabricCanvas.requestRenderAll()
  syncLayers()
}

const sendLayerBackwards = layer => {
  if (!fabricCanvas || layer.isBottom) return
  fabricCanvas.sendObjectBackwards(layer.obj)

  // Guard: Ensure paper-bg is strictly at index 0 so it never covers user layers
  const paper = fabricCanvas.getObjects().find(o => o.id === 'paper-bg')
  if (paper) fabricCanvas.moveObjectTo(paper, 0)

  fabricCanvas.requestRenderAll()
  syncLayers()
}

const removeLayer = layer => {
  if (!fabricCanvas) return
  fabricCanvas.remove(layer.obj)
  fabricCanvas.discardActiveObject()
  fabricCanvas.requestRenderAll()
  syncLayers()
}

const toggleLockLayer = layer => {
  if (!fabricCanvas) return
  const obj = layer.obj
  const newLockStatus = !layer.isLocked

  obj.set({
    selectable: !newLockStatus,
    evented: !newLockStatus,
    hasControls: !newLockStatus,
    lockMovementX: newLockStatus,
    lockMovementY: newLockStatus,
    lockRotation: newLockStatus,
    lockScalingX: newLockStatus,
    lockScalingY: newLockStatus
  })

  if (newLockStatus) {
    fabricCanvas.discardActiveObject()
  }

  fabricCanvas.requestRenderAll()
  syncLayers()
}

const updateProperty = (key, value) => {
  if (!activeObject.value || !fabricCanvas) return
  activeObject.value.set(key, value)

  if (key === 'fontSize') activeObjFontSize.value = value
  if (key === 'textAlign') activeObjTextAlign.value = value
  if (key === 'fontWeight') activeObjFontWeight.value = value
  if (key === 'fontStyle') activeObjFontStyle.value = value
  if (key === 'underline') activeObjUnderline.value = value
  if (key === 'linethrough') activeObjLinethrough.value = value
  if (key === 'fill') activeObjFill.value = value
  if (key === 'stroke') activeObjStroke.value = value
  if (key === 'strokeWidth') activeObjStrokeWidth.value = value
  if (key === 'opacity') activeObjOpacity.value = value

  activeObject.value.setCoords()
  fabricCanvas.requestRenderAll()
  syncLayers()
}

const alignObjects = alignment => {
  if (!fabricCanvas || !activeObject.value) return

  const objType = activeObject.value.type ? activeObject.value.type.toLowerCase() : ''
  const isGroup = objType === 'activeselection'
  let objectsToAlign = []
  let referenceBox = null

  if (isGroup) {
    objectsToAlign = [...activeObject.value.getObjects()]
    referenceBox = activeObject.value.getBoundingRect()
    fabricCanvas.discardActiveObject()
  } else {
    objectsToAlign = [activeObject.value]
    const paperBg = fabricCanvas.getObjects().find(o => o.id === 'paper-bg')
    if (!paperBg) return
    referenceBox = paperBg.getBoundingRect()
  }

  objectsToAlign.forEach(obj => {
    const objRect = obj.getBoundingRect()
    let newLeft = obj.left
    let newTop = obj.top

    if (alignment === 'left') {
      newLeft -= objRect.left - referenceBox.left
    } else if (alignment === 'center') {
      const refCenter = referenceBox.left + referenceBox.width / 2
      const objCenter = objRect.left + objRect.width / 2
      newLeft -= objCenter - refCenter
    } else if (alignment === 'right') {
      const refRight = referenceBox.left + referenceBox.width
      const objRight = objRect.left + objRect.width
      newLeft -= objRight - refRight
    } else if (alignment === 'top') {
      newTop -= objRect.top - referenceBox.top
    } else if (alignment === 'middle') {
      const refMiddle = referenceBox.top + referenceBox.height / 2
      const objMiddle = objRect.top + objRect.height / 2
      newTop -= objMiddle - refMiddle
    } else if (alignment === 'bottom') {
      const refBottom = referenceBox.top + referenceBox.height
      const objBottom = objRect.top + objRect.height
      newTop -= objBottom - refBottom
    }

    obj.set({ left: newLeft, top: newTop })
    obj.setCoords()
  })

  if (isGroup) {
    const sel = new fabric.ActiveSelection(objectsToAlign, { canvas: fabricCanvas })
    fabricCanvas.setActiveObject(sel)
  } else {
    fabricCanvas.setActiveObject(objectsToAlign[0])
  }

  fabricCanvas.requestRenderAll()
  syncLayers()
}

const updateTransformProperty = (key, value) => {
  if (!activeObject.value || !fabricCanvas) return

  const obj = activeObject.value

  if (key === 'width') {
    if (obj.width > 0) obj.set('scaleX', value / obj.width)
    activeObjWidth.value = value
  } else if (key === 'height') {
    if (obj.height > 0) obj.set('scaleY', value / obj.height)
    activeObjHeight.value = value
  } else {
    obj.set(key, value)
    if (key === 'left') activeObjLeft.value = value
    if (key === 'top') activeObjTop.value = value
    if (key === 'angle') activeObjAngle.value = value
    if (key === 'flipX') activeObjFlipX.value = value
    if (key === 'flipY') activeObjFlipY.value = value
  }

  fabricCanvas.requestRenderAll()
  syncLayers()
}

const centerCanvas = () => {
  if (!fabricCanvas || !canvasWrapper.value) return
  const pxPerMm = 7.55
  const w = Math.round(paperWidth.value * pxPerMm)
  const h = Math.round(paperHeight.value * pxPerMm)
  const wrapperW = canvasWrapper.value.clientWidth
  const wrapperH = canvasWrapper.value.clientHeight

  const offsetX = (wrapperW - w) / 2
  const offsetY = (wrapperH - h) / 2

  canvasZoom.value = 1
  fabricCanvas.setViewportTransform([1, 0, 0, 1, offsetX, offsetY])
  fabricCanvas.requestRenderAll()
  debouncedUpdateMinimapBg()
}

let resizeObserver = null
let isCanvasCentered = false
let isExporting = false

let snapLines = []
const snapThreshold = 5

const getLogicalBounds = obj => {
  const coords = obj.aCoords || obj.calcACoords()
  const xs = [coords.tl.x, coords.tr.x, coords.bl.x, coords.br.x]
  const ys = [coords.tl.y, coords.tr.y, coords.bl.y, coords.br.y]
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  const right = Math.max(...xs)
  const bottom = Math.max(...ys)
  return { left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
}

const initSnapping = () => {
  if (!fabricCanvas) return

  fabricCanvas.on('object:moving', e => {
    const target = e.target
    if (!target) return

    snapLines = []
    target.setCoords()

    const targetBounds = getLogicalBounds(target)

    const targetPoints = {
      vertical: [targetBounds.left, targetBounds.centerX, targetBounds.right],
      horizontal: [targetBounds.top, targetBounds.centerY, targetBounds.bottom]
    }

    const objects = fabricCanvas.getObjects().filter(obj => obj !== target && obj.id !== 'snapping-line')

    let snapX = null
    let snapY = null
    let minDiffX = snapThreshold
    let minDiffY = snapThreshold

    objects.forEach(obj => {
      const bounds = getLogicalBounds(obj)

      const objVerticals = [bounds.left, bounds.centerX, bounds.right]
      const objHorizontals = [bounds.top, bounds.centerY, bounds.bottom]

      targetPoints.vertical.forEach(tX => {
        objVerticals.forEach(oX => {
          const diff = Math.abs(tX - oX)
          if (diff < minDiffX) {
            minDiffX = diff
            snapX = { diff: oX - tX, lineX: oX }
          }
        })
      })

      targetPoints.horizontal.forEach(tY => {
        objHorizontals.forEach(oY => {
          const diff = Math.abs(tY - oY)
          if (diff < minDiffY) {
            minDiffY = diff
            snapY = { diff: oY - tY, lineY: oY }
          }
        })
      })
    })

    if (snapX) {
      target.set('left', target.left + snapX.diff)
      snapLines.push({ x1: snapX.lineX, y1: -99999, x2: snapX.lineX, y2: 99999 })
    }

    if (snapY) {
      target.set('top', target.top + snapY.diff)
      snapLines.push({ x1: -99999, y1: snapY.lineY, x2: 99999, y2: snapY.lineY })
    }

    if (snapX || snapY) {
      target.setCoords()
    }
  })

  fabricCanvas.on('mouse:up', () => {
    if (snapLines.length > 0) {
      snapLines = []
      fabricCanvas.requestRenderAll()
    }
  })

  fabricCanvas.on('after:render', opt => {
    if (isExporting) return
    const ctx = opt.ctx
    ctx.save()

    if (snapLines.length > 0 && fabricCanvas) {
      // Apply viewport transform so we can draw in logical coordinates
      const vpt = fabricCanvas.viewportTransform
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])

      ctx.strokeStyle = '#ef4444' // Tailwind text-danger
      const zoom = fabricCanvas.getZoom() || 1
      ctx.lineWidth = 1 / zoom
      ctx.setLineDash([5 / zoom, 5 / zoom])

      ctx.beginPath()
      snapLines.forEach(line => {
        ctx.moveTo(line.x1, line.y1)
        ctx.lineTo(line.x2, line.y2)
      })
      ctx.stroke()
    }

    // RESET TRANSFORM FOR RULERS (Draw absolute to screen, preserving retina scale)
    const retina = window.devicePixelRatio || 1
    ctx.setTransform(retina, 0, 0, retina, 0, 0)

    if (fabricCanvas) {
      const vpt = fabricCanvas.viewportTransform
      const zoom = fabricCanvas.getZoom()
      const pxPerMm = 7.55
      const rulerSize = 24

      // Ruler Background
      ctx.fillStyle = '#f1f5f9'
      ctx.fillRect(0, 0, fabricCanvas.width, rulerSize)
      ctx.fillRect(0, 0, rulerSize, fabricCanvas.height)

      // Ruler Borders
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(0, rulerSize)
      ctx.lineTo(fabricCanvas.width, rulerSize)
      ctx.moveTo(rulerSize, 0)
      ctx.lineTo(rulerSize, fabricCanvas.height)
      ctx.stroke()

      // Ticks and Text
      ctx.fillStyle = '#64748b'
      ctx.strokeStyle = '#94a3b8'
      ctx.font = '10px sans-serif'

      let stepMm = 1
      if (zoom < 0.5) stepMm = 10
      else if (zoom < 1.5) stepMm = 5

      // Horizontal (X)
      const startMmX = Math.floor(-vpt[4] / zoom / pxPerMm)
      const endMmX = Math.ceil((fabricCanvas.width - vpt[4]) / zoom / pxPerMm)

      ctx.beginPath()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (let mm = startMmX; mm <= endMmX; mm++) {
        if (stepMm > 1 && mm % stepMm !== 0 && mm % 5 !== 0 && mm % 10 !== 0) continue

        const screenX = mm * pxPerMm * zoom + vpt[4]
        if (screenX < rulerSize) continue

        const isMajor = mm % 10 === 0
        const isMedium = mm % 5 === 0
        let tickHeight = 5
        if (isMajor) tickHeight = 14
        else if (isMedium) tickHeight = 8

        ctx.moveTo(screenX, rulerSize - tickHeight)
        ctx.lineTo(screenX, rulerSize)

        if (isMajor) {
          ctx.fillText(mm.toString(), screenX, 2)
        }
      }

      // Vertical (Y)
      const startMmY = Math.floor(-vpt[5] / zoom / pxPerMm)
      const endMmY = Math.ceil((fabricCanvas.height - vpt[5]) / zoom / pxPerMm)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let mm = startMmY; mm <= endMmY; mm++) {
        if (stepMm > 1 && mm % stepMm !== 0 && mm % 5 !== 0 && mm % 10 !== 0) continue

        const screenY = mm * pxPerMm * zoom + vpt[5]
        if (screenY < rulerSize) continue

        const isMajor = mm % 10 === 0
        const isMedium = mm % 5 === 0
        let tickWidth = 5
        if (isMajor) tickWidth = 14
        else if (isMedium) tickWidth = 8

        ctx.moveTo(rulerSize - tickWidth, screenY)
        ctx.lineTo(rulerSize, screenY)

        if (isMajor) {
          ctx.save()
          ctx.translate(8, screenY)
          ctx.rotate(-Math.PI / 2)
          ctx.fillText(mm.toString(), 0, 0)
          ctx.restore()
        }
      }
      ctx.stroke()

      // Corner Block
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(0, 0, rulerSize, rulerSize)
      ctx.strokeStyle = '#cbd5e1'
      ctx.strokeRect(0, 0, rulerSize, rulerSize)
      ctx.fillStyle = '#64748b'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('mm', rulerSize / 2, rulerSize / 2)
    }

    ctx.restore()
  })
}

const initCanvas = () => {
  if (fabricCanvas || !canvasWrapper.value) return
  const pxPerMm = 7.55

  isCanvasCentered = false

  fabricCanvas = new fabric.Canvas(canvasEl.value, {
    width: 0,
    height: 0,
    backgroundColor: '#f3f4f6',
    preserveObjectStacking: true
  })

  if (props.initialTemplate && props.initialTemplate.config_json) {
    let parsedConfig = props.initialTemplate.config_json
    if (typeof parsedConfig === 'string') {
      try {
        parsedConfig = JSON.parse(parsedConfig)
      } catch {
        // Abaikan error parsing
      }
    }

    fabricCanvas.loadFromJSON(parsedConfig).then(() => {
      // Restore custom barcode properties that fabric.js might drop during loadFromJSON
      const objects = fabricCanvas.getObjects()
      if (parsedConfig && parsedConfig.objects) {
        parsedConfig.objects.forEach((rawObj, index) => {
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

      // Re-add paper background since it was excluded during save
      const w = Math.round(paperWidth.value * pxPerMm)
      const h = Math.round(paperHeight.value * pxPerMm)
      const paperRect = new fabric.Rect({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        width: w,
        height: h,
        fill: '#ffffff',
        selectable: false,
        evented: false,
        id: 'paper-bg',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 20, offsetX: 0, offsetY: 10 })
      })
      fabricCanvas.insertAt(0, paperRect) // Add as the very first object (bottom layer)

      // Remove any rogue white rectangles that were accidentally saved in previous bug
      fabricCanvas.getObjects().forEach(o => {
        if (o.type === 'rect' && o.fill === '#ffffff' && o.left === 0 && o.top === 0 && o.id !== 'paper-bg') {
          fabricCanvas.remove(o)
        }
      })

      centerCanvas()
      isCanvasCentered = true
      syncLayers()
      updateMinimapViewport()
    })
  } else {
    const w = Math.round(paperWidth.value * pxPerMm)
    const h = Math.round(paperHeight.value * pxPerMm)

    const paperRect = new fabric.Rect({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      width: w,
      height: h,
      fill: '#ffffff',
      selectable: false,
      evented: false,
      id: 'paper-bg',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 20, offsetX: 0, offsetY: 10 })
    })
    fabricCanvas.add(paperRect)
  }

  fabricCanvas.on('selection:created', () => {
    handleSelection()
    syncLayers()
  })
  fabricCanvas.on('selection:updated', () => {
    handleSelection()
    syncLayers()
  })
  fabricCanvas.on('selection:cleared', () => {
    handleSelection()
    syncLayers()
  })
  fabricCanvas.on('object:added', () => {
    syncLayers()
  })
  fabricCanvas.on('object:removed', () => {
    syncLayers()
  })
  fabricCanvas.on('object:modified', () => {
    syncLayers()
  })

  fabricCanvas.on('mouse:wheel', function (opt) {
    const delta = opt.e.deltaY
    let zoom = fabricCanvas.getZoom()
    zoom *= 0.999 ** delta
    if (zoom > 5) zoom = 5
    if (zoom < 0.1) zoom = 0.1

    fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
    opt.e.preventDefault()
    opt.e.stopPropagation()
    canvasZoom.value = zoom
    updateMinimapViewport()
  })

  let isDragging = false
  let lastPosX = 0
  let lastPosY = 0

  fabricCanvas.on('mouse:down', function (opt) {
    const evt = opt.e
    if (evt.altKey === true) {
      isDragging = true
      fabricCanvas.selection = false
      lastPosX = evt.clientX
      lastPosY = evt.clientY
      fabricCanvas.defaultCursor = 'grabbing'
    }
  })

  fabricCanvas.on('mouse:move', function (opt) {
    if (isDragging) {
      const e = opt.e
      const vpt = fabricCanvas.viewportTransform
      vpt[4] += e.clientX - lastPosX
      vpt[5] += e.clientY - lastPosY
      fabricCanvas.requestRenderAll()
      lastPosX = e.clientX
      lastPosY = e.clientY
      updateMinimapViewport()
    }
  })

  fabricCanvas.on('mouse:up', function () {
    if (isDragging) {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform)
      isDragging = false
      fabricCanvas.selection = true
      fabricCanvas.defaultCursor = 'default'
      updateMinimapViewport()
    }
  })

  resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)

      if (width > 0 && height > 0 && fabricCanvas) {
        const currentWidth = fabricCanvas.width || 0
        const currentHeight = fabricCanvas.height || 0

        if (Math.abs(currentWidth - width) > 1 || Math.abs(currentHeight - height) > 1) {
          fabricCanvas.setDimensions({ width, height })
          if (!isCanvasCentered) {
            centerCanvas()
            isCanvasCentered = true
          } else {
            updateMinimapViewport()
          }
        }
      }
    }
  })
  resizeObserver.observe(canvasWrapper.value)

  initSnapping()
}

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }
})

const applyPaperSize = () => {
  if (!fabricCanvas || !canvasWrapper.value) return
  const pxPerMm = 7.55
  const w = Math.round(paperWidth.value * pxPerMm)
  const h = Math.round(paperHeight.value * pxPerMm)

  const paperRect = fabricCanvas.getObjects().find(o => o.id === 'paper-bg')
  if (paperRect) {
    paperRect.set({ width: w, height: h, originX: 'left', originY: 'top' })
  }

  centerCanvas()
}

watch(
  () => props.show,
  newVal => {
    if (newVal) {
      if (props.initialTemplate) {
        templateName.value = props.initialTemplate.name
        if (props.initialTemplate.paper_size) {
          const [w, h] = props.initialTemplate.paper_size.split('x').map(Number)
          paperWidth.value = w || 80
          paperHeight.value = h || 40
        }
      } else {
        templateName.value = ''
        paperWidth.value = 80
        paperHeight.value = 40
      }
      historyStack.value = []
      historyIndex.value = -1
      isHistoryProcessing = false
      setTimeout(initCanvas, 100)
    } else {
      if (resizeObserver) resizeObserver.disconnect()
      if (fabricCanvas) {
        fabricCanvas.dispose()
        fabricCanvas = null
      }
    }
  }
)

const addText = () => {
  if (!fabricCanvas) return
  const text = new fabric.IText('Teks Baru', {
    left: 50,
    top: 50,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 40,
    fill: '#000000',
    fontWeight: 'normal',
    textAlign: 'center'
  })
  fabricCanvas.add(text)
  fabricCanvas.setActiveObject(text)
  fabricCanvas.requestRenderAll()
}

const addDynamicText = () => {
  if (!fabricCanvas) return

  const objects = fabricCanvas.getObjects()
  let maxIndex = 0
  objects.forEach(obj => {
    if (obj.type === 'i-text' && obj.text) {
      const matches = obj.text.match(/\{\{\s*data_(\d+)\s*\}\}/g)
      if (matches) {
        matches.forEach(m => {
          const num = parseInt(m.match(/\d+/)[0])
          if (num > maxIndex) maxIndex = num
        })
      }
    }
  })

  const nextIndex = maxIndex + 1
  const text = new fabric.IText(`{{ data_${nextIndex} }}`, {
    left: 50,
    top: 50,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 40,
    fill: '#000000',
    fontWeight: 'bold',
    textAlign: 'center'
  })
  fabricCanvas.add(text)
  fabricCanvas.setActiveObject(text)
  fabricCanvas.requestRenderAll()
  isDynamicMenuOpen.value = false
}

const addSpecificText = variable => {
  if (!fabricCanvas) return
  const text = new fabric.IText(`{{ ${variable} }}`, {
    left: 50,
    top: 50,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 40,
    fill: '#000000',
    fontWeight: 'bold',
    textAlign: 'center'
  })
  fabricCanvas.add(text)
  fabricCanvas.setActiveObject(text)
  fabricCanvas.requestRenderAll()
  isDynamicMenuOpen.value = false
}

const insertMediaToCanvas = asset => {
  if (!fabricCanvas || !asset) return
  const imgElement = document.createElement('img')
  imgElement.crossOrigin = 'anonymous'
  imgElement.src = resolveUrl(asset.main_path)
  imgElement.onload = () => {
    const img = new fabric.Image(imgElement, {
      left: 10,
      top: 10
    })
    if (img.height > 80) {
      img.scaleToHeight(80)
    }
    if (img.width > 80 && img.getScaledWidth() > 80) {
      img.scaleToWidth(80)
    }
    fabricCanvas.add(img)
    fabricCanvas.setActiveObject(img)
    fabricCanvas.requestRenderAll()
  }
}

const generateBarcodeDataURL = async config => {
  if (config.type === 'qrcode') {
    return await QRCode.toDataURL(config.value || ' ', { errorCorrectionLevel: 'M', margin: 2 })
  } else {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, config.value || ' ', {
      format: 'CODE128',
      displayValue: config.displayValue,
      margin: 10,
      background: '#ffffff',
      lineColor: '#000000'
    })
    return canvas.toDataURL('image/png')
  }
}

const addBarcode = async () => {
  if (!fabricCanvas) return
  isBarcodeModalOpen.value = false

  try {
    const dataUrl = await generateBarcodeDataURL(barcodeConfig.value)
    const imgElement = document.createElement('img')
    imgElement.src = dataUrl
    imgElement.onload = () => {
      const img = new fabric.Image(imgElement, {
        left: 50,
        top: 50,
        isDynamicBarcode: true,
        barcodeType: barcodeConfig.value.type,
        barcodeValue: barcodeConfig.value.value,
        barcodeDisplayValue: barcodeConfig.value.displayValue
      })
      if (img.width > 100) {
        img.scaleToWidth(100)
      }
      fabricCanvas.add(img)
      fabricCanvas.setActiveObject(img)
      fabricCanvas.requestRenderAll()
    }
  } catch (err) {
    console.error('Failed to generate barcode/qrcode', err)
    await swalAlert('Gagal membuat Barcode/QR Code. Pastikan format teks valid.')
  }
}

const addRectangle = async () => {
  if (!fabricCanvas) return
  const rect = new fabric.Rect({
    left: 50,
    top: 50,
    width: 40,
    height: 40,
    fill: '#000000'
  })
  fabricCanvas.add(rect)
  fabricCanvas.setActiveObject(rect)
  fabricCanvas.requestRenderAll()
}

const addCircle = () => {
  if (!fabricCanvas) return
  const circle = new fabric.Circle({
    left: 50,
    top: 50,
    radius: 20,
    fill: '#000000'
  })
  fabricCanvas.add(circle)
  fabricCanvas.setActiveObject(circle)
  fabricCanvas.requestRenderAll()
}

const addLine = () => {
  if (!fabricCanvas) return
  const line = new fabric.Line([50, 50, 150, 50], {
    stroke: '#000000',
    strokeWidth: 4
  })
  fabricCanvas.add(line)
  fabricCanvas.setActiveObject(line)
  fabricCanvas.requestRenderAll()
}

const deleteSelected = () => {
  if (!fabricCanvas) return
  const activeObjects = fabricCanvas.getActiveObjects()
  if (activeObjects.length) {
    activeObjects.forEach(obj => {
      fabricCanvas.remove(obj)
    })
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  }
}

const duplicateSelected = () => {
  if (!fabricCanvas) return
  const activeObject = fabricCanvas.getActiveObject()
  if (activeObject && activeObject.id !== 'paper-bg') {
    activeObject.clone(['id', 'isDynamicBarcode', 'barcodeType', 'barcodeValue', 'barcodeDisplayValue']).then(cloned => {
      fabricCanvas.discardActiveObject()
      cloned.set({
        left: cloned.left + 15,
        top: cloned.top + 15,
        evented: true,
        id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
      })
      if (cloned.type === 'activeSelection') {
        cloned.canvas = fabricCanvas
        cloned.forEachObject(obj => {
          obj.id = 'layer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
          fabricCanvas.add(obj)
        })
        cloned.setCoords()
      } else {
        fabricCanvas.add(cloned)
      }
      fabricCanvas.setActiveObject(cloned)
      fabricCanvas.requestRenderAll()
      syncLayers()
    })
  }
}

const saveTemplate = async () => {
  if (!templateName.value.trim()) {
    await swalAlert('Nama template tidak boleh kosong!')
    return
  }
  if (!fabricCanvas) return

  isSaving.value = true
  try {
    // Remove paperRect temporarily so it doesn't get exported
    const paperBg = fabricCanvas.getObjects().find(o => o.id === 'paper-bg')
    if (paperBg) fabricCanvas.remove(paperBg)

    const exportData = fabricCanvas.toJSON(['id'])
    
    // Manually inject custom barcode properties (fabric's toJSON might strip them)
    const objects = fabricCanvas.getObjects()
    // Fabric might have removed paperBg, so we must be careful with indexing. 
    // exportData.objects corresponds to objects that were NOT removed.
    // Let's match them by their index or ID. Since we removed paperBg and will put it back, 
    // the objects in exportData.objects align with fabricCanvas.getObjects() 
    if (exportData.objects) {
      exportData.objects.forEach((rawObj, index) => {
        const obj = objects[index]
        if (obj && obj.isDynamicBarcode) {
          rawObj.isDynamicBarcode = obj.isDynamicBarcode
          rawObj.barcodeType = obj.barcodeType
          rawObj.barcodeValue = obj.barcodeValue
          rawObj.barcodeDisplayValue = obj.barcodeDisplayValue
        }
      })
    }

    const designData = JSON.stringify(exportData)

    // Put it back
    if (paperBg) fabricCanvas.insertAt(0, paperBg)

    let url = '/api/sticker-templates'
    let method = 'POST'

    if (props.initialTemplate && props.initialTemplate.id) {
      url = `/api/sticker-templates/${props.initialTemplate.id}`
      method = 'PUT'
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: templateName.value,
        paper_size: `${paperWidth.value}x${paperHeight.value}`,
        config_json: designData
      })
    })

    const result = await response.json()
    if (result.success) {
      emit('saved', { id: result.data.id, name: templateName.value })
      emit('close')
    } else {
      await swalAlert('Gagal menyimpan: ' + result.message)
    }
  } catch (err) {
    console.error('Save error', err)
    await swalAlert('Terjadi kesalahan jaringan.')
  } finally {
    isSaving.value = false
  }
}
const handleKeydown = e => {
  if (!props.show || !fabricCanvas) return
  const target = e.target
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
    handleSelection()
    syncLayers()
  } else if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase()
    if (k === 's') {
      e.preventDefault()
      saveTemplate()
    } else if (k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if (k === 'y') {
      e.preventDefault()
      redo()
    } else if (k === 'd') {
      e.preventDefault()
      duplicateSelected()
    } else if (k === 'b') {
      e.preventDefault()
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
        updateProperty('fontWeight', activeObject.fontWeight === 'bold' ? 'normal' : 'bold')
      }
    } else if (k === 'i') {
      e.preventDefault()
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
        updateProperty('fontStyle', activeObject.fontStyle === 'italic' ? 'normal' : 'italic')
      }
    } else if (k === 'u') {
      e.preventDefault()
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
        updateProperty('underline', !activeObject.underline)
      }
    }
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const activeObject = fabricCanvas.getActiveObject()
    if (activeObject && activeObject.id !== 'paper-bg') {
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowUp') activeObject.top -= step
      else if (e.key === 'ArrowDown') activeObject.top += step
      else if (e.key === 'ArrowLeft') activeObject.left -= step
      else if (e.key === 'ArrowRight') activeObject.left += step
      activeObject.setCoords()
      fabricCanvas.requestRenderAll()
      handleSelection() // Update property panel values
      syncLayers()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center print:hidden bg-secondary">
      <div class="w-full h-full relative flex flex-col z-10 overflow-hidden">
        <!-- Header -->
        <div class="p-4 border-b border-primary/10 flex justify-between items-center bg-background">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <font-awesome-icon icon="fa-solid fa-object-group" class="text-xl" />
            </div>
            <div>
              <h3 class="text-xl font-black text-text tracking-tight">Template Builder</h3>
              <p class="text-sm text-text/60">Desain stiker khusus dengan fitur drag & drop</p>
            </div>
          </div>
          <button
            @click="$emit('close')"
            class="text-text/50 hover:text-accent transition-colors w-8 h-8 rounded-full hover:bg-accent/10 flex items-center justify-center"
          >
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </div>

        <!-- Toolbar & Canvas Area -->
        <div class="flex flex-col lg:flex-row flex-1 bg-background">
          <!-- Toolbar Kiri -->
          <div class="w-full lg:w-72 border-r border-primary/10 flex flex-col bg-secondary/30 h-full">
            <!-- PROPERTY INSPECTOR -->
            <div class="p-4 flex-1 bg-background/50 overflow-y-auto" v-if="activeObject">
              <div class="flex justify-between items-center mb-3">
                <h4 class="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <font-awesome-icon icon="fa-solid fa-sliders-h" /> Properti Objek
                </h4>
                <span class="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full font-bold">Terpilih</span>
              </div>

              <!-- Transform Properties -->
              <div class="mb-4 space-y-3 pb-4 border-b border-primary/10">
                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">X (Pos)</label>
                    <input
                      type="number"
                      v-model.number="activeObjLeft"
                      @input="updateTransformProperty('left', activeObjLeft)"
                      class="w-full bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">Y (Pos)</label>
                    <input
                      type="number"
                      v-model.number="activeObjTop"
                      @input="updateTransformProperty('top', activeObjTop)"
                      class="w-full bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">Width</label>
                    <input
                      type="number"
                      v-model.number="activeObjWidth"
                      @input="updateTransformProperty('width', activeObjWidth)"
                      class="w-full bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                      min="1"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">Height</label>
                    <input
                      type="number"
                      v-model.number="activeObjHeight"
                      @input="updateTransformProperty('height', activeObjHeight)"
                      class="w-full bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                      min="1"
                    />
                  </div>
                </div>

                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">Rotasi (°)</label>
                    <input
                      type="number"
                      v-model.number="activeObjAngle"
                      @input="updateTransformProperty('angle', activeObjAngle)"
                      class="w-full bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div class="flex-1 flex gap-2">
                    <div class="flex-1">
                      <label class="block text-[10px] font-bold text-text/70 mb-1">Flip X</label>
                      <button
                        @click="updateTransformProperty('flipX', !activeObjFlipX)"
                        class="w-full py-1.5 rounded-lg border text-sm transition-all flex items-center justify-center"
                        :class="
                          activeObjFlipX
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-secondary text-text/70 hover:border-primary/50'
                        "
                      >
                        <font-awesome-icon icon="fa-solid fa-arrows-left-right" />
                      </button>
                    </div>
                    <div class="flex-1">
                      <label class="block text-[10px] font-bold text-text/70 mb-1">Flip Y</label>
                      <button
                        @click="updateTransformProperty('flipY', !activeObjFlipY)"
                        class="w-full py-1.5 rounded-lg border text-sm transition-all flex items-center justify-center"
                        :class="
                          activeObjFlipY
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-secondary text-text/70 hover:border-primary/50'
                        "
                      >
                        <font-awesome-icon icon="fa-solid fa-arrows-up-down" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Alignment Tools -->
              <div class="space-y-4 pt-4 border-t border-primary/10">
                <label class="text-xs font-bold text-text/70 mb-1 block">
                  Perataan Objek
                  <span class="font-normal opacity-70 text-[10px] ml-1"
                    >(relatif terhadap {{ activeObject.type === 'activeSelection' ? 'Pilihan' : 'Kanvas' }})</span
                  >
                </label>
                <div class="grid grid-cols-6 gap-2">
                  <button
                    @click="alignObjects('left')"
                    class="py-2 rounded-lg border bg-background border-secondary text-text/70 hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    title="Rata Kiri"
                  >
                    <font-awesome-icon icon="fa-solid fa-align-left" />
                  </button>
                  <button
                    @click="alignObjects('center')"
                    class="py-2 rounded-lg border bg-background border-secondary text-text/70 hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    title="Rata Tengah Horisontal"
                  >
                    <font-awesome-icon icon="fa-solid fa-align-center" />
                  </button>
                  <button
                    @click="alignObjects('right')"
                    class="py-2 rounded-lg border bg-background border-secondary text-text/70 hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    title="Rata Kanan"
                  >
                    <font-awesome-icon icon="fa-solid fa-align-right" />
                  </button>
                  <button
                    @click="alignObjects('top')"
                    class="py-2 rounded-lg border bg-background border-secondary text-text/70 hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    title="Rata Atas"
                  >
                    <font-awesome-icon icon="fa-solid fa-arrow-up" />
                  </button>
                  <button
                    @click="alignObjects('middle')"
                    class="py-2 rounded-lg border bg-background border-secondary text-text/70 hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    title="Rata Tengah Vertikal"
                  >
                    <font-awesome-icon icon="fa-solid fa-arrows-up-down" />
                  </button>
                  <button
                    @click="alignObjects('bottom')"
                    class="py-2 rounded-lg border bg-background border-secondary text-text/70 hover:border-primary hover:text-primary transition-all flex items-center justify-center"
                    title="Rata Bawah"
                  >
                    <font-awesome-icon icon="fa-solid fa-arrow-down" />
                  </button>
                </div>
              </div>

              <!-- Text Properties -->
              <div
                v-if="activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox'"
                class="space-y-4 pt-4 border-t border-primary/10"
              >
                <!-- Font Size -->
                <div>
                  <label class="text-xs font-bold text-text/70 mb-1 flex justify-between">
                    <span>Ukuran Font</span>
                    <span class="text-primary">{{ activeObjFontSize }}px</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="1"
                    v-model.number="activeObjFontSize"
                    @input="updateProperty('fontSize', activeObjFontSize)"
                    class="w-full accent-primary"
                  />
                </div>

                <!-- Font Weight & Alignment -->
                <div class="flex gap-2">
                  <!-- Bold Toggle -->
                  <button
                    @click="updateProperty('fontWeight', activeObjFontWeight === 'bold' ? 'normal' : 'bold')"
                    class="flex-1 py-2 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-2"
                    :class="
                      activeObjFontWeight === 'bold'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-secondary text-text/70 hover:border-primary/50'
                    "
                  >
                    <font-awesome-icon icon="fa-solid fa-bold" />
                  </button>

                  <!-- Italic Toggle -->
                  <button
                    @click="updateProperty('fontStyle', activeObjFontStyle === 'italic' ? 'normal' : 'italic')"
                    class="flex-1 py-2 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-2"
                    :class="
                      activeObjFontStyle === 'italic'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-secondary text-text/70 hover:border-primary/50'
                    "
                  >
                    <font-awesome-icon icon="fa-solid fa-italic" />
                  </button>

                  <!-- Underline Toggle -->
                  <button
                    @click="updateProperty('underline', !activeObjUnderline)"
                    class="flex-1 py-2 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-2"
                    :class="
                      activeObjUnderline
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-secondary text-text/70 hover:border-primary/50'
                    "
                  >
                    <font-awesome-icon icon="fa-solid fa-underline" />
                  </button>

                  <!-- Strikethrough Toggle -->
                  <button
                    @click="updateProperty('linethrough', !activeObjLinethrough)"
                    class="flex-1 py-2 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-2"
                    :class="
                      activeObjLinethrough
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-secondary text-text/70 hover:border-primary/50'
                    "
                  >
                    <font-awesome-icon icon="fa-solid fa-strikethrough" />
                  </button>
                </div>

                <div class="flex gap-2">
                  <!-- Alignment Group -->
                  <div class="flex rounded-lg border border-secondary overflow-hidden flex-1">
                    <button
                      @click="updateProperty('textAlign', 'left')"
                      class="flex-1 py-2 text-sm transition-all flex items-center justify-center hover:bg-secondary/50"
                      :class="
                        activeObjTextAlign === 'left' ? 'bg-secondary text-primary' : 'bg-background text-text/70'
                      "
                    >
                      <font-awesome-icon icon="fa-solid fa-align-left" />
                    </button>
                    <button
                      @click="updateProperty('textAlign', 'center')"
                      class="flex-1 py-2 text-sm transition-all border-x border-secondary flex items-center justify-center hover:bg-secondary/50"
                      :class="
                        activeObjTextAlign === 'center' ? 'bg-secondary text-primary' : 'bg-background text-text/70'
                      "
                    >
                      <font-awesome-icon icon="fa-solid fa-align-center" />
                    </button>
                    <button
                      @click="updateProperty('textAlign', 'right')"
                      class="flex-1 py-2 text-sm transition-all flex items-center justify-center hover:bg-secondary/50"
                      :class="
                        activeObjTextAlign === 'right' ? 'bg-secondary text-primary' : 'bg-background text-text/70'
                      "
                    >
                      <font-awesome-icon icon="fa-solid fa-align-right" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- General Appearance Properties -->
              <div class="mt-4 space-y-4 pt-4 border-t border-primary/10" v-if="activeObject.type !== 'image'">
                <!-- Colors -->
                <div class="flex gap-4">
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">Warna Utama</label>
                    <div class="flex items-center gap-2">
                      <input
                        type="color"
                        v-model="activeObjFill"
                        @input="updateProperty('fill', activeObjFill)"
                        class="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent"
                      />
                      <span class="text-xs text-text/60 font-mono">{{ activeObjFill }}</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-text/70 mb-1">Warna Garis</label>
                    <div class="flex items-center gap-2">
                      <input
                        type="color"
                        v-model="activeObjStroke"
                        @input="updateProperty('stroke', activeObjStroke)"
                        class="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent"
                      />
                      <span class="text-xs text-text/60 font-mono">{{ activeObjStroke || 'none' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Stroke Width -->
                <div>
                  <label class="text-xs font-bold text-text/70 mb-1 flex justify-between">
                    <span>Tebal Garis</span>
                    <span class="text-primary">{{ activeObjStrokeWidth }}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    v-model.number="activeObjStrokeWidth"
                    @input="updateProperty('strokeWidth', activeObjStrokeWidth)"
                    class="w-full accent-primary"
                  />
                </div>

                <!-- Opacity -->
                <div>
                  <label class="text-xs font-bold text-text/70 mb-1 flex justify-between">
                    <span>Transparansi</span>
                    <span class="text-primary">{{ Math.round(activeObjOpacity * 100) }}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    v-model.number="activeObjOpacity"
                    @input="updateProperty('opacity', activeObjOpacity)"
                    class="w-full accent-primary"
                  />
                </div>
              </div>

              <!-- Image Properties (placeholder jika diperlukan ke depannya) -->
              <div v-if="activeObject.type === 'image'" class="text-sm text-text/60 italic mt-4">
                Transparansi (Opacity):
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  v-model.number="activeObjOpacity"
                  @input="updateProperty('opacity', activeObjOpacity)"
                  class="w-full accent-primary mt-2"
                />
              </div>

              <hr class="border-primary/10 my-4" />

              <button
                @click="deleteSelected"
                class="w-full px-4 py-2 bg-danger/10 border border-danger/20 text-danger rounded-xl font-semibold text-sm hover:bg-danger hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <font-awesome-icon icon="fa-solid fa-trash" /> Hapus Objek
              </button>
            </div>

            <div
              v-else
              class="p-4 flex-1 bg-background/50 flex flex-col items-center justify-center text-center text-text/40"
            >
              <font-awesome-icon icon="fa-solid fa-mouse-pointer" class="text-3xl mb-2 opacity-50" />
              <p class="text-xs">Klik elemen di kanvas untuk<br />melihat properti.</p>
            </div>
          </div>

          <!-- Canvas Area -->
          <div class="flex-1 p-0 flex relative bg-gray-100 overflow-hidden" ref="canvasWrapper">
            <canvas ref="canvasEl" class="absolute inset-0"></canvas>

            <!-- FLOATING TOOLBAR: TAMBAH ELEMEN -->
            <div
              class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-secondary/90 backdrop-blur-md border border-primary/20 p-2 rounded-2xl shadow-xl flex gap-2 z-10 hover:bg-secondary transition-colors"
            >
              <div
                class="relative group"
                @mouseenter="isDynamicMenuOpen = true"
                @mouseleave="isDynamicMenuOpen = false"
              >
                <button
                  @click="addText"
                  class="p-3 bg-background border border-secondary rounded-xl hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm group w-12 h-12 flex items-center justify-center"
                  title="Teks Statis"
                >
                  <font-awesome-icon icon="fa-solid fa-font" class="text-lg text-text/50 group-hover:text-primary" />
                </button>

                <!-- Dropdown -->
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 translate-y-2 scale-95"
                  enter-to-class="opacity-100 translate-y-0 scale-100"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0 scale-100"
                  leave-to-class="opacity-0 translate-y-2 scale-95"
                >
                  <div
                    v-if="isDynamicMenuOpen"
                    class="absolute bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 bg-secondary/95 backdrop-blur-md border border-primary/20 rounded-xl shadow-xl flex flex-col min-w-[180px] overflow-hidden z-20 pb-1"
                  >
                    <div
                      class="px-3 py-2 text-[10px] font-bold text-text/50 uppercase tracking-widest border-b border-primary/10 mb-1 bg-background/50"
                    >
                      Pilih Variabel
                    </div>

                    <button
                      @click="addSpecificText('produk')"
                      class="px-4 py-2.5 text-sm text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-3 text-text/80"
                    >
                      <font-awesome-icon icon="fa-solid fa-box" class="w-4 opacity-70" /> Nama Produk
                    </button>

                    <button
                      @click="addSpecificText('sku')"
                      class="px-4 py-2.5 text-sm text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-3 text-text/80"
                    >
                      <font-awesome-icon icon="fa-solid fa-barcode" class="w-4 opacity-70" /> SKU Produk
                    </button>


                    <button
                      @click="addSpecificText('harga_rp')"
                      class="px-4 py-2.5 text-sm text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-3 text-text/80"
                    >
                      <font-awesome-icon icon="fa-solid fa-money-bill" class="w-4 opacity-70" /> Harga (Rp)
                    </button>

                    <button
                      @click="addSpecificText('tanggal')"
                      class="px-4 py-2.5 text-sm text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-3 text-text/80"
                    >
                      <font-awesome-icon icon="fa-solid fa-calendar-day" class="w-4 opacity-70" /> Tanggal Cetak
                    </button>

                    <div class="h-px bg-primary/10 my-1 mx-2"></div>

                    <button
                      @click="addDynamicText"
                      class="px-4 py-2.5 text-sm text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-3 text-text/80"
                    >
                      <font-awesome-icon icon="fa-solid fa-plus" class="w-4 opacity-70" /> Custom Data
                    </button>
                  </div>
                </transition>
              </div>
              <button
                @click="isMediaPickerOpen = true"
                class="p-3 bg-background border border-secondary rounded-xl hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm group w-12 h-12 flex items-center justify-center"
                title="Pilih Gambar"
              >
                <font-awesome-icon icon="fa-solid fa-image" class="text-lg text-text/50 group-hover:text-primary" />
              </button>
              <div class="w-px h-8 bg-primary/20 mx-1 self-center"></div>
              <button
                @click="addRectangle"
                class="p-3 bg-background border border-secondary rounded-xl hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm group w-12 h-12 flex items-center justify-center"
                title="Kotak"
              >
                <font-awesome-icon icon="fa-solid fa-square" class="text-lg text-text/50 group-hover:text-primary" />
              </button>
              <button
                @click="addCircle"
                class="p-3 bg-background border border-secondary rounded-xl hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm group w-12 h-12 flex items-center justify-center"
                title="Bulat"
              >
                <font-awesome-icon icon="fa-solid fa-circle" class="text-lg text-text/50 group-hover:text-primary" />
              </button>
              <button
                @click="addLine"
                class="p-3 bg-background border border-secondary rounded-xl hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm group w-12 h-12 flex items-center justify-center"
                title="Garis"
              >
                <font-awesome-icon icon="fa-solid fa-minus" class="text-lg text-text/50 group-hover:text-primary" />
              </button>

              <div class="w-px h-8 bg-primary/20 mx-1 self-center"></div>

              <button
                @click="isBarcodeModalOpen = true"
                class="p-3 bg-background border border-secondary rounded-xl hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm group w-12 h-12 flex items-center justify-center"
                title="Barcode / QR Code"
              >
                <font-awesome-icon icon="fa-solid fa-qrcode" class="text-lg text-text/50 group-hover:text-primary" />
              </button>

              <div class="w-px h-8 bg-primary/20 mx-1 self-center"></div>

              <!-- Undo / Redo Buttons -->
              <button
                @click="undo"
                :disabled="historyIndex <= 0"
                class="p-3 bg-background border border-secondary rounded-xl transition-all shadow-sm group w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                :class="historyIndex > 0 ? 'hover:border-primary/40 hover:text-primary hover:bg-primary/5' : ''"
                title="Undo (Ctrl+Z)"
              >
                <font-awesome-icon
                  icon="fa-solid fa-rotate-left"
                  class="text-lg"
                  :class="historyIndex > 0 ? 'text-text/50 group-hover:text-primary' : 'text-text/30'"
                />
              </button>
              <button
                @click="redo"
                :disabled="historyIndex >= historyStack.length - 1"
                class="p-3 bg-background border border-secondary rounded-xl transition-all shadow-sm group w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  historyIndex < historyStack.length - 1
                    ? 'hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                    : ''
                "
                title="Redo (Ctrl+Y)"
              >
                <font-awesome-icon
                  icon="fa-solid fa-rotate-right"
                  class="text-lg"
                  :class="
                    historyIndex < historyStack.length - 1 ? 'text-text/50 group-hover:text-primary' : 'text-text/30'
                  "
                />
              </button>
            </div>
          </div>

          <!-- Toolbar Kanan (Layers List) -->
          <div class="w-full lg:w-72 border-l border-primary/10 flex flex-col bg-secondary/30 overflow-y-auto">
            <div class="p-4 border-b border-primary/10 sticky top-0 bg-secondary/90 backdrop-blur-sm z-10">
              <h4 class="text-xs font-bold text-text/50 uppercase tracking-widest flex items-center gap-2">
                <font-awesome-icon icon="fa-solid fa-layer-group" /> Daftar Layer
              </h4>
            </div>

            <div class="flex-1 p-2 flex flex-col gap-1">
              <div v-if="canvasLayers.length === 0" class="text-center text-text/40 text-xs py-8">Belum ada elemen</div>
              <div
                v-for="(layer, index) in canvasLayers"
                :key="layer.id"
                draggable="true"
                @dragstart="e => onDragStart(e, index)"
                @dragover="e => onDragOver(e, index)"
                @drop="e => onDrop(e, index)"
                @dragend="onDragEnd"
                @click="selectLayer(layer)"
                class="flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all"
                :class="[
                  layer.isActive
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-background border-secondary hover:border-primary/50',
                  dragOverLayerIndex === index ? 'border-t-2 border-t-primary' : '',
                  draggedLayerIndex === index ? 'opacity-50' : ''
                ]"
              >
                <!-- Layer Info -->
                <div class="flex items-center gap-3 overflow-hidden">
                  <div class="flex items-center gap-2 cursor-grab hover:text-primary text-text/30" title="Geser (Drag)">
                    <font-awesome-icon icon="fa-solid fa-grip-vertical" class="text-[10px]" />
                    <span class="text-[10px] font-mono font-bold w-3 text-center">{{ index + 1 }}</span>
                  </div>
                  <div
                    class="w-6 h-6 rounded bg-secondary/50 flex items-center justify-center shrink-0"
                    :class="layer.isActive ? 'text-primary' : 'text-text/50'"
                  >
                    <font-awesome-icon
                      v-if="layer.type === 'i-text' || layer.type === 'text'"
                      icon="fa-solid fa-font"
                      class="text-xs"
                    />
                    <font-awesome-icon v-else-if="layer.type === 'rect'" icon="fa-solid fa-square" class="text-xs" />
                    <font-awesome-icon v-else-if="layer.type === 'circle'" icon="fa-solid fa-circle" class="text-xs" />
                    <font-awesome-icon v-else-if="layer.type === 'line'" icon="fa-solid fa-minus" class="text-xs" />
                    <font-awesome-icon v-else-if="layer.type === 'image'" icon="fa-solid fa-image" class="text-xs" />
                    <font-awesome-icon v-else icon="fa-solid fa-cube" class="text-xs" />
                  </div>
                  <span
                    class="text-xs font-semibold truncate"
                    :class="layer.isActive ? 'text-primary' : 'text-text/80'"
                  >
                    {{ layer.text }}
                  </span>
                </div>

                <!-- Layer Actions -->
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    @click.stop="bringLayerForward(layer)"
                    :disabled="layer.isTop"
                    class="w-6 h-6 rounded flex items-center justify-center transition-colors"
                    :class="
                      layer.isTop
                        ? 'text-secondary/20 cursor-not-allowed'
                        : 'text-text/50 hover:bg-secondary hover:text-primary'
                    "
                    title="Naikkan Layer"
                  >
                    <font-awesome-icon icon="fa-solid fa-chevron-up" class="text-[10px]" />
                  </button>
                  <button
                    @click.stop="sendLayerBackwards(layer)"
                    :disabled="layer.isBottom"
                    class="w-6 h-6 rounded flex items-center justify-center transition-colors"
                    :class="
                      layer.isBottom
                        ? 'text-secondary/20 cursor-not-allowed'
                        : 'text-text/50 hover:bg-secondary hover:text-primary'
                    "
                    title="Turunkan Layer"
                  >
                    <font-awesome-icon icon="fa-solid fa-chevron-down" class="text-[10px]" />
                  </button>
                  <div class="w-px h-4 bg-secondary mx-0.5"></div>
                  <button
                    @click.stop="toggleLockLayer(layer)"
                    class="w-6 h-6 rounded flex items-center justify-center transition-colors"
                    :class="
                      layer.isLocked
                        ? 'text-primary bg-primary/10 hover:bg-primary/20'
                        : 'text-text/30 hover:text-primary hover:bg-primary/5'
                    "
                    :title="layer.isLocked ? 'Buka Kunci' : 'Kunci Layer'"
                  >
                    <font-awesome-icon
                      :icon="layer.isLocked ? 'fa-solid fa-lock' : 'fa-solid fa-unlock'"
                      class="text-[10px]"
                    />
                  </button>
                  <button
                    @click.stop="removeLayer(layer)"
                    class="w-6 h-6 rounded flex items-center justify-center text-text/30 hover:bg-danger/10 hover:text-danger transition-colors"
                    title="Hapus Layer"
                  >
                    <font-awesome-icon icon="fa-solid fa-trash" class="text-[10px]" />
                  </button>
                </div>
              </div>
            </div>

            <!-- MINIMAP -->
            <div class="mt-auto border-t border-primary/10 p-4 bg-background/50 sticky bottom-0 z-20">
              <h4
                class="text-[10px] font-bold text-text/50 uppercase tracking-widest mb-2 flex items-center justify-between"
              >
                <span class="flex items-center gap-2"><font-awesome-icon icon="fa-solid fa-map" /> Navigator</span>
                <div class="flex items-center gap-2">
                  <button
                    @click="centerCanvas"
                    class="text-primary hover:bg-primary/10 w-5 h-5 rounded flex items-center justify-center transition-colors"
                    title="Pusatkan Kanvas"
                  >
                    <font-awesome-icon icon="fa-solid fa-compress" />
                  </button>
                  <span class="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded" title="Zoom">
                    {{ Math.round(canvasZoom * 100) }}%
                  </span>
                </div>
              </h4>
              <div
                class="w-full h-32 bg-secondary rounded-xl border border-primary/20 relative flex items-center justify-center"
              >
                <div
                  class="relative shadow-sm bg-white overflow-hidden border border-gray-300"
                  :style="{ width: minimapImgWidth + 'px', height: minimapImgHeight + 'px' }"
                >
                  <img v-if="minimapUrl" :src="minimapUrl" class="w-full h-full object-contain pointer-events-none" />

                  <!-- Viewport Indicator -->
                  <div
                    class="absolute border-2 border-primary bg-primary/10 pointer-events-none transition-all duration-75"
                    :style="{
                      left: `${minimapRect.left}%`,
                      top: `${minimapRect.top}%`,
                      width: `${minimapRect.width}%`,
                      height: `${minimapRect.height}%`
                    }"
                  ></div>
                </div>
              </div>
              <p class="text-[9px] text-text/40 text-center mt-2 italic font-medium">
                <span class="font-bold">Alt + Drag</span> untuk menggeser kanvas
              </p>
            </div>
          </div>
        </div>

        <!-- Footer / Action -->
        <div
          class="p-6 border-t border-primary/10 bg-background/50 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <!-- PENGATURAN KANVAS -->
          <div class="flex items-center gap-2 mr-auto bg-secondary/50 px-3 py-1.5 rounded-xl border border-primary/10">
            <span class="text-[10px] font-bold text-text/50 uppercase tracking-widest whitespace-nowrap">
              <font-awesome-icon icon="fa-solid fa-expand" /> Kanvas (mm)
            </span>
            <input
              v-model.number="paperWidth"
              @change="applyPaperSize"
              type="number"
              min="10"
              class="w-16 bg-background border border-primary/20 rounded-md px-2 py-1 text-sm font-bold text-text focus:outline-none focus:border-primary text-center"
              title="Lebar"
            />
            <span class="text-text/50 text-xs font-bold">x</span>
            <input
              v-model.number="paperHeight"
              @change="applyPaperSize"
              type="number"
              min="10"
              class="w-16 bg-background border border-primary/20 rounded-md px-2 py-1 text-sm font-bold text-text focus:outline-none focus:border-primary text-center"
              title="Tinggi"
            />
          </div>

          <div class="flex-1 w-full max-w-sm ml-auto">
            <input
              v-model="templateName"
              type="text"
              placeholder="Beri nama template ini..."
              class="w-full bg-secondary border border-primary/20 rounded-xl px-4 py-2.5 text-sm font-bold text-text focus:outline-none focus:border-primary shadow-inner"
            />
          </div>

          <div class="flex gap-3">
            <button
              @click="$emit('close')"
              class="px-6 py-2.5 rounded-xl font-bold text-text bg-secondary border border-primary/20 hover:bg-background transition-colors"
            >
              Batal
            </button>
            <button
              @click="saveTemplate"
              :disabled="isSaving"
              class="px-8 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50"
            >
              <font-awesome-icon v-if="isSaving" icon="fa-solid fa-spinner" class="animate-spin" />
              <font-awesome-icon v-else icon="fa-solid fa-save" />
              {{ isSaving ? 'Menyimpan...' : 'Simpan Template' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- Media Picker Modal -->
  <MediaPickerModal :show="isMediaPickerOpen" @close="isMediaPickerOpen = false" @select="insertMediaToCanvas" />

  <!-- Barcode / QR Code Modal -->
  <transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isBarcodeModalOpen"
      class="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        class="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-primary/20 overflow-hidden"
        @click.stop
      >
        <div class="px-6 py-4 border-b border-primary/10 flex justify-between items-center bg-secondary/30">
          <h3 class="text-lg font-black text-text flex items-center gap-2">
            <font-awesome-icon icon="fa-solid fa-qrcode" class="text-primary" /> Buat Barcode / QR
          </h3>
          <button
            @click="isBarcodeModalOpen = false"
            class="text-text/50 hover:text-danger transition-colors w-8 h-8 rounded-full hover:bg-danger/10 flex items-center justify-center"
          >
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-bold text-text/70 mb-2">Tipe Kode</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="barcodeConfig.type = 'barcode'"
                class="py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all"
                :class="
                  barcodeConfig.type === 'barcode'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-secondary text-text/60 hover:border-primary/50'
                "
              >
                <font-awesome-icon icon="fa-solid fa-barcode" class="text-2xl" />
                <span class="text-xs font-bold">Barcode (Code 128)</span>
              </button>
              <button
                @click="barcodeConfig.type = 'qrcode'"
                class="py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all"
                :class="
                  barcodeConfig.type === 'qrcode'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-secondary text-text/60 hover:border-primary/50'
                "
              >
                <font-awesome-icon icon="fa-solid fa-qrcode" class="text-2xl" />
                <span class="text-xs font-bold">QR Code</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-text/70 mb-2">Nilai / Variabel Data</label>
            <input
              type="text"
              v-model="barcodeConfig.value"
              placeholder="Contoh: {{ sku }} atau 12345678"
              class="w-full bg-background border border-primary/20 rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p class="text-xs text-text/50 mt-2">
              Gunakan format
              <code class="bg-secondary px-1 py-0.5 rounded text-primary" v-pre>{{ nama_variabel }}</code> untuk data
              dinamis dari database.
            </p>
          </div>

          <div v-if="barcodeConfig.type === 'barcode'" class="flex items-center gap-3 pt-2">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="barcodeConfig.displayValue" class="sr-only peer" />
              <div
                class="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"
              ></div>
            </label>
            <span class="text-sm font-bold text-text/80">Tampilkan Teks di Bawah Barcode</span>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-primary/10 bg-secondary/30 flex justify-end gap-3">
          <button
            @click="isBarcodeModalOpen = false"
            class="px-4 py-2 text-sm font-bold text-text/70 hover:text-text transition-colors"
          >
            Batal
          </button>
          <button
            @click="addBarcode"
            class="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center gap-2"
          >
            <font-awesome-icon icon="fa-solid fa-check" /> Tambahkan ke Kanvas
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
