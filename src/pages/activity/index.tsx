import { View, Text, Image, Swiper, SwiperItem, ScrollView, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AtIcon, AtFloatLayout } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/float-layout.scss'
import { request } from '@/utils/request'
import backgroundWebp from '../../assets/images/background.webp'
import certificationIcon from '../../assets/images/certification.png'
import './index.scss'

const heroBg = backgroundWebp
const organizerAvatar =
  'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/6c2cc88a7b944eb3b55c66ee51532f72_mergeImage.png'
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
  user_id?: string | number
  name: string
  avg_price: number
  location_name: string
  lat?: number
  lng?: number
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

interface ViewerItem {
  id: number
  user_id: number
  real_name: string
  id_card: string
  phone: string
  type: number
  created_at: string
  updated_at: string
}

interface SessionItem {
  session_type: number
  peer_id: number
  peer_avatar: string
  peer_name: string
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
  const [activeTab, setActiveTab] = useState(0)

  const [viewerList, setViewerList] = useState<ViewerItem[]>([])
  const [selectedViewerId, setSelectedViewerId] = useState<number | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [viewerError, setViewerError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [sessionList, setSessionList] = useState<SessionItem[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [followPending, setFollowPending] = useState(false)
  const viewerInitLoadedRef = useRef(false)

  const fallbackMapCenter = { latitude: 30.657, longitude: 104.066 }

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
          method: 'GET',
        })
        const detail = res?.data?.data || null
        setActivity(detail)
      } catch (error) {
        console.error('Activity detail load failed:', error)
      }
    }

    fetchActivity()
  }, [activityId])

  const fetchViewers = async (preferredViewerId?: number | null) => {
    try {
      setViewerLoading(true)
      setViewerError('')
      const res = await request({
        url: '/api/v1/order/list-viewer',
        method: 'GET',
      })
      const viewers: ViewerItem[] = Array.isArray(res?.data?.data?.viewers)
        ? res.data.data.viewers
        : []
      setViewerList(viewers)

      if (viewers.length === 0) {
        setSelectedViewerId(null)
        return
      }

      const candidate = preferredViewerId ?? selectedViewerId
      const matched = typeof candidate === 'number' && viewers.some((v) => v.id === candidate)
      setSelectedViewerId(matched ? candidate! : viewers[0].id)
    } catch (error: any) {
      console.error('viewer list load failed:', error)
      setViewerError(error?.message || '观演人加载失败')
    } finally {
      setViewerLoading(false)
    }
  }

  useEffect(() => {
    if (viewerInitLoadedRef.current) return
    viewerInitLoadedRef.current = true
    void fetchViewers()
  }, [])

  const tickets = useMemo<TicketType[]>(() => {
    if (activity?.goods && activity.goods.length > 0) {
      return activity.goods.map((item) => ({
        id: String(item.id),
        label: item.product_name,
        price: Math.round(item.price / 100),
      }))
    }
    return [
      { id: 'single', label: '单人票(赠啤酒1瓶)', price: 65 },
      { id: 'double', label: '双人票(赠啤酒2瓶)', price: 120 },
      { id: 'vip', label: '畅饮票(酒水畅饮)', price: 150 },
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

  const selectedViewer = useMemo(
    () => viewerList.find((item) => item.id === selectedViewerId) || null,
    [viewerList, selectedViewerId],
  )

  const handlePay = async () => {
    if (isPaying) return
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (viewerList.length === 0 || selectedViewerId === null) {
      Taro.showToast({ title: '请先添加并选择观演人', icon: 'none' })
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
          out_trade_no: 'test_order_20240124011',
        },
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
            Taro.navigateTo({ url: '/pages/order-sub/order-pay-success/index' })
          }, 1000)
        },
        fail: (err) => {
          if (err.errMsg.includes('cancel')) {
            Taro.showToast({ title: '支付已取消', icon: 'none' })
          } else {
            Taro.showModal({ title: '支付失败', content: err.errMsg, showCancel: false })
          }
        },
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
  const titleText = activity?.name || 'POWER FLOW 嘻哈与电子音乐结合'
  const timeText = activity?.business_hours || '2025.01.03-04 星期五 21:30-02:30'
  const locationText = activity?.location_name || '高新区盛园街道保利星荟5栋1楼'
  const parseCoordinate = (value: unknown): number | null => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }
  const activityLat = parseCoordinate(activity?.lat)
  const activityLng = parseCoordinate(activity?.lng)
  const routeLat = parseCoordinate(router.params?.lat)
  const routeLng = parseCoordinate(router.params?.lng)

  const handleOpenMap = async () => {
    const latitude = activityLat ?? routeLat
    const longitude = activityLng ?? routeLng

    try {
      if (latitude !== null && longitude !== null) {
        await Taro.openLocation({
          latitude,
          longitude,
          name: titleText,
          address: locationText,
          scale: 17,
        })
        return
      }

      await Taro.openLocation({
        latitude: fallbackMapCenter.latitude,
        longitude: fallbackMapCenter.longitude,
        name: titleText,
        address: locationText,
        scale: 14,
      })
    } catch (error) {
      console.warn('openLocation failed:', error)
      Taro.showToast({ title: '无法打开地图', icon: 'none' })
    }
  }

  const handleToggleFollow = async () => {
    if (!activity || followPending) return
    if (!activity.user_id) {
      Taro.showToast({ title: '用户信息缺失', icon: 'none' })
      return
    }

    const nextFollow = !Boolean(activity.is_follow)
    const action = nextFollow ? 'follow' : 'unfollow'
    setFollowPending(true)
    setActivity((prev) => (prev ? { ...prev, is_follow: nextFollow } : prev))

    try {
      const res = await request({
        url: `/api/v1/follow/${action}`,
        method: 'POST',
        data: { user_id: String(activity.user_id) },
      })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) {
        throw new Error((res as any)?.data?.msg || '操作失败')
      }
      Taro.showToast({ title: nextFollow ? '已关注' : '已取消关注', icon: 'success' })
    } catch (error) {
      setActivity((prev) => (prev ? { ...prev, is_follow: !nextFollow } : prev))
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setFollowPending(false)
    }
  }

  const priceRange = useMemo(() => {
    if (activity?.goods && activity.goods.length > 0) {
      const prices = activity.goods.map((item) => Math.round(item.price / 100))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) return `${min}¥`
      return `${min}¥-${max}¥`
    }
    if (activity?.avg_price) return `${Math.round(activity.avg_price / 100)}¥`
    return '65¥-128¥'
  }, [activity?.goods, activity?.avg_price])

  const tabItems = ['活动详情', '相关活动', '相关动态']
  const relatedActivities = (activity?.goods || []).slice(0, 3)
  const relatedDynamics = [
    '派对预热中，更多阵容与活动细节持续更新。',
    '关注主办方账号，第一时间接收开票与福利通知。',
    '活动现场内容将于结束后发布到相关动态。',
  ]

  const handleManageViewers = () => {
    Taro.navigateTo({
      url: `/pages/activity-attendee/index?mode=create&selectedViewerId=${selectedViewerId ?? ''}`,
      success: (res) => {
        res.eventChannel.on('VIEWER_CHANGED', (payload: { selectedViewerId: number | null }) => {
          void fetchViewers(payload?.selectedViewerId)
        })
      },
    })
  }

  const parseResponse = (payload: any) => {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload)
      } catch (error) {
        return {}
      }
    }
    return payload || {}
  }

  const fetchSessionList = async () => {
    setLoadingSession(true)
    try {
      const res = await request({
        url: '/api/v1/session/',
        method: 'GET',
      })
      const resData = parseResponse(res?.data)
      if (resData?.code === 200 && resData?.data?.list) {
        setSessionList(resData.data.list || [])
      } else {
        setSessionList([])
      }
    } catch (error) {
      console.error('fetch session list failed:', error)
      setSessionList([])
      Taro.showToast({ title: '获取会话失败', icon: 'none' })
    } finally {
      setLoadingSession(false)
    }
  }

  const handleOpenShare = () => {
    if (!activityId) {
      Taro.showToast({ title: '活动信息无效', icon: 'none' })
      return
    }
    setShowShareModal(true)
    setShareMsg('')
    void fetchSessionList()
  }

  const handleShareToSession = async (session: SessionItem) => {
    if (!activityId) return
    Taro.showLoading({ title: '分享中...' })
    try {
      const res = await request({
        url: '/api/v1/message/send',
        method: 'POST',
        data: {
          target_id: String(session.peer_id),
          session_type: Number(session.session_type) === 2 ? 2 : 1,
          msg_type: 9,
          content: shareMsg || `分享活动：${titleText}`,
          ext: {
            card_type: 'activity_forward',
            activity_id: String(activityId),
          },
        },
      })
      const resData = parseResponse(res?.data)
      if (resData?.code === 200) {
        Taro.showToast({ title: '分享成功', icon: 'success' })
        setShowShareModal(false)
        setShareMsg('')
        return
      }
      Taro.showToast({ title: resData?.msg || '分享失败', icon: 'none' })
    } catch (error) {
      console.error('share activity failed:', error)
      Taro.showToast({ title: '分享失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const safeDecode = (value?: string) => {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (error) {
      return value
    }
  }

  return (
    <View className='activity-page'>
      <View
        className='activity-hero'
        style={{
          backgroundImage: `url(${heroImage || posterImage})`,
        }}
      >
        <View
          className='activity-nav'
          style={{
            top: `${statusBarHeight}px`,
            height: `${navBarHeight}px`,
            paddingRight: `${menuButtonWidth}px`,
          }}
        >
          <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
        </View>

        <View className='activity-panel'>
          <View className='title-group'>
            <Text className='title'>{titleText}</Text>
            <View className='time'>
              <Text className='time-label'>活动时间：</Text>
              <Text className='time-value'>{timeText}</Text>
            </View>
          </View>

          <View className='location-row' onClick={handleOpenMap}>
            <Text className='location-text'>{locationText}</Text>
            <AtIcon className='location-icon' value='chevron-right' size='16' color='#fff' />
          </View>

          <View className='price-row'>
            <Text className='price-range'>{priceRange}</Text>
            <View className='subscribe-pill'>
              <Text className='subscribe-text'>订阅活动</Text>
            </View>
            <View className='share-pill' onClick={handleOpenShare}>
              <Text className='share-text'>分享活动</Text>
            </View>
          </View>

          <View className='host-card'>
            <Image className='host-avatar' src={activity?.user_avatar || organizerAvatar} mode='aspectFill' />
            <View className='host-info'>
              <View className='host-meta'>
                <View className='host-name-row'>
                  <Text className='host-name'>{organizerName}</Text>
                  <Image className='verify-icon' src={certificationIcon} mode='aspectFit' />
                </View>
                <Text className='host-fans'>{organizerFans} 粉丝</Text>
              </View>
            </View>
            <View className='host-follow' onClick={handleToggleFollow}>
              <Text className='host-follow-text'>{followPending ? '处理中' : (activity?.is_follow ? '已关注' : '关注')}</Text>
            </View>
          </View>

          <View className='section-tabs'>
            {tabItems.map((label, index) => (
              <Text
                key={label}
                className={activeTab === index ? 'tab-active' : 'tab'}
                onClick={() => setActiveTab(index)}
              >
                {label}
              </Text>
            ))}
          </View>

          <Swiper
            className='section-swiper'
            current={activeTab}
            onChange={(e) => setActiveTab(e.detail.current)}
            circular={false}
          >
            <SwiperItem>
              <View className='section-pane'>
                <Text className='activity-desc'>
                  想象一下，嘻哈最根源的韵律之力，接通了电子乐最前沿的高压电流，这就是 Power Flow。{'\n'}
                  当这两种力量在同一轨道上交汇、加速、碰撞，便诞生了 Power Flow。它既不属于地下的昏暗，也不屈服于主流的浮华。{'\n'}
                  它站在电流与街头的交汇处，构建一个节奏更凶猛、旋律更迷幻、能量更密集的新现实。
                </Text>
              </View>
            </SwiperItem>
            <SwiperItem>
              <View className='section-pane'>
                {relatedActivities.length > 0 ? (
                  relatedActivities.map((item) => (
                    <View key={item.id} className='related-item'>
                      <Text className='related-title'>{item.product_name}</Text>
                      <Text className='related-price'>¥{Math.round(item.price / 100)}</Text>
                    </View>
                  ))
                ) : (
                  <Text className='empty-tip'>暂无相关活动</Text>
                )}
              </View>
            </SwiperItem>
            <SwiperItem>
              <View className='section-pane'>
                {relatedDynamics.map((item) => (
                  <Text key={item} className='dynamic-item'>
                    {item}
                  </Text>
                ))}
              </View>
            </SwiperItem>
          </Swiper>

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
                  <View className='drawer-tag-row'>
                    <Text className='drawer-tag'>支持退票</Text>
                  </View>
                  <View className='drawer-meta-row'>
                    <Text className='drawer-meta-label'>时间：</Text>
                    <Text className='drawer-meta-value'>{timeText}</Text>
                  </View>
                  <View className='drawer-meta-row drawer-meta-row--location'>
                    <Text className='drawer-meta-label'>地点：</Text>
                    <Text className='drawer-meta-value'>{locationText}</Text>
                  </View>
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
                {tickets.map((ticket) => (
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
              {viewerLoading ? (
                <Text className='viewer-empty'>加载中...</Text>
              ) : viewerList.length === 0 ? (
                <Text className='viewer-empty'>{viewerError || '暂无观演人，请先新增'}</Text>
              ) : (
                <ScrollView scrollY className='viewer-list'>
                  {viewerList.map((viewer) => (
                    <View key={viewer.id} className='viewer-item' onClick={() => setSelectedViewerId(viewer.id)}>
                      <View className='viewer-meta'>
                        <Text className='viewer-name'>{viewer.real_name}</Text>
                        <Text className='viewer-sub'>
                          {viewer.id_card} {viewer.phone}
                        </Text>
                      </View>
                      <View className={`viewer-radio ${selectedViewerId === viewer.id ? 'active' : ''}`} />
                    </View>
                  ))}
                </ScrollView>
              )}

              {selectedViewer && (
                <Text className='viewer-selected-tip'>
                  当前已选：{selectedViewer.real_name} {selectedViewer.id_card}
                </Text>
              )}

              <View className='viewer-add' onClick={handleManageViewers}>
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

      {showShareModal && (
      <AtFloatLayout
        className='activity-share-layout'
        isOpened={showShareModal}
        title='分享到'
        onClose={() => setShowShareModal(false)}
      >
        <View className='activity-share-modal'>
          <View className='activity-share-input-box'>
            <Input
              className='activity-share-input'
              placeholder='说点什么吧...(可选)'
              placeholderStyle='color:#6f6f6f;'
              value={shareMsg}
              onInput={(e) => setShareMsg(e.detail.value)}
              maxlength={100}
            />
          </View>
          <ScrollView scrollY className='activity-session-list'>
            {loadingSession && (
              <View className='activity-share-loading'>
                <Text className='activity-share-loading-text'>加载中...</Text>
              </View>
            )}
            {!loadingSession && sessionList.length === 0 && (
              <View className='activity-share-loading'>
                <Text className='activity-share-empty-text'>暂无会话</Text>
              </View>
            )}
            {!loadingSession && sessionList.map((session) => (
              <View
                key={`${session.session_type}_${session.peer_id}`}
                className='activity-session-item'
                onClick={() => handleShareToSession(session)}
              >
                <Image
                  src={safeDecode(session.peer_avatar)}
                  className='activity-session-avatar'
                  mode='aspectFill'
                />
                <View className='activity-session-info'>
                  <Text className='activity-session-name'>{session.peer_name || '未命名'}</Text>
                  <Text className='activity-session-type'>
                    {session.session_type === 2 ? '群聊' : '私聊'}
                  </Text>
                </View>
                <AtIcon value='chevron-right' size='20' color='#999' />
              </View>
            ))}
          </ScrollView>
        </View>
      </AtFloatLayout>
      )}
    </View>
  )
}
