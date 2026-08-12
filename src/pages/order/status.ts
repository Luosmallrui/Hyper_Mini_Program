export type OrderTabKey =
  | 'all'
  | '0'
  | '1'
  | '2'
  | 'refund:pending_review'
  | 'refund:refunding'
  | 'refund:refunded'
  | 'refund:rejected'
  | 'refund:cancelled'

export type RefundStatus =
  | 'pending_review'
  | 'refunding'
  | 'refunded'
  | 'rejected'
  | 'cancelled'
  | string

export interface OrderStatusLike {
  status: number
  refund_status?: RefundStatus
  refund_status_text?: string
}

export const getOrderTabs = (): Array<{ key: OrderTabKey; label: string }> => [
  { key: 'all', label: '全部' },
  { key: '0', label: '待支付' },
  { key: '1', label: '待使用' },
  { key: '2', label: '已使用' },
  { key: 'refund:pending_review', label: '待审核' },
  { key: 'refund:refunding', label: '退款中' },
  { key: 'refund:refunded', label: '已退款' },
  { key: 'refund:rejected', label: '已驳回' },
  { key: 'refund:cancelled', label: '已取消' },
]

export const buildOrderListQuery = (tabKey: string, page: number, size: number) => {
  const query: Record<string, number | string> = { page, size }
  if (tabKey === 'all') return query
  if (tabKey.startsWith('refund:')) {
    query.refund_status = tabKey.replace('refund:', '')
    return query
  }
  query.status = Number(tabKey)
  return query
}

export const isPendingPaymentOrder = (order: OrderStatusLike) => Number(order.status) === 0 && !order.refund_status

export const isOrderInTab = (order: OrderStatusLike, tabKey: string) => {
  if (tabKey === 'all') return true
  if (tabKey.startsWith('refund:')) {
    return String(order.refund_status || '') === tabKey.replace('refund:', '')
  }
  if (order.refund_status && REFUND_STATUS_CONFIG[String(order.refund_status)]) return false
  return Number(order.status) === Number(tabKey)
}

export const filterOrdersByTab = <T extends OrderStatusLike>(orders: T[], tabKey: string): T[] =>
  tabKey === 'all' ? orders : orders.filter((order) => isOrderInTab(order, tabKey))

const REFUND_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: '待审核', color: '#faad14' },
  refunding: { label: '退款中', color: '#faad14' },
  refunded: { label: '已退款', color: '#52c41a' },
  rejected: { label: '已驳回', color: '#ff4d4f' },
  cancelled: { label: '已取消', color: '#9c9c9c' },
}

const STATUS_CONFIG: Record<number, { label: string; color: string; showQR: boolean; showRefund: boolean; actionText?: string }> = {
  0: { label: '待支付', color: '#faad14', showQR: false, showRefund: false, actionText: '继续支付' },
  1: { label: '待使用', color: '#52c41a', showQR: true, showRefund: false },
  2: { label: '已使用', color: '#9c9c9c', showQR: false, showRefund: false, actionText: '查看详情' },
  3: { label: '已取消', color: '#9c9c9c', showQR: false, showRefund: false, actionText: '查看详情' },
  4: { label: '退款中', color: '#faad14', showQR: false, showRefund: false, actionText: '查看详情' },
  5: { label: '已退款', color: '#52c41a', showQR: false, showRefund: false, actionText: '查看详情' },
  6: { label: '已驳回', color: '#ff4d4f', showQR: false, showRefund: false, actionText: '查看详情' },
}

export const getOrderStatusConfig = (order: OrderStatusLike) => {
  const refundConfig = (order.refund_status && order.refund_status !== 'cancelled') ? REFUND_STATUS_CONFIG[String(order.refund_status)] : null
  if (refundConfig) {
    return {
      ...refundConfig,
      label: order.refund_status_text || refundConfig.label,
      showQR: false,
      showRefund: false,
      actionText: '查看详情',
    }
  }
  return STATUS_CONFIG[Number(order.status)] || STATUS_CONFIG[1]
}
