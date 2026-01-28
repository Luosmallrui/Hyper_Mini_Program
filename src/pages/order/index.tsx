import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

const DEFAULT_POSTER = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'
const PAGE_SIZE = 10

type OrderStatus = 10 | 20 | 30 | 40 | 50 | number

interface OrderItem {
  id: number
  user_id: number
  type: 'ticket' | 'product' | string
  image_url: string
  name: string
  price: number
  created_at: string
  paid_at: string
  status: OrderStatus
  quantity: number
  seller_name: string
}

const STATUS_CONFIG: Record<number, { label: string; color: string; showQR: boolean; showRefund: boolean; actionText?: string }> = {
  10: { label: '待支付', color: '#faad14', showQR: false, showRefund: false, actionText: '查看详情' },
  20: { label: '待使用', color: '#52c41a', showQR: true, showRefund: true },
  30: { label: '已使用', color: '#9c9c9c', showQR: false, showRefund: false, actionText: '查看详情' },
  40: { label: '已退款', color: '#ff4d4f', showQR: false, showRefund: false, actionText: '查看详情' },
  50: { label: '已取消', color: '#9c9c9c', showQR: false, showRefund: false, actionText: '查看详情' }
}

const getStatusConfig = (status: OrderStatus) => STATUS_CONFIG[Number(status)] || STATUS_CONFIG[20]

const getTypeLabel = (type: string) => (type === 'ticket' ? '票务' : type === 'product' ? '商品' : '订单')

const formatDateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatPrice = (value: number) => {
  if (value === null || value === undefined) return '0'
  const normalized = value >= 1000 && value % 100 === 0 ? value / 100 : value
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2)
}

export default function OrderPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [statusBarHeight, setStatusBarHeight] = useState(20)

  const tabs = [
    { key: 'all', label: '全部' },
    { key: '10', label: '待支付' },
    { key: '20', label: '待使用' },
    { key: '30', label: '已使用' },
    { key: '40', label: '已退款' }
  ]

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
      const res = await request({
        url: '/api/v1/order/list',
        method: 'GET',
        dataType: 'string',
        responseType: 'text',
        data: {
          pageSize: PAGE_SIZE,
          ...(loadMore && cursor ? { cursor } : {})
        }
      })

      const payload = res?.data?.data || {}
      const list = Array.isArray(payload.list) ? payload.list : []

      setOrders(prev => (loadMore ? [...prev, ...list] : list))
      setHasMore(Boolean(payload.has_more))
      setCursor(payload.next_cursor || null)
    } catch (error) {
      console.error('Order list load failed:', error)
    } finally {
      setLoading(false)
      if (!loadMore) setInitialLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(false)
  }, [])

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders
    return orders.filter(order => String(order.status) === activeTab)
  }, [activeTab, orders])

  const handleOrderClick = (order: OrderItem) => {
    Taro.navigateTo({
      url: `/pages/order-sub/order-detail/index?orderNo=${order.id}`
    })
  }

  const handleViewQRCode = (e: any, order: OrderItem) => {
    e.stopPropagation()
    Taro.navigateTo({
      url: `/pages/order-sub/order-detail/index?orderNo=${order.id}`
    })
  }

  const handleRefund = (e: any) => {
    e.stopPropagation()
    Taro.showModal({
      title: '申请退款',
      content: '确认要申请退款吗？',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '退款申请已提交', icon: 'success' })
        }
      }
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
          height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`
        }}
      >
        <View className='tabs-wrapper'>
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
        </View>

        <ScrollView
          className='order-list'
          scrollY
          enableBackToTop
          lowerThreshold={80}
          onScrollToLower={() => fetchOrders(true)}
        >
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
              const statusConfig = getStatusConfig(order.status)
              const unitPrice = formatPrice(order.price)
              const totalAmount = formatPrice(order.price * (order.quantity || 1))
              return (
                <View
                  key={order.id}
                  className='order-card'
                  onClick={() => handleOrderClick(order)}
                >
                  <View className='order-header'>
                    <Text className='order-no'>订单号：{order.id}</Text>
                    <Text className='order-status' style={{ color: statusConfig.color }}>
                      {statusConfig.label}
                    </Text>
                  </View>

                  <View className='order-content'>
                    <Image className='order-poster' src={order.image_url || DEFAULT_POSTER} mode='aspectFill' />
                    <View className='order-info'>
                      <Text className='event-name'>{order.name}</Text>
                      <View className='event-detail'>
                        <AtIcon value='clock' size='12' color='#8f8f8f' />
                        <Text className='detail-text'>下单时间 {formatDateTime(order.created_at)}</Text>
                      </View>
                      <View className='event-detail'>
                        <AtIcon value='map-pin' size='12' color='#8f8f8f' />
                        <Text className='detail-text'>{order.seller_name || '主办方'}</Text>
                      </View>
                      <View className='ticket-info'>
                        <Text className='ticket-type'>{getTypeLabel(order.type)} · ￥{unitPrice}</Text>
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
                      {statusConfig.showRefund && (
                        <View
                          className='action-btn secondary'
                          onClick={(e) => handleRefund(e)}
                        >
                          <Text>申请退款</Text>
                        </View>
                      )}
                      {!statusConfig.showQR && !statusConfig.showRefund && (
                        <View className='action-btn secondary'>
                          <Text>{statusConfig.actionText || '查看详情'}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )
            })
          )}
          <View className='list-footer'>
            {!initialLoading && (
              <Text className='footer-text'>
                {loading && hasMore ? '加载中...' : hasMore ? '上拉加载更多' : '— 已经到底了 —'}
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}
