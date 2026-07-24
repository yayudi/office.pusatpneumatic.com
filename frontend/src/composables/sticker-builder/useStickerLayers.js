import { shallowRef, ref } from 'vue'

export function useStickerLayers(getFabricCanvas, getActiveObject, saveHistory) {
  const canvasLayers = shallowRef([])
  const draggedLayerIndex = ref(null)
  const dragOverLayerIndex = ref(null)

  const syncLayers = () => {
    const canvas = getFabricCanvas()
    if (!canvas) return
    const allObjects = canvas.getObjects()
    const currentActive = getActiveObject()

    canvasLayers.value = allObjects
      .map((obj, idx) => {
        let iconType = obj.type
        let text = 'Layer ' + idx
        
        if (obj.id === 'paper-bg') {
          text = 'Latar Kertas'
          iconType = 'rect'
        } else if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
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

        let isLocked = !obj.selectable && !obj.evented && !obj.hasControls
        if (obj.id === 'paper-bg') {
          isLocked = true
        }

        return {
          id: obj.id,
          obj: obj,
          type: iconType,
          text: text,
          isActive: currentActive === obj,
          isTop: idx === allObjects.length - 1,
          isBottom: idx === 0,
          isLocked
        }
      })
      .reverse()

    if (saveHistory) saveHistory()
  }

  // Drag & Drop
  const onDragStart = (e, idx) => {
    if (canvasLayers.value[idx].id === 'paper-bg') {
      e.preventDefault()
      return
    }
    draggedLayerIndex.value = idx
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e, idx) => {
    e.preventDefault()
    dragOverLayerIndex.value = idx
  }
  const onDrop = (e, dropIdx) => {
    e.preventDefault()
    const canvas = getFabricCanvas()
    const dragIdx = draggedLayerIndex.value
    if (dragIdx === null || dragIdx === dropIdx || !canvas) {
      draggedLayerIndex.value = null
      dragOverLayerIndex.value = null
      return
    }

    const newLayers = [...canvasLayers.value]
    const paperIdx = newLayers.findIndex(l => l.id === 'paper-bg')
    
    const draggedLayer = newLayers[dragIdx]
    newLayers.splice(dragIdx, 1)
    newLayers.splice(dropIdx, 0, draggedLayer)

    // Force paper-bg back to bottom if it accidentally moved
    if (paperIdx !== -1) {
      const currentPaperIdx = newLayers.findIndex(l => l.id === 'paper-bg')
      if (currentPaperIdx !== newLayers.length - 1) {
        const paper = newLayers.splice(currentPaperIdx, 1)[0]
        newLayers.push(paper)
      }
    }

    const totalLayers = newLayers.length
    for (let i = 0; i < totalLayers; i++) {
      const layer = newLayers[i]
      canvas.moveObjectTo(layer.obj, totalLayers - 1 - i)
    }

    canvas.requestRenderAll()
    syncLayers()

    draggedLayerIndex.value = null
    dragOverLayerIndex.value = null
  }
  const onDragEnd = () => {
    draggedLayerIndex.value = null
    dragOverLayerIndex.value = null
  }

  // Interactions
  const selectLayer = layer => {
    const canvas = getFabricCanvas()
    if (!canvas) return
    canvas.setActiveObject(layer.obj)
    canvas.requestRenderAll()
  }
  const bringLayerForward = layer => {
    const canvas = getFabricCanvas()
    if (!canvas || layer.id === 'paper-bg') return
    canvas.bringObjectForward(layer.obj)
    canvas.requestRenderAll()
    syncLayers()
  }
  const sendLayerBackwards = layer => {
    const canvas = getFabricCanvas()
    if (!canvas || layer.isBottom || layer.id === 'paper-bg') return
    canvas.sendObjectBackwards(layer.obj)
    const paper = canvas.getObjects().find(o => o.id === 'paper-bg')
    if (paper) canvas.moveObjectTo(paper, 0)
    canvas.requestRenderAll()
    syncLayers()
  }
  const removeLayer = layer => {
    const canvas = getFabricCanvas()
    if (!canvas) return
    canvas.remove(layer.obj)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    syncLayers()
  }
  const toggleLockLayer = layer => {
    const canvas = getFabricCanvas()
    if (!canvas || layer.id === 'paper-bg') return
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
    if (newLockStatus) canvas.discardActiveObject()
    canvas.requestRenderAll()
    syncLayers()
  }

  return {
    canvasLayers,
    draggedLayerIndex,
    dragOverLayerIndex,
    syncLayers,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    selectLayer,
    bringLayerForward,
    sendLayerBackwards,
    removeLayer,
    toggleLockLayer
  }
}
