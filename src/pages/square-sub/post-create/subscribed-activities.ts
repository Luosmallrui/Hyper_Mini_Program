export interface SubscribedActivityItem {
  id: number
  title: string
  type: string
}

const ACTIVITY_TYPES = new Set(['活动', '派对', 'activity', 'event', 'party'])
const VENUE_TYPES = new Set(['场地', 'venue', 'club', 'merchant'])

const readText = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

const readPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return 0
}

const normalizeType = (item: any, activity: any) => (
  readText(activity?.type, activity?.detail_type, item?.detail_type, item?.type).toLowerCase()
)

const isVenueSubscription = (type: string) => VENUE_TYPES.has(type)
const isActivitySubscription = (item: any, activity: any, type: string) => {
  if (ACTIVITY_TYPES.has(type)) return true
  return Boolean(item?.activity_id || activity?.id)
}

export const normalizeSubscribedActivities = (source: any[]): SubscribedActivityItem[] => {
  const unique = new Map<number, SubscribedActivityItem>()

  source.forEach((item) => {
    const activity = item?.activity || item?.activity_info || item?.activity_detail || null
    const type = normalizeType(item, activity) || 'activity'
    if (isVenueSubscription(type) || !isActivitySubscription(item, activity, type)) return

    const id = readPositiveNumber(item?.activity_id, activity?.id, item?.source_id, item?.id)
    const title = readText(activity?.name, activity?.title, item?.name, item?.title)
    if (!id || !title || unique.has(id)) return

    unique.set(id, { id, title, type })
  })

  return Array.from(unique.values())
}
