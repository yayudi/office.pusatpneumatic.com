// frontend/src/composables/useTaskGrouping.js
import { computed } from 'vue'

export function useTaskGrouping(itemsRef, filterStateRef) {
  const groupedTasks = computed(() => {
    const rawItems = itemsRef.value || []
    const filter = filterStateRef.value

    if (rawItems.length === 0) return []

    let filtered = rawItems

    if (filter.startDate || filter.endDate) {
      const start = filter.startDate
        ? new Date(filter.startDate + 'T00:00:00')
        : new Date('2000-01-01')

      const end = filter.endDate ? new Date(filter.endDate + 'T23:59:59') : new Date('2100-12-31')

      filtered = filtered.filter((i) => {
        const d = new Date(i.created_at || i.order_date)
        return d >= start && d <= end
      })
    }

    if (filter.source !== 'ALL') {
      filtered = filtered.filter((i) => i.source === filter.source)
    }

    if (filter.locationPurpose && filter.locationPurpose !== 'ALL') {
      filtered = filtered.filter((i) => (i.location_purpose || 'DISPLAY') === filter.locationPurpose)
    }

    if (filter.search) {
      const q = filter.search.toLowerCase()
      filtered = filtered.filter(
        (i) =>
          (i.original_invoice_id || '').toLowerCase().includes(q) ||
          (i.sku || '').toLowerCase().includes(q) ||
          (i.product_name || '').toLowerCase().includes(q) ||
          (i.customer_name || '').toLowerCase().includes(q) ||
          (i.shop_name || '').toLowerCase().includes(q),
      )
    }

    if (filter.shopName && filter.shopName !== 'ALL') {
      filtered = filtered.filter((i) => i.shop_name === filter.shopName)
    }

    if (filter.stockStatus !== 'ALL') {
      filtered = filtered.filter((i) => {
        const qty = Number(i.quantity || 0)
        const stock = Number(i.available_stock || 0)
        const hasLoc = !!i.location_code

        if (filter.stockStatus === 'READY') return hasLoc && stock >= qty && i.status !== 'BACKORDER'
        if (filter.stockStatus === 'ISSUE') return hasLoc && stock < qty && i.status !== 'BACKORDER'
        if (filter.stockStatus === 'EMPTY') return !hasLoc || i.status === 'BACKORDER'
        return true
      })
    }

    if (filtered.length === 0) return []

    const groups = new Map()

    filtered.forEach((item) => {
      const invId = item.original_invoice_id || `MANUAL-${item.picking_list_id}`

      if (!groups.has(invId)) {
        groups.set(invId, {
          id: item.picking_list_id,
          invoice: invId,
          source: item.source || 'Unknown',
          location_purpose: item.location_purpose,
          customer_name: item.customer_name,
          shop_name: item.shop_name,
          status: item.status,
          marketplace_status: item.marketplace_status,
          order_date: item.order_date,
          created_at: item.created_at,
          locations: {},
        })
      }

      const group = groups.get(invId)
      const locKey = item.location_code || 'Unknown Loc'

      if (!group.locations[locKey]) {
        group.locations[locKey] = []
      }
      group.locations[locKey].push(item)
    })

    const result = Array.from(groups.values())

    const sortKey = filter.sortBy
    result.sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)

      if (sortKey === 'oldest') return dateA - dateB
      return dateB - dateA
    })

    return result
  })

  return { groupedTasks }
}
