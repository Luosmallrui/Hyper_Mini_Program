import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import backgroundWebp from '../../assets/images/background.webp'
import './index.scss'

const heroBg = backgroundWebp
const organizerAvatar = 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/6c2cc88a7b944eb3b55c66ee51532f72_mergeImage.png'
const posterImage = backgroundWebp

interface MerchantGood {
  id: string
  party_id: number
  product_name: string
  price: number
  original_price: number
  stock: number
  description: string
  cover_image: string
  status: number
  sales_volume: number
  created_at: string
  updated_at: string
}

interface MerchantDetail {
  id: number
  name: string
  avg_price: number
  location_name: string
  images: string[]
  goods: MerchantGood[]
  user_name: string
  user_avatar: string
  is_follow: boolean
  business_hours: string
}

interface TicketType {
  id: string
  label: string
  price: number
}

export default function ActivityPage() {
  const router = useRouter()
  const activityId = router.params?.id || ''
  const [activity, setActivity] = useState<MerchantDetail | null>(null)

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null)
  const [ticketCount, setTicketCount] = useState(1)
  const [isPaying, setIsPaying] = useState(false)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)
  }, [])

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return
      try {
        const res = await request({
          url: `/api/v1/merchant/${activityId}`,
          method: 'GET'
        })
        const detail = res?.data?.data || null
        setActivity(detail)
      } catch (error) {
        console.error('Activity detail load failed:', error)
      }
    }

    fetchActivity()
  }, [activityId])

  const tickets = useMemo<TicketType[]>(() => {
    if (activity?.goods && activity.goods.length > 0) {
      return activity.goods.map(item => ({
        id: String(item.id),
        label: item.product_name,
        price: Math.round(item.price / 100)
      }))
    }
    return [
      { id: 'single', label: '单人票(赠啤酒1瓶)', price: 65 },
      { id: 'double', label: '双人票(赠啤酒2瓶)', price: 120 },
      { id: 'vip', label: '畅饮票(酒水畅饮)', price: 150 }
    ]
  }, [activity?.goods])

  useEffect(() => {
    if (!selectedTicket && tickets.length > 0) {
      setSelectedTicket(tickets[0])
    }
  }, [tickets, selectedTicket])

  const token = Taro.getStorageSync('access_token')
  const totalPrice = useMemo(() => {
    if (!selectedTicket) return 0
    return selectedTicket.price * ticketCount
  }, [selectedTicket, ticketCount])

  const handlePay = async () => {
    if (isPaying) return
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      setIsPaying(true)
      Taro.showLoading({ title: '准备支付...', mask: true })
      const res = await request({
        url: '/api/v1/pay/prepay',
        method: 'POST',
        data: {
          openid: 'o9Xlk14wugzLZOdwWQ5FwtQOjhxs',
          amount: 1,
          product_id: selectedTicket?.id,
          description: '测试商品支付',
          out_trade_no: 'test_order_20240124011'
        }
      })

      const payload = res.data
      if (payload.code !== 200) {
        throw new Error(payload.msg || '获取预支付信息失败')
      }

      const payParams = payload.data

      await Taro.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as any,
        paySign: payParams.paySign,
        success: () => {
          Taro.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => {
            Taro.navigateTo({ url: `/pages/order-sub/order-pay-success/index` })
          }, 1000)
        },
        fail: (err) => {
          if (err.errMsg.includes('cancel')) {
            Taro.showToast({ title: '支付已取消', icon: 'none' })
          } else {
            Taro.showModal({ title: '支付失败', content: err.errMsg, showCancel: false })
          }
        }
      })
    } catch (error: any) {
      console.error('支付流程出错:', error)
      Taro.showToast({ title: error.message || '系统错误', icon: 'none' })
    } finally {
      setIsPaying(false)
      Taro.hideLoading()
    }
  }

  const heroImage = activity?.images?.[0] || heroBg
  const organizerName = activity?.user_name || 'Pure Loop'
  const organizerFans = activity?.goods?.length ? String(activity.goods.length) : '5245'
  const titleText = activity?.name || 'POWER FLOW 成都站'
  const timeText = activity?.business_hours
    ? activity.business_hours
    : '2025.01.03-04 星期五 21:30-02:30'
  const locationText = activity?.location_name || '高新区盛园街道保利星荟5栋1楼'

  const priceRange = useMemo(() => {
    if (activity?.goods && activity.goods.length > 0) {
      const prices = activity.goods.map(item => Math.round(item.price / 100))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) return `${min}¥`
      return `${min}¥—${max}¥`
    }
    if (activity?.avg_price) return `${Math.round(activity.avg_price / 100)}¥`
    return '65¥—128¥'
  }, [activity?.goods, activity?.avg_price])

  return (
    <View className='activity-page'>
      <View
        className='activity-hero'
        style={{
          backgroundImage: `url(${heroImage || posterImage})`
        }}
      >
        <View
          className='activity-nav'
          style={{
            height: `${navBarHeight}px`,
            paddingRight: `${menuButtonWidth}px`,
            marginTop: `${statusBarHeight}px`
          }}
        >
          <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
        </View>

        <View className='activity-panel'>
          <View className='title-group'>
            <Text className='title'>{titleText}</Text>
            <Text className='time'>活动时间：{timeText}</Text>
          </View>

          <View className='location-row'>
            <Text className='location-text'>{locationText}</Text>
            <AtIcon
              className='location-icon'
              value='chevron-right'
              size='16'
              color='#fff'
            />
          </View>

          <View className='price-row'>
            <Text className='price-range'>{priceRange}</Text>
            <View className='subscribe-pill'>
              <Text className='subscribe-text'>订阅活动</Text>
            </View>
            <View className='share-pill'>
              <Text className='share-text'>分享活动</Text>
            </View>
          </View>

          <View className='host-card'>
            <Image className='host-avatar' src={activity?.user_avatar || organizerAvatar} mode='aspectFill' />
            <View className='host-info'>
              <View className='host-meta'>
                <Text className='host-name'>{organizerName}</Text>
                <Text className='host-fans'>{organizerFans} 粉丝</Text>
              </View>
              <AtIcon
                className='verify-icon'
                value='check-circle'
                size='14'
                color='#2e6bff'
              />
            </View>
            <View className='host-follow'>
              <Text className='host-follow-text'>已关注</Text>
            </View>
          </View>

          <View className='section-tabs'>
            <Text className='tab-active'>活动详情</Text>
            <Text className='tab'>相关活动</Text>
            <Text className='tab'>相关动态</Text>
          </View>

          <Text className='activity-desc'>
            想象一下，嘻哈最根源的韵律之力，接通了电子乐最前沿的高压电流，这就是 Power Flow。{'\\n'}
            当这两种力量在同一轨道上交汇、加速、碰撞，便诞生了 Power Flow。它既不属于地下的昏暗，也不屈服于主流的浮华。{'\\n'}
            它站在电流与街头的交汇处，构建一个节奏更凶猛、旋律更迷幻、能量更密集的新现实。
          </Text>

          <View className='ticket-bar' onClick={() => setDrawerOpen(true)}>
            <View className='ticket-pill'>
              <Text className='ticket-text'>立即购票</Text>
            </View>
          </View>
        </View>
      </View>

      {drawerOpen && (
        <View className='drawer-mask open' onClick={() => setDrawerOpen(false)}>
          <View className='drawer-panel open' onClick={(e) => e.stopPropagation()}>
            <View className='drawer-header'>
              <View className='drawer-title'>
                <Image className='drawer-poster' src={heroImage || posterImage} mode='aspectFill' />
                <View className='drawer-info'>
                  <Text className='drawer-name'>{titleText}</Text>
                  <Text className='drawer-tag'>支持退票</Text>
                  <Text className='drawer-time'>时间：{timeText}</Text>
                  <Text className='drawer-place'>地点：{locationText}</Text>
                  <Text className='drawer-price'>{priceRange}</Text>
                </View>
              </View>
              <View className='drawer-close' onClick={() => setDrawerOpen(false)}>
                <AtIcon value='close' size='16' color='#bbb' />
              </View>
            </View>

            <View className='ticket-section'>
              <View className='section-row'>
                <Text className='section-title'>票务类型</Text>
                <Text className='section-sub'>（实名购票）</Text>
              </View>
              <View className='ticket-list'>
                {tickets.map(ticket => (
                  <View
                    key={ticket.id}
                    className={`ticket-chip ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <Text>{ticket.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className='count-section'>
              <View className='section-row'>
                <Text className='section-title'>选择数量</Text>
                <Text className='section-sub'>（单人最多限购 6 张）</Text>
              </View>
              <View className='count-actions'>
                <View className='count-btn' onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}>
                  -
                </View>
                <View className='count-value'>{ticketCount}</View>
                <View className='count-btn' onClick={() => setTicketCount(ticketCount + 1)}>
                  +
                </View>
              </View>
            </View>

            <View className='viewer-section'>
              <Text className='section-title'>观演人信息</Text>
              <View className='viewer-item'>
                <Text className='viewer-name'>陈 • 居 221***********2524</Text>
                <View className='viewer-radio' />
              </View>
              <View className='viewer-add' onClick={() => Taro.navigateTo({ url: '/pages/activity-attendee/index' })}>
                新增观演人
              </View>
            </View>

            <View className='drawer-footer'>
              <View className='total'>
                <Text className='total-label'>合计 ¥{totalPrice}</Text>
                <Text className='total-sub'>共 {ticketCount} 张</Text>
              </View>
              <View className='pay-btn' onClick={handlePay}>
                立即支付
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

