export interface OrderViewer {
  id: number
  real_name: string
  id_card: string
  phone: string
}

export const toggleViewerSelection = (
  selectedIds: number[],
  viewerId: number,
  limit: number,
) => {
  if (selectedIds.includes(viewerId)) {
    return selectedIds.filter((id) => id !== viewerId)
  }
  if (limit <= 1) return [viewerId]
  if (selectedIds.length >= limit) return selectedIds
  return [...selectedIds, viewerId]
}

export const buildOrderViewerFields = (viewers: OrderViewer[]) => ({
  viewer_ids: viewers.map((viewer) => viewer.id),
  viewers: viewers.map(({ id, real_name, id_card, phone }) => ({
    id,
    real_name,
    id_card,
    phone,
  })),
})
