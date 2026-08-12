import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

const fallbackPoster = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'

interface TicketOrderDetail {
  order_no: string
  actual_price: number
  quantity: number
  activity?: {
    name?: string
    start_time?: string
    end_time?: string
    poster_list?: string
  }
  ticket_spec?: {
    name?: string
  }
  pay_time?: string
  created_at?: string
}

interface OrderInfoState {
  orderNo: string
  eventName: string
  eventTime: string
  ticketType: string
  ticketCount: number
  totalAmount: number
  payTime: string
  poster: string
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const [orderInfo, setOrderInfo] = useState<OrderInfoState>({
    orderNo: '',
    eventName: '订单商品',
    eventTime: '',
    ticketType: '',
    ticketCount: 1,
    totalAmount: 0,
    payTime: '',
    poster: fallbackPoster
  })

  const formatTime = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  useEffect(() => {
    const fetchDetail = async () => {
      const orderNo =
        (router.params?.order_no as string) ||
        (router.params?.out_trade_no as string) ||
        ''
      if (!orderNo) return
      try {
        const res = await request({
          url: `/api/v1/order/${orderNo}`,
          method: 'GET',
        })
        const detail: TicketOrderDetail | null = res?.data?.data || null
        if (!detail) return
        setOrderInfo({
          orderNo: detail.order_no,
          eventName: detail.activity?.name || '订单商品',
          eventTime: detail.activity?.start_time && detail.activity?.end_time
            ? `${formatTime(detail.activity.start_time)} - ${formatTime(detail.activity.end_time)}`
            : formatTime(detail.activity?.start_time),
          ticketType: detail.ticket_spec?.name || '',
          ticketCount: detail.quantity || 1,
          totalAmount: Number(((detail.actual_price || 0) / 100).toFixed(2)),
          payTime: formatTime(detail.pay_time || detail.created_at),
          poster: detail.activity?.poster_list || fallbackPoster
        })
      } catch (error) {
        console.error('Order detail load failed:', error)
      }
    }

    fetchDetail()
  }, [router.params?.order_no, router.params?.out_trade_no])

  const handleViewOrder = () => {
    Taro.navigateTo({
      url: `/pages/order-sub/order-detail/index?orderNo=${orderInfo.orderNo}`
    })
  }

  const handleBackHome = () => {
    Taro.switchTab({
      url: '/pages/index/index'
    }).catch(() => {
      Taro.reLaunch({
        url: '/pages/index/index'
      })
    })
  }

  return (
    <View className='order-success-page'>
      <View className='success-header'>
        <View className='success-icon-wrapper'>
          <AtIcon value='check-circle' size='64' color='#D8FF4F' />
        </View>
        <Text className='success-title'>支付成功</Text>
        <Text className='success-subtitle'>您的订单已支付成功，请准时参加活动</Text>
      </View>

      <View className='order-card'>
        <View className='order-header'>
          <Text className='order-label'>订单编号</Text>
          <View className='order-no-wrapper'>
            <Text className='order-no'>{orderInfo.orderNo}</Text>
            <View
              className='copy-btn'
              onClick={() => {
                if (!orderInfo.orderNo) return
                Taro.setClipboardData({
                  data: orderInfo.orderNo,
                  success: () => {
                    Taro.showToast({ title: '已复制', icon: 'success' })
                  }
                })
              }}
            >
              <AtIcon value='copy' size='14' color='#D8FF4F' />
            </View>
          </View>
        </View>

        <View className='order-divider' />

        <View className='event-info'>
          <Image className='event-poster' src={orderInfo.poster} mode='aspectFill' />
          <View className='event-details'>
            <Text className='event-name'>{orderInfo.eventName}</Text>
            {orderInfo.eventTime ? (
              <Text className='event-time'>{orderInfo.eventTime}</Text>
            ) : null}
          </View>
        </View>

        <View className='order-divider' />

        <View className='order-items'>
          <View className='order-item'>
            <Text className='item-label'>票务类型</Text>
            <Text className='item-value'>{orderInfo.ticketType || orderInfo.eventName}</Text>
          </View>
          <View className='order-item'>
            <Text className='item-label'>购买数量</Text>
            <Text className='item-value'>x{orderInfo.ticketCount}</Text>
          </View>
          <View className='order-item'>
            <Text className='item-label'>支付时间</Text>
            <Text className='item-value'>{orderInfo.payTime}</Text>
          </View>
          <View className='order-item total'>
            <Text className='item-label'>实付金额</Text>
            <Text className='item-value price'>¥{orderInfo.totalAmount}</Text>
          </View>
        </View>
      </View>

      <View className='tips-card'>
        <View className='tips-title'>
          <AtIcon value='alert-circle' size='16' color='#D8FF4F' />
          <Text>温馨提示</Text>
        </View>
        <View className='tips-content'>
          <Text className='tip-item'>• 请凭订单二维码入场，建议提前截图保存</Text>
          <Text className='tip-item'>• 活动开始前30分钟可入场</Text>
          <Text className='tip-item'>• 如需退票，请在活动开始前24小时申请</Text>
        </View>
      </View>

      <View className='action-buttons'>
        <View className='action-btn secondary' onClick={handleBackHome}>
          <Text>返回首页</Text>
        </View>
        <View className='action-btn primary' onClick={handleViewOrder}>
          <Text>查看订单</Text>
        </View>
      </View>
      <View className='refund-link' onClick={handleViewOrder}>
        <Text className='refund-link-text'>申请退款</Text>
      </View>
    </View>
  )
}
