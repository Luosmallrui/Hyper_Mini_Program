import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import {
  buildOrderListQuery,
  filterOrdersByTab,
  getOrderStatusConfig,
  getOrderTabs,
  isPendingPaymentOrder,
  type OrderTabKey,
} from './status'
import './index.scss'

const DEFAULT_POSTER = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'
const PAGE_SIZE = 10
const FALLBACK_PAGE_SIZE = 100
const DELETE_ACTION_WIDTH = 168
const SWIPE_OPEN_THRESHOLD = 70

const getRemaining = (expireTime?: string, now = Date.now()): number => {
  if (!expireTime) return -1
  const diff = new Date(expireTime).getTime() - now
  return diff > 0 ? Math.floor(diff / 1000) : 0
}

const formatRemaining = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type OrderStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | number

interface TicketOrderItem {
  order_no: string
  status: OrderStatus
  total_price: number
  actual_price: number
  quantity: number
  buyer_name: string
  buyer_id_card: string
  created_at: string
  expire_time?: string
  pay_time?: string
  refund_status?: string
  refund_no?: string
  activity?: {
    id: number | string
    name: string
    start_time?: string
    end_time?: string
    poster_list?: string
  }
  ticket_spec?: {
    id: number | string
    name: string
  }
}

const formatDateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatPrice = (value: number) => {
  if (value === null || value === undefined) return '0'
  const normalized = value / 100
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2)
}

const normalizeOrderPayload = (res: any): { list: TicketOrderItem[]; total: number } => {
  const payload = res?.data?.data || {}
  const list: TicketOrderItem[] = Array.isArray(payload.list) ? payload.list : []
  const total = Number(payload.total || list.length || 0)
  return { list, total }
}

