import { request } from './request'

export type NotificationType = 'system' | 'interaction' | 'payment'

export interface NotificationItem {
  id: number
  type: string
  title: string
  content: string
  /** JSON 字符串，按 type 解析跳转参数（note_id / activity_id / order_no 等） */
  payload: string
  is_read: boolean
  created_at: string
}

export interface NotificationUnreadCount {
  total: number
  system: number
  interaction: number
  payment: number
}

const EMPTY_UNREAD: NotificationUnreadCount = { total: 0, system: 0, interaction: 0, payment: 0 }

/** 未读数：GET /api/v1/notifications/unread-count */
export const fetchNotificationUnreadCount = async (): Promise<NotificationUnreadCount> => {
  try {
    const res = await request({ url: '/api/v1/notifications/unread-count', method: 'GET' })
    const data: any = res?.data?.data
    return {
      total: Number(data?.total || 0),
      system: Number(data?.system || 0),
      interaction: Number(data?.interaction || 0),
      payment: Number(data?.payment || 0),
    }
  } catch (error) {
    console.warn('[notifications] unread count failed:', error)
    return { ...EMPTY_UNREAD }
  }
}

/** 通知列表：GET /api/v1/notifications?type=&page=&size= */
export const fetchNotifications = async (
  type?: NotificationType,
  page = 1,
  size = 20,
): Promise<{ list: NotificationItem[]; total: number }> => {
  const query = [`page=${page}`, `size=${size}`]
  if (type) query.push(`type=${type}`)
  try {
    const res = await request({ url: `/api/v1/notifications?${query.join('&')}`, method: 'GET' })
    const data: any = res?.data?.data
    const list = Array.isArray(data?.list) ? data.list : []
    return {
      list: list.map((item: any) => ({
        id: Number(item?.id || 0),
        type: String(item?.type || ''),
        title: String(item?.title || ''),
        content: String(item?.content || ''),
        payload: typeof item?.payload === 'string' ? item.payload : JSON.stringify(item?.payload || {}),
        is_read: Boolean(item?.is_read),
        created_at: String(item?.created_at || ''),
      })).filter((item: NotificationItem) => item.id > 0),
      total: Number(data?.total || 0),
    }
  } catch (error) {
    console.warn('[notifications] list failed:', error)
    return { list: [], total: 0 }
  }
}

/** 标记已读：POST /api/v1/notifications/read {ids}（幂等） */
export const markNotificationsRead = async (ids: number[]): Promise<void> => {
  const validIds = ids.filter((id) => Number(id) > 0)
  if (validIds.length === 0) return
  await request({
    url: '/api/v1/notifications/read',
    method: 'POST',
    data: { ids: validIds },
  })
}

/** 全部已读：POST /api/v1/notifications/read-all {type?}，type 缺省为全部类型 */
export const markAllNotificationsRead = async (type?: NotificationType): Promise<void> => {
  await request({
    url: '/api/v1/notifications/read-all',
    method: 'POST',
    data: type ? { type } : {},
  })
}

/** 解析 payload JSON 并返回小程序内跳转地址，无跳转目标返回空串 */
export const resolveNotificationTargetUrl = (payload: string): string => {
  if (!payload) return ''
  let data: any = null
  try {
    data = JSON.parse(payload)
  } catch (_e) {
    return ''
  }
  const noteId = String(data?.note_id || '')
  if (noteId) return `/pages/square-sub/post-detail/index?id=${encodeURIComponent(noteId)}`
  const activityId = String(data?.activity_id || '')
  if (activityId) return `/pages/activity/index?id=${encodeURIComponent(activityId)}`
  const orderNo = String(data?.order_no || data?.orderNo || '')
  if (orderNo) return `/pages/order-sub/order-detail/index?orderNo=${encodeURIComponent(orderNo)}`
  return ''
}
