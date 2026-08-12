import {
  buildOrderListQuery,
  filterOrdersByTab,
  getOrderStatusConfig,
  getOrderTabs,
  isPendingPaymentOrder,
} from '../src/pages/order/status'
import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('order status tabs', () => {
  it('includes refund status tabs in the existing order page', () => {
    expect(getOrderTabs().map((tab) => tab.label)).toEqual([
      '全部',
      '待支付',
      '待使用',
      '已使用',
      '待审核',
      '退款中',
      '已退款',
      '已驳回',
      '已取消',
    ])
  })

  it('builds order list query for normal and refund status tabs', () => {
    expect(buildOrderListQuery('0', 1, 10)).toEqual({ page: 1, size: 10, status: 0 })
    expect(buildOrderListQuery('refund:pending_review', 2, 10)).toEqual({
      page: 2,
      size: 10,
      refund_status: 'pending_review',
    })
  })

  it('maps pending payment and refund states to visible actions', () => {
    expect(getOrderStatusConfig({ status: 0 }).actionText).toBe('继续支付')
    expect(isPendingPaymentOrder({ status: 0 })).toBe(true)
    expect(isPendingPaymentOrder({ status: 0, refund_status: 'refunding' })).toBe(false)
    expect(getOrderStatusConfig({ status: 1 }).showRefund).toBe(false)
    expect(getOrderStatusConfig({ status: 1, refund_status: 'pending_review' }).label).toBe('待审核')
    expect(getOrderStatusConfig({ status: 1, refund_status: 'rejected' }).label).toBe('已驳回')
  })

  it('filters orders locally with the same tab semantics as the visible labels', () => {
    const orders = [
      { order_no: 'pending', status: 0 },
      { order_no: 'paid', status: 1 },
      { order_no: 'used', status: 2 },
      { order_no: 'refunding', status: 1, refund_status: 'refunding' },
    ]

    expect(filterOrdersByTab(orders, '0').map((order) => order.order_no)).toEqual(['pending'])
    expect(filterOrdersByTab(orders, '1').map((order) => order.order_no)).toEqual(['paid'])
    expect(filterOrdersByTab(orders, 'refund:refunding').map((order) => order.order_no)).toEqual(['refunding'])
  })

  it('renders order tabs as a horizontal scroll row', () => {
    const page = readSource('src', 'pages', 'order', 'index.tsx')
    const style = readSource('src', 'pages', 'order', 'index.scss')

    expect(page).toContain("className='tabs-scroll'")
    expect(page).toContain('scrollX')
    expect(page).toContain('showScrollbar={false}')
    expect(style).toContain('white-space: nowrap')
    expect(style).toContain('display: inline-flex')
    expect(style).toContain('flex: 0 0 auto')
    expect(page).toContain("className='order-list-content'")
    expect(style).toContain('.order-list-content')
    expect(style).toContain('160rpx + env(safe-area-inset-bottom)')
  })

  it('requests backend prepay with order_no and validates WeChat pay fields', () => {
    const page = readSource('src', 'pages', 'order', 'index.tsx')

    expect(page).toContain("url: '/api/v1/pay/prepay'")
    expect(page).toContain('data: { order_no: order.order_no }')
    expect(page).toContain('payingOrderNo')
    expect(page).toContain('setPayingOrderNo(order.order_no)')
    expect(page).toContain('void fetchOrders(false)')
    expect(page).toContain("['timeStamp', 'nonceStr', 'package', 'signType', 'paySign']")
    expect(page).toContain('out_trade_no')
  })

  it('supports cancelling pending orders and hides list refund entry', () => {
    const page = readSource('src', 'pages', 'order', 'index.tsx')

    expect(page).toContain('handleCancelOrder')
    expect(page).toContain("url: `/api/v1/order/${encodeURIComponent(order.order_no)}/cancel`")
    expect(page).toContain("method: 'POST'")
    expect(page).toContain('data: { reason_id: 1 }')
    expect(page).toContain('取消订单')
    expect(page).not.toContain("onClick={(e) => handleRefund(e, order)}")
  })

  it('supports swipe delete with the order delete endpoint', () => {
    const page = readSource('src', 'pages', 'order', 'index.tsx')
    const style = readSource('src', 'pages', 'order', 'index.scss')

    expect(page).toContain('handleDeleteOrder')
    expect(page).toContain('onTouchStart')
    expect(page).toContain('onTouchMove')
    expect(page).toContain('onTouchEnd')
    expect(page).toContain("method: 'DELETE'")
    expect(page).toContain("url: `/api/v1/order/${encodeURIComponent(order.order_no)}`")
    expect(page).toContain('setOrders((prev) => prev.filter((item) => item.order_no !== order.order_no))')
    expect(style).toContain('.order-swipe-item')
    expect(style).toContain('.order-delete-action')
    expect(style).toContain('background: #ff2e4d')
  })
})