export default function OrderPage() {
  const [activeTab, setActiveTab] = useState<OrderTabKey>('all')
  const [orders, setOrders] = useState<TicketOrderItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [refreshing, setRefreshing] = useState(false)
  const [swipedOrderNo, setSwipedOrderNo] = useState('')
  const [deletingOrderNo, setDeletingOrderNo] = useState('')
  const [payingOrderNo, setPayingOrderNo] = useState('')
  const swipeStartRef = useRef({ x: 0, y: 0, orderNo: '' })
  const [now, setNow] = useState(Date.now())

  // 待支付订单倒计时：每秒刷新展示
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const tabs = getOrderTabs()

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const calculatedNavHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(Number.isNaN(calculatedNavHeight) ? 44 : calculatedNavHeight)
  }, [])

  const fetchOrders = async (loadMore = false) => {
    if (loading) return
    if (loadMore && !hasMore) return

    setLoading(true)
    if (!loadMore) setInitialLoading(true)

    try {
      const nextPage = loadMore ? page + 1 : 1
      const res = await request({
        url: '/api/v1/order/list',
        method: 'GET',
        data: buildOrderListQuery(activeTab, nextPage, PAGE_SIZE),
      })

      let { list, total } = normalizeOrderPayload(res)

      if (!loadMore && activeTab !== 'all' && list.length === 0) {
        const fallbackRes = await request({
          url: '/api/v1/order/list',
          method: 'GET',
          data: buildOrderListQuery('all', 1, FALLBACK_PAGE_SIZE),
        })
        const fallback = normalizeOrderPayload(fallbackRes)
        const fallbackList = filterOrdersByTab(fallback.list, activeTab)
        if (fallbackList.length > 0) {
          list = fallbackList
          total = fallbackList.length
        }
      }

      setOrders((prev) => {
        const nextOrders = loadMore ? [...prev, ...list] : list
        setHasMore(total > 0 ? nextOrders.length < total : list.length >= PAGE_SIZE)
        return nextOrders
      })
      setPage(nextPage)
    } catch (error: any) {
      console.error('Order list load failed:', error)
      Taro.showToast({ title: error?.message || '订单加载失败', icon: 'none' })
    } finally {
      setLoading(false)
      if (!loadMore) setInitialLoading(false)
    }
  }

  useEffect(() => {
    setSwipedOrderNo('')
    void fetchOrders(false)
  }, [activeTab])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders(false)
    setRefreshing(false)
  }

  const filteredOrders = useMemo(() => orders, [orders])

  const handleOrderClick = (order: TicketOrderItem) => {
    if (swipedOrderNo) {
      setSwipedOrderNo('')
      return
    }
    Taro.navigateTo({
      url: `/pages/order-sub/order-detail/index?orderNo=${order.order_no}`,
    })
  }

  const getTouchPoint = (event: any) => event?.touches?.[0] || event?.changedTouches?.[0] || {}

  const handleOrderTouchStart = (event: any, order: TicketOrderItem) => {
    const point = getTouchPoint(event)
    swipeStartRef.current = {
      x: Number(point.clientX || 0),
      y: Number(point.clientY || 0),
      orderNo: order.order_no,
    }
  }

  const handleOrderTouchMove = (event: any, order: TicketOrderItem) => {
    if (swipeStartRef.current.orderNo !== order.order_no) return
    const point = getTouchPoint(event)
    const diffX = Number(point.clientX || 0) - swipeStartRef.current.x
    const diffY = Math.abs(Number(point.clientY || 0) - swipeStartRef.current.y)
    if (diffY > Math.abs(diffX)) return
    if (diffX < -SWIPE_OPEN_THRESHOLD) {
      setSwipedOrderNo(order.order_no)
    } else if (diffX > SWIPE_OPEN_THRESHOLD) {
      setSwipedOrderNo(prev => prev === order.order_no ? '' : prev)
    }
  }

  const handleOrderTouchEnd = (event: any, order: TicketOrderItem) => {
    if (swipeStartRef.current.orderNo !== order.order_no) return
    const point = getTouchPoint(event)
    const diffX = Number(point.clientX || 0) - swipeStartRef.current.x
    if (diffX < -SWIPE_OPEN_THRESHOLD) {
      setSwipedOrderNo(order.order_no)
    } else if (diffX > SWIPE_OPEN_THRESHOLD || Math.abs(diffX) < 12) {
      setSwipedOrderNo(prev => prev === order.order_no ? '' : prev)
    }
    swipeStartRef.current = { x: 0, y: 0, orderNo: '' }
  }

  const handleViewQRCode = (e: any, order: TicketOrderItem) => {
    e.stopPropagation()
    Taro.navigateTo({
      url: `/pages/order-sub/order-detail/index?orderNo=${order.order_no}`,
    })
  }

  const handleCancelOrder = (e: any, order: TicketOrderItem) => {
    e.stopPropagation()
    Taro.showModal({
      title: '取消订单',
      content: '确认取消该待支付订单吗？取消后将返还已抵扣积分。',
      confirmText: '取消订单',
      confirmColor: '#ff2e4d',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({ title: '取消中...', mask: true })
        try {
          const result = await request({
            url: `/api/v1/order/${encodeURIComponent(order.order_no)}/cancel`,
            method: 'POST',
            data: { reason_id: 1 },
          })
          const payload = result?.data
          if (payload?.code !== 200) throw new Error(payload?.msg || '取消失败')
          setSwipedOrderNo('')
          Taro.showToast({ title: '已取消', icon: 'success' })
          void fetchOrders(false)
        } catch (error: any) {
          Taro.showToast({ title: error?.message || '取消失败，请重试', icon: 'none' })
        } finally {
          Taro.hideLoading()
        }
      },
    })
  }

  const handleContinuePay = async (e: any, order: TicketOrderItem) => {
    e.stopPropagation()
    if (payingOrderNo) return
    setPayingOrderNo(order.order_no)
    Taro.showLoading({ title: '准备支付...', mask: true })
    try {
      const res = await request({
        url: '/api/v1/pay/prepay',
        method: 'POST',
        data: { order_no: order.order_no },
      })
      const payload = res?.data
      if (payload?.code !== 200) throw new Error(payload?.msg || '获取预支付信息失败')
      const payParams = payload.data || {}
      const missingPayFields = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'].filter((field) => !payParams?.[field])
      if (missingPayFields.length > 0) {
        throw new Error(`微信支付参数缺失：${missingPayFields.join('、')}`)
      }
      await Taro.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as any,
        paySign: payParams.paySign,
        success: () => {
          Taro.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => {
            Taro.navigateTo({ url: `/pages/order-sub/order-pay-success/index?order_no=${payParams.out_trade_no || order.order_no}` })
          }, 700)
          void fetchOrders(false)
        },
        fail: (err) => {
          if (err.errMsg?.includes('cancel')) {
            Taro.showToast({ title: '支付已取消', icon: 'none' })
          } else {
            Taro.showModal({ title: '支付失败', content: err.errMsg || '支付未完成，您可以在订单中继续支付', showCancel: false })
          }
        },
      })
    } catch (error: any) {
      const message = String(error?.errMsg || error?.message || '')
      if (!message.includes('cancel')) {
        const shouldRefresh = /过期|已取消|不可支付|状态/.test(message)
        Taro.showModal({
          title: '支付失败',
          content: error?.message || '系统异常，请稍后重试',
          showCancel: false,
          complete: () => {
            if (shouldRefresh) void fetchOrders(false)
          },
        })
      }
    } finally {
      setPayingOrderNo('')
      Taro.hideLoading()
    }
  }

  const handleDeleteOrder = (e: any, order: TicketOrderItem) => {
    e.stopPropagation()
    Taro.showModal({
      title: '删除订单',
      content: '删除后订单将从列表中移除，确认删除吗？',
      confirmText: '删除',
      confirmColor: '#ff2e4d',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return
        setDeletingOrderNo(order.order_no)
        Taro.showLoading({ title: '删除中...', mask: true })
        try {
          const result = await request({
            url: `/api/v1/order/${encodeURIComponent(order.order_no)}`,
            method: 'DELETE',
          })
          const payload = result?.data
          if (payload?.code !== 200) throw new Error(payload?.msg || '删除失败')
          setOrders((prev) => prev.filter((item) => item.order_no !== order.order_no))
          setSwipedOrderNo('')
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch (error: any) {
          Taro.showToast({ title: error?.message || '删除失败，请重试', icon: 'none' })
        } finally {
          setDeletingOrderNo('')
          Taro.hideLoading()
        }
      },
    })
  }

  return (
    <View className='order-page'>
      <View className='custom-navbar' style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px` }}>
        <View className='navbar-content'>
          <View className='back-button' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='22' color='#fff' />
          </View>
          <Text className='navbar-title'>我的订单</Text>
          <View className='navbar-right' />
        </View>
      </View>

      <View
        className='page-body'
        style={{
          marginTop: `${statusBarHeight + navBarHeight}px`,
          height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`,
        }}
      >
        <View className='tabs-wrapper'>
          <ScrollView className='tabs-scroll' scrollX showScrollbar={false} enhanced>
            <View className='tabs'>
            {tabs.map(tab => (
              <View
                key={tab.key}
                className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Text className='tab-label'>{tab.label}</Text>
                {activeTab === tab.key && <View className='tab-indicator' />}
              </View>
            ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView
          className='order-list'
          scrollY
          enableBackToTop
          refresherEnabled
          refresherTriggered={refreshing}
          refresherBackground='#000'
          refresherDefaultStyle='white'
          onRefresherRefresh={handleRefresh}
          lowerThreshold={80}
          onScrollToLower={() => fetchOrders(true)}
        >
          <View className='order-list-content'>
            {initialLoading ? (
              <View className='empty-state'>
                <Text className='empty-text'>加载中...</Text>
              </View>
            ) : filteredOrders.length === 0 ? (
              <View className='empty-state'>
                <AtIcon value='file-generic' size='80' color='#2a2a2a' />
                <Text className='empty-text'>暂无订单</Text>
              </View>
            ) : (
              filteredOrders.map(order => {
                const statusConfig = getOrderStatusConfig(order)
                const unitPrice = formatPrice((order.actual_price || order.total_price || 0) / Math.max(order.quantity || 1, 1))
                const totalAmount = formatPrice(order.actual_price || order.total_price || 0)
                const isSwipedOpen = swipedOrderNo === order.order_no
                const isDeleting = deletingOrderNo === order.order_no
                return (
                  <View
                    key={order.order_no}
                    className={`order-swipe-item ${isSwipedOpen ? 'open' : ''}`}
                  >
                    <View
                      className='order-delete-action'
                      onClick={(e) => handleDeleteOrder(e, order)}
                    >
                      <AtIcon value='trash' size='22' color='#fff' />
                      <Text>{isDeleting ? '删除中' : '删除'}</Text>
                    </View>
                    <View
                      className='order-card'
                      style={{ transform: isSwipedOpen ? `translateX(-${DELETE_ACTION_WIDTH}rpx)` : 'translateX(0)' }}
                      onClick={() => handleOrderClick(order)}
                      onTouchStart={(e) => handleOrderTouchStart(e, order)}
                      onTouchMove={(e) => handleOrderTouchMove(e, order)}
                      onTouchEnd={(e) => handleOrderTouchEnd(e, order)}
                    >
                      <View className='order-header'>
                        <Text className='order-no'>订单号：{order.order_no}</Text>
                        {(() => {
                          const remaining = isPendingPaymentOrder(order) ? getRemaining(order.expire_time, now) : -1
                          return (
                            <Text className='order-status' style={{ color: statusConfig.color }}>
                              {remaining > 0 ? `剩余 ${formatRemaining(remaining)}` : statusConfig.label}
                            </Text>
                          )
                        })()}
                      </View>

                      <View className='order-content'>
                        <Image className='order-poster' src={order.activity?.poster_list || DEFAULT_POSTER} mode='aspectFill' />
                        <View className='order-info'>
                          <Text className='event-name'>{order.activity?.name || '票务订单'}</Text>
                          <View className='event-detail'>
                            <AtIcon value='clock' size='12' color='#8f8f8f' />
                            <Text className='detail-text'>下单时间 {formatDateTime(order.created_at)}</Text>
                          </View>
                          <View className='event-detail'>
                            <AtIcon value='user' size='12' color='#8f8f8f' />
                            <Text className='detail-text'>{order.buyer_name} {order.buyer_id_card}</Text>
                          </View>
                          <View className='ticket-info'>
                            <Text className='ticket-type'>票务 · {order.ticket_spec?.name || '票券'} · ￥{unitPrice}</Text>
                            <Text className='ticket-count'>x{order.quantity || 1}</Text>
                          </View>
                        </View>
                      </View>

                      <View className='order-footer'>
                        <View className='price-info'>
                          <Text className='price-label'>实付</Text>
                          <Text className='price-value'>￥{totalAmount}</Text>
                        </View>
                        <View className='action-buttons'>
                          {statusConfig.showQR && (
                            <View
                              className='action-btn primary'
                              onClick={(e) => handleViewQRCode(e, order)}
                            >
                              <AtIcon value='image' size='16' color='#fff' />
                              <Text>查看二维码</Text>
                            </View>
                          )}
                          {isPendingPaymentOrder(order) && (
                            <>
                              <View
                                className='action-btn secondary'
                                onClick={(e) => handleCancelOrder(e, order)}
                              >
                                <Text>取消订单</Text>
                              </View>
                              <View
                                className={`action-btn primary ${payingOrderNo === order.order_no ? 'disabled' : ''}`}
                                onClick={(e) => handleContinuePay(e, order)}
                              >
                                <Text>{payingOrderNo === order.order_no ? '支付中...' : statusConfig.actionText || '继续支付'}</Text>
                              </View>
                            </>
                          )}
                          {!statusConfig.showQR && !statusConfig.showRefund && !isPendingPaymentOrder(order) && (
                            <View className='action-btn secondary'>
                              <Text>{statusConfig.actionText || '查看详情'}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })
            )}
            <View className='list-footer'>
              {!initialLoading && (
                <Text className='footer-text'>
                  {loading && hasMore ? '加载中...' : hasMore ? '上拉加载更多' : '- 已经到底了 -'}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}
