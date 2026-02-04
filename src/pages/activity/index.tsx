import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

const heroBg = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPnge4e991c6f61fa48db35927fda9571879ac78f39401f34fee7331ac1ede4da3ae'
const panelBg = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPngeacf5a43f8e5e61293dc16058b03d49843b2a61d439c03d6cbb6a2a8fedac815'
const organizerAvatar = 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/6c2cc88a7b944eb3b55c66ee51532f72_mergeImage.png'
const posterImage = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPng2bf1bf8518557130955cbc32c3282e36ea04ef334da2542d1f7c5fa5e83bac69'
const BASE_URL = 'https://www.hypercn.cn'

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

    try {
      setIsPaying(true)
      Taro.showLoading({ title: '准备支付...', mask: true })
      const { data: res } = await Taro.request({
        url: `${BASE_URL}/api/v1/pay/prepay`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        data: {
          openid: 'o9Xlk14wugzLZOdwWQ5FwtQOjhxs',
          amount: 1,
          description: '测试商品支付',
          out_trade_no: 'test_order_20240124011'
        }
      })

      if (res.code !== 200) {
        throw new Error(res.msg || '获取预支付信息失败')
      }

      const payParams = res.data

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
        className='block_1'
        style={{
          backgroundImage: `url(${heroImage || posterImage})`
        }}
      >
        <View
          className='image-wrapper_1'
          style={{
            height: `${navBarHeight}px`,
            paddingRight: `${menuButtonWidth}px`,
            marginTop: `${statusBarHeight}px`
          }}
        >
          <View className='nav-left' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
        </View>

        <View className='section_1'>
          <View className='text-group_1'>
            <Text className='text_1'>{titleText}</Text>
            <Text className='text_2'>活动时间：{timeText}</Text>
          </View>

          <View className='image-text_1'>
            <Text className='text-group_2'>{locationText}</Text>
            <Image
              className='thumbnail_1'
              src='https://lanhu-oss-proxy.lanhuapp.com/SketchPng316000f2c1e243cb13f8f16f4b0e0f5612aad100fd961d8166c868613af34ece'
              mode='aspectFit'
            />
          </View>

          <View className='box_1'>
            <Text className='text_3'>{priceRange}</Text>
            <View className='text-wrapper_1'>
              <Text className='text_4'>订阅活动</Text>
            </View>
            <View className='text-wrapper_2'>
              <Text className='text_5'>分享活动</Text>
            </View>
          </View>

          <View className='box_2'>
            <Image className='group_1' src={activity?.user_avatar || organizerAvatar} mode='aspectFill' />
            <View className='image-text_2'>
              <View className='text-group_3'>
                <Text className='text_6'>{organizerName}</Text>
                <Text className='text_7'>{organizerFans} 粉丝</Text>
              </View>
              <Image
                className='thumbnail_2'
                src='https://lanhu-oss-proxy.lanhuapp.com/SketchPng9f81a5ba47be5e8b065e9a3fd0be38708ae275b42eedf14faa0cf0e1ab793c76'
                mode='aspectFit'
              />
            </View>
            <View className='text-wrapper_3'>
              <Text className='text_8'>已关注</Text>
            </View>
          </View>

          <View className='text-wrapper_4'>
            <Text className='text_9'>活动详情</Text>
            <Text className='text_10'>相关活动</Text>
            <Text className='text_11'>相关动态</Text>
          </View>

          <Text className='paragraph_1'>
            想象一下，嘻哈最根源的韵律之力，接通了电子乐最前沿的高压电流，这就是 Power Flow。{'\\n'}
            当这两种力量在同一轨道上交汇、加速、碰撞，便诞生了 Power Flow。它既不属于地下的昏暗，也不屈服于主流的浮华。{'\\n'}
            它站在电流与街头的交汇处，构建一个节奏更凶猛、旋律更迷幻、能量更密集的新现实。
          </Text>

          <View className='box_3' onClick={() => setDrawerOpen(true)}>
            <View className='text-wrapper_5'>
              <Text className='text_12'>立即购票</Text>
            </View>
            <View className='image-wrapper_2'>
              <Image
                className='image_3'
                src='https://lanhu-oss-proxy.lanhuapp.com/SketchPng5576d66f766d92263b636bb81afaf3421ac5f6ddab8bf5cdbf131c5c2b7c50db'
                mode='widthFix'
              />
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


