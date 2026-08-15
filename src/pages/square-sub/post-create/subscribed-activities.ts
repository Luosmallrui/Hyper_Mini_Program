export interface SubscribedActivityItem {
  id: number
  title: string
  type: string
}

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

// 订阅类型（venue/activity/party）仅用于展示区分，不再过滤场地
const normalizeType = (item: any, activity: any) => (
  readText(item?.type, item?.detail_type, activity?.type, activity?.detail_type).toLowerCase()
)

export const normalizeSubscribedActivities = (source: any[]): SubscribedActivityItem[] => {
  const unique = new Map<number, SubscribedActivityItem>()

  source.forEach((item) => {
    const activity = item?.activity || item?.activity_info || item?.activity_detail || null
    const type = normalizeType(item, activity) || 'activity'

    // 顶层 id 是 activities.id（发帖关联 activity_id 用这个）；follow_target_id 是关注目标，不参与
    const id = readPositiveNumber(item?.activity_id, activity?.id, item?.source_id, item?.id)
    const title = readText(activity?.name, activity?.title, item?.name, item?.title)
    if (!id || !title || unique.has(id)) return

    unique.set(id, { id, title, type })
  })

  return Array.from(unique.values())
}
