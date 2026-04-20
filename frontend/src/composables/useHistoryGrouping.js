// frontend/src/composables/useHistoryGrouping.js
import { computed } from 'vue'

export function useHistoryGrouping(itemsRef, filterStateRef) {
  const groupedHistory = computed(() => {
    const rawItems = itemsRef.value || []
    const filter = filterStateRef.value
    let filtered = rawItems

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
          (i.customer_name || '').toLowerCase().includes(q),
      )
    }
    if (filter.startDate || filter.endDate) {
      const start = filter.startDate
        ? new Date(filter.startDate + 'T00:00:00')
        : new Date('2000-01-01')
      const end = filter.endDate ? new Date(filter.endDate + 'T23:59:59') : new Date('2100-12-31')

      filtered = filtered.filter((i) => {
        const d = new Date(i.order_date || i.created_at)
        return d >= start && d <= end
      })
    }

    if (filtered.length === 0) return []

    const groups = new Map()

    filtered.forEach((item) => {
      const rawId = item.original_invoice_id || `INV-MANUAL-${item.picking_list_id}`
      const cleanId = rawId.includes('_REV_') ? rawId.split('_REV_')[0] : rawId

      if (!groups.has(cleanId)) {
        groups.set(cleanId, {
          invoice: cleanId,
          source: item.source,
          location_purpose: item.location_purpose,
          customer_name: item.customer_name,
          order_date: item.order_date,
          sessionsMap: new Map(),
        })
      }

      const group = groups.get(cleanId)
      const listId = item.picking_list_id

      if (!group.sessionsMap.has(listId)) {
        group.sessionsMap.set(listId, {
          id: listId,
          raw_invoice_id: rawId,
          status: item.status,
          marketplace_status: item.marketplace_status,
          created_at: item.created_at,
          total_items: 0,
          items: [],
        })
      }

      const session = group.sessionsMap.get(listId)
      session.items.push(item)
      session.total_items += Number(item.quantity || 0)
    })

    const finalCards = Array.from(groups.values()).map((group) => {
      const sessions = Array.from(group.sessionsMap.values()).sort((a, b) => b.id - a.id)
      const latestSession = sessions[0]
      const historyLogs = sessions.slice(1)

      return {
        ...latestSession,
        invoice: group.invoice,
        source: group.source,
        location_purpose: group.location_purpose,
        customer_name: group.customer_name,
        historyLogs: historyLogs,
      }
    })

    const sortKey = filter.sortBy
    return finalCards.sort((a, b) => {
      if (sortKey === 'oldest') return a.id - b.id
      if (sortKey === 'invoice_asc') return a.invoice.localeCompare(b.invoice)
      return b.id - a.id
    })
  })

  return { groupedHistory }
}
