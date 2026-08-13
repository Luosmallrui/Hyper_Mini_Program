import { View, Text, Image, ScrollView, Input, RichText } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AtIcon, AtFloatLayout } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/float-layout.scss'
import { request } from '@/utils/request'
import { requireLogin } from '@/utils/auth'
import { readContentFollowTarget } from '@/utils/content-follow'
import { getVisitorId } from '@/utils/visitor-id'
import backgroundWebp from '../../assets/images/background.webp'
import certificationIcon from '../../assets/images/certification.png'
import { calculateTicketPointsDeduction, formatYuanFromCents, POINT_DISCOUNT_CENTS } from './points'
import { buildActivitySharePayload, getActivityShareErrorMessage } from './share'
import { getActivitySubscriptionEndpoint } from './subscription'
import { buildOrderViewerFields, toggleViewerSelection } from './viewer-selection'
import {
  getRelatedNoteCover,
  normalizeRelatedNotes,
  RelatedNote,
} from '../square/related-notes'
import './index.scss'

const heroBg = backgroundWebp
const organizerAvatar =
  'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/6c2cc88a7b944eb3b55c66ee51532f72_mergeImage.png'
const posterImage = backgroundWebp

// 把 ISO 时间（2026-07-01T00:00:00+08:00）格式化为可读形式（2026-07-01 00:00），非 ISO 文本原样保留
const formatActivityTimeText = (value?: string) => {
  if (!value) return ''
  const formatted = value.replace(
    /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?/g,
    '$1-$2-$3 $4:$5',
  )
  // 已删除/下架活动的起止时间可能是零值（0001-01-01），按后端约定不格式化展示
  if (formatted.includes('0001-01-01')) return ''
  return formatted
}

interface MerchantGood {
  id: string | number
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

interface ActivityTicketSpec {
  id: string | number
  name: string
  price: number
  stock?: number
  sold_count?: number
  is_enabled?: number
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
  is_subscribe?: boolean
  follow_count?: number
  follow_target_type?: string
  follow_target_id?: string | number
  business_hours: string
  address?: string
  start_time?: string
  end_time?: string
  poster_list?: string
  poster_long?: string
  description?: string
  /** 优惠标签（发布时绑定，/content-tags） */
  tags?: Array<{ id?: number | string; name?: string }>
  /** 下架兜底详情：is_hidden=true 时已购票用户可只读查看，不提供票种/订阅/关注/下单 */
  is_hidden?: boolean
  type?: 'party' | 'venue' | string
  ticket_specs?: ActivityTicketSpec[]
  organizer?: {
    id: number | string
    user_id?: number | string
    name: string
    logo?: string
    /** 主办方审核状态：2=已认证 */
    status?: number
  }
}

interface TicketType {
  id: string
  productId: string | null
  label: string
  priceCents: number
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
  const [selectedViewerIds, setSelectedViewerIds] = useState<number[]>([])
  const [viewerLoading, setViewerLoading] = useState(false)
  const [viewerError, setViewerError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [sessionList, setSessionList] = useState<SessionItem[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [selectedShareSession, setSelectedShareSession] = useState<SessionItem | null>(null)
  const [followPending, setFollowPending] = useState(false)
  const [subscribePending, setSubscribePending] = useState(false)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsError, setPointsError] = useState('')
  const [usePoints, setUsePoints] = useState(false)
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([])
  const [relatedNotesLoading, setRelatedNotesLoading] = useState(false)
  const viewerInitLoadedRef = useRef(false)

  const fallbackMapCenter = { latitude: 30.657, longitude: 104.066 }
  const normalizeUint64String = (value: unknown) => {
    const text = String(value ?? '').trim()
    return /^\d+$/.test(text) && text !== '0' ? text : null
  }
  const fallbackProductId = normalizeUint64String(activityId)

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
          url: `/api/v1/activity/${activityId}`,
          method: 'GET',
          // 游客 UV 去重：带上本地持久化的访客标识（后端据此统计 PV/UV 与转化率）
          header: { 'X-Visitor-Id': getVisitorId() },
        })
        const detail = res?.data?.data || null
        if (!detail) {
          setActivity(null)
          return
        }
        setActivity({
          ...detail,
          id: Number(detail.id) || 0,
          name: detail.name || '',
          avg_price: detail.avg_price || 0,
          location_name: detail.address || detail.location_name || '',
          lat: detail.latitude ?? detail.lat,
          lng: detail.longitude ?? detail.lng,
          images: [detail.poster_detail, detail.poster_list, detail.poster_long].filter(Boolean),
          goods: Array.isArray(detail.goods) ? detail.goods : [],
          user_name: detail.organizer?.name || detail.user_name || '主办方',
          user_avatar: detail.organizer?.logo || detail.user_avatar || '',
          is_follow: Boolean(detail.is_follow),
          is_subscribe: Boolean(detail.is_subscribe),
          is_hidden: detail.is_hidden === true || Number(detail.is_hidden) === 1,
          business_hours: detail.start_time || detail.end_time
            ? `${detail.start_time || ''}${detail.end_time ? ` - ${detail.end_time}` : ''}`
            : detail.business_hours || '',
          ticket_specs: Array.isArray(detail.ticket_specs) ? detail.ticket_specs : [],
        })
      } catch (error) {
        console.error('Activity detail load failed:', error)
      }
    }

    fetchActivity()
  }, [activityId])

  useEffect(() => {
    const fetchRelatedNotes = async () => {
      if (!activityId) return
      setRelatedNotesLoading(true)
      try {
        const res = await request({
          url: '/api/v1/note/related',
          method: 'GET',
          data: {
            activity_id: activityId,
            pageSize: 20,
          },
        })
        setRelatedNotes(normalizeRelatedNotes(res?.data?.data?.notes || []))
      } catch (error) {
        console.error('Activity related notes load failed:', error)
        setRelatedNotes([])
      } finally {
        setRelatedNotesLoading(false)
      }
    }

    fetchRelatedNotes()
  }, [activityId])

  const fetchViewers = async (preferredViewerId?: number | null) => {
    try {
      setViewerLoading(true)
      setViewerError('')
      const res = await request({
        url: '/api/v1/viewers',
        method: 'GET',
      })
      const viewers: ViewerItem[] = Array.isArray(res?.data?.data?.list)
        ? res.data.data.list
        : []
      setViewerList(viewers)

      setSelectedViewerIds((currentIds) => {
        const availableIds = new Set(viewers.map((viewer) => viewer.id))
        const retainedIds = currentIds.filter((id) => availableIds.has(id)).slice(0, ticketCount)
        if (preferredViewerId && availableIds.has(preferredViewerId) && !retainedIds.includes(preferredViewerId)) {
          return [preferredViewerId, ...retainedIds].slice(0, ticketCount)
        }
        if (retainedIds.length > 0 || viewers.length === 0) return retainedIds
        return [viewers[0].id]
      })
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
    if (!Taro.getStorageSync('access_token')) return
    void fetchViewers()
  }, [])

  const tickets = useMemo<TicketType[]>(() => {
    if (activity?.ticket_specs && activity.ticket_specs.length > 0) {
      return activity.ticket_specs
        .filter((item) => item.is_enabled !== 0)
        .map((item) => ({
          id: String(item.id),
          productId: normalizeUint64String(item.id),
          label: item.name,
          priceCents: Math.max(Math.round(item.price || 0), 0),
        }))
    }
    if (activity?.goods && activity.goods.length > 0) {
      return activity.goods.map((item) => ({
        id: String(item.id),
        productId: normalizeUint64String(item.id),
        label: item.product_name,
        priceCents: Math.max(Math.round(item.price || 0), 0),
      }))
    }
    return [
      { id: 'single', productId: fallbackProductId, label: '单人票(赠啤酒1瓶)', priceCents: 6500 },
      { id: 'double', productId: fallbackProductId, label: '双人票(赠啤酒2瓶)', priceCents: 12000 },
      { id: 'vip', productId: fallbackProductId, label: '畅饮票(酒水畅饮)', priceCents: 15000 },
    ]
  }, [activity?.goods, activity?.ticket_specs, fallbackProductId])

  useEffect(() => {
    if (tickets.length === 0) return
    if (!selectedTicket || !tickets.some((ticket) => ticket.id === selectedTicket.id)) {
      setSelectedTicket(tickets[0])
    }
  }, [tickets, selectedTicket])

  const token = Taro.getStorageSync('access_token')
  const totalPriceCents = useMemo(() => {
    if (!selectedTicket) return 0
    return selectedTicket.priceCents * ticketCount
  }, [selectedTicket, ticketCount])
  const { pointsAmount, discountCents, payableCents } = useMemo(
    () => calculateTicketPointsDeduction({
      usePoints,
      pointsBalance,
      totalAmountCents: totalPriceCents,
    }),
    [pointsBalance, totalPriceCents, usePoints],
  )
  const canUsePoints = pointsBalance > 0 && totalPriceCents >= POINT_DISCOUNT_CENTS

  const selectedViewers = useMemo(
    () => selectedViewerIds
      .map((id) => viewerList.find((viewer) => viewer.id === id))
      .filter((viewer): viewer is ViewerItem => Boolean(viewer)),
    [viewerList, selectedViewerIds],
  )

  useEffect(() => {
    setSelectedViewerIds((ids) => ids.slice(0, ticketCount))
  }, [ticketCount])

  const fetchPointsBalance = async () => {
    setPointsLoading(true)
    setPointsError('')
    try {
      const res = await request({
        url: '/api/v1/points/balance',
        method: 'GET',
      })
      const data = res?.data?.data || {}
      const balance = Number(data.balance ?? data.points ?? data.available_points ?? data.available ?? 0)
      setPointsBalance(Number.isFinite(balance) ? Math.max(balance, 0) : 0)
    } catch (error) {
      setPointsBalance(0)
      setPointsError('积分加载失败')
    } finally {
      setPointsLoading(false)
    }
  }

  useEffect(() => {
    if (!drawerOpen || !token) return
    void fetchPointsBalance()
  }, [drawerOpen, token])

  const handlePay = async () => {
    if (isPaying) return
    if (!requireLogin()) return
    if (viewerList.length === 0) {
      Taro.showToast({ title: '请先添加并选择观演人', icon: 'none' })
      return
    }
    const ticketSpecId = Number(selectedTicket?.productId)
    if (!selectedTicket?.productId || !Number.isFinite(ticketSpecId) || ticketSpecId <= 0) {
      Taro.showToast({ title: '票务信息加载失败，请稍后重试', icon: 'none' })
      return
    }
    if (selectedViewers.length !== ticketCount) {
      Taro.showToast({ title: `请选择 ${ticketCount} 位观演人`, icon: 'none' })
      return
    }

    try {
      setIsPaying(true)
      Taro.showLoading({ title: '准备支付...', mask: true })
      const createRes = await request({
        url: '/api/v1/order/create',
        method: 'POST',
        data: {
          activity_id: Number(activityId),
          ticket_spec_id: ticketSpecId,
          quantity: ticketCount,
          ...buildOrderViewerFields(selectedViewers),
          use_points: pointsAmount > 0,
          points_amount: pointsAmount,
          // 销售渠道归因快照（docs/sales_channel_order_filter_api_20260810.md）：微信小程序固定 wechat
          sales_channel: 'wechat',
        },
      })

      const createPayload = createRes.data
      if (createPayload.code !== 200 || !createPayload.data?.order_no) {
        throw new Error(createPayload.msg || '创建订单失败')
      }
      const orderNo = createPayload.data.order_no

      if (payableCents <= 0) {
        Taro.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
          Taro.navigateTo({ url: `/pages/order-sub/order-pay-success/index?order_no=${orderNo}` })
        }, 1000)
        return
      }

      const res = await request({
        url: '/api/v1/pay/prepay',
        method: 'POST',
        data: { order_no: orderNo },
      })

      const payload = res.data
      if (payload.code !== 200) {
        throw new Error(payload.msg || '获取预支付信息失败')
      }

      const payParams = payload.data
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
            Taro.navigateTo({ url: `/pages/order-sub/order-pay-success/index?order_no=${payParams.out_trade_no || orderNo}` })
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
      Taro.showModal({ title: '支付失败', content: error?.message || '系统异常，请稍后重试', showCancel: false })
    } finally {
      setIsPaying(false)
      Taro.hideLoading()
    }
  }

  const heroImage = activity?.images?.[0] || activity?.poster_list || heroBg
  const organizerName = activity?.organizer?.name || activity?.user_name || 'Pure Loop'
  // 内容关注数（docs/content_follow_api_20260810.md），后端未部署 follow_count 时显示 0
  const organizerFans = String(activity?.follow_count ?? 0)
  const titleText = activity?.name || 'POWER FLOW 嘻哈与电子音乐结合'
  const timeText = formatActivityTimeText(activity?.business_hours) || (activity?.is_hidden ? '-' : '时间待定')
  const locationText = activity?.address || activity?.location_name || '高新区盛园街道保利星荟5栋1楼'
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

  const handleOpenOrganizer = () => {
    // 统一跳 C 端商家公开主页（无 organizer.id 不跳）
    const organizerId = activity?.organizer?.id
    if (!organizerId) return
    Taro.navigateTo({ url: `/pages/user-sub/organizer-home/index?id=${organizerId}` })
  }

  const handleToggleFollow = async () => {
    if (!requireLogin()) return
    if (!activity || followPending) return
    if (activity.is_hidden) {
      Taro.showToast({ title: '活动已下架，暂不可关注', icon: 'none' })
      return
    }
    const followTarget = readContentFollowTarget(activity)
    if (!activity.user_id && !followTarget) {
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
        // 内容关注：保留 user_id 兼容字段，有 follow_target_* 时按对象关注（docs/content_follow_api_20260810.md）
        data: { user_id: String(activity.user_id), ...(followTarget ? { target_type: followTarget.type, target_id: followTarget.id } : {}) },
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

  const handleToggleSubscribe = async () => {
    if (!requireLogin()) return
    if (!activity || subscribePending) return
    if (activity.is_hidden) {
      Taro.showToast({ title: '活动已下架，暂不可订阅', icon: 'none' })
      return
    }

    const nextSubscribed = !Boolean(activity.is_subscribe)
    const endpoint = getActivitySubscriptionEndpoint(activity.id || activityId, nextSubscribed)
    setSubscribePending(true)
    setActivity((prev) => (prev ? { ...prev, is_subscribe: nextSubscribed } : prev))

    try {
      const res = await request({
        url: endpoint,
        method: 'POST',
      })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) {
        throw new Error((res as any)?.data?.msg || '操作失败')
      }
      Taro.showToast({ title: nextSubscribed ? '订阅成功' : '已取消订阅', icon: 'none' })
    } catch (error) {
      setActivity((prev) => (prev ? { ...prev, is_subscribe: !nextSubscribed } : prev))
      Taro.showToast({ title: nextSubscribed ? '订阅失败' : '取消订阅失败', icon: 'none' })
    } finally {
      setSubscribePending(false)
    }
  }

  const priceRange = useMemo(() => {
    if (activity?.ticket_specs && activity.ticket_specs.length > 0) {
      const prices = activity.ticket_specs.map((item) => Math.max(Math.round(item.price || 0), 0))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) return `${formatYuanFromCents(min)}¥`
      return `${formatYuanFromCents(min)}¥-${formatYuanFromCents(max)}¥`
    }
    if (activity?.goods && activity.goods.length > 0) {
      const prices = activity.goods.map((item) => Math.max(Math.round(item.price || 0), 0))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) return `${formatYuanFromCents(min)}¥`
      return `${formatYuanFromCents(min)}¥-${formatYuanFromCents(max)}¥`
    }
    if (activity?.avg_price) return `${formatYuanFromCents(activity.avg_price)}¥`
    return '65¥-128¥'
  }, [activity?.goods, activity?.ticket_specs, activity?.avg_price])

  const isVenue = activity?.type === 'venue'
  const tabItems = isVenue ? ['场地详情', '相关场地', '相关动态'] : ['活动详情', '相关活动', '相关动态']
  const relatedActivities = (activity?.goods || []).slice(0, 3)

  const handleManageViewers = () => {
    if (!requireLogin()) return
    const firstSelectedViewerId = selectedViewerIds[0] || ''
    Taro.navigateTo({
      url: `/pages/activity-attendee/index?mode=create&selectedViewerId=${firstSelectedViewerId}`,
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
    if (!requireLogin()) return
    if (!activityId) {
      Taro.showToast({ title: '活动信息无效', icon: 'none' })
      return
    }
    setShowShareModal(true)
    setShareMsg('')
    setSelectedShareSession(null)
    void fetchSessionList()
  }

  const handleShareToSession = async (session: SessionItem) => {
    if (!activityId) return
    const clientMsgId = `activity_share_${Date.now()}_${Math.random().toString(16).slice(2)}`
    Taro.showLoading({ title: '分享中...' })
    try {
      const res = await request({
        url: '/api/v1/message/send',
        method: 'POST',
        data: buildActivitySharePayload({
          activityId,
          title: titleText,
          session,
          clientMsgId,
          message: shareMsg,
        }),
      })
      const resData = parseResponse(res?.data)
      if (resData?.code === 200) {
        Taro.showToast({ title: '分享成功', icon: 'success' })
        setShowShareModal(false)
        setShareMsg('')
        setSelectedShareSession(null)
        return
      }
      Taro.showToast({ title: getActivityShareErrorMessage(resData?.msg), icon: 'none' })
    } catch (error) {
      console.error('share activity failed:', error)
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: getActivityShareErrorMessage(message), icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const handleConfirmShare = () => {
    if (!selectedShareSession) {
      Taro.showToast({ title: '请选择会话', icon: 'none' })
      return
    }
    void handleShareToSession(selectedShareSession)
  }

  const handleRelatedNoteClick = (noteId: string) => {
    Taro.navigateTo({ url: `/pages/square-sub/post-detail/index?id=${noteId}` })
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
          className='activity-hero-hit'
          onClick={() => {
            const url = heroImage || posterImage
            if (url) Taro.previewImage({ urls: [url], current: url })
          }}
        />
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
              <Text className='time-label'>{isVenue ? '营业时间：' : '活动时间：'}</Text>
              <Text className='time-value'>{timeText}</Text>
            </View>
          </View>

          <View className='location-row' onClick={handleOpenMap}>
            <Text className='location-text'>{locationText}</Text>
            <AtIcon className='location-icon' value='chevron-right' size='16' color='#fff' />
          </View>

          <View className='price-row'>
            <Text className='price-range'>{priceRange}</Text>
            <View className='subscribe-pill' onClick={handleToggleSubscribe}>
              <Text className='subscribe-text'>{activity?.is_subscribe ? '取消订阅' : (isVenue ? '订阅场地' : '订阅活动')}</Text>
            </View>
            <View className='share-pill' onClick={handleOpenShare}>
              <Text className='share-text'>{isVenue ? '分享场地' : '分享活动'}</Text>
            </View>
          </View>

          <View className='host-card' onClick={handleOpenOrganizer}>
            <Image className='host-avatar' src={activity?.user_avatar || organizerAvatar} mode='aspectFill' />
            <View className='host-info'>
              <View className='host-meta'>
                <View className='host-name-row'>
                  <Text className='host-name'>{organizerName}</Text>
                  {Number(activity?.organizer?.status) === 2 && (
                    <Image className='verify-icon' src={certificationIcon} mode='aspectFit' />
                  )}
                </View>
                <Text className='host-fans'>{organizerFans} 粉丝</Text>
              </View>
            </View>
            <View
              className='host-follow'
              onClick={(e) => {
                e.stopPropagation()
                handleToggleFollow()
              }}
            >
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

          {activeTab === 0 && (
            <View className='section-pane'>
              {activity?.description ? (
                <RichText className='activity-desc' nodes={activity.description} />
              ) : (
                !activity?.poster_long && (
                  <Text className='empty-tip'>{isVenue ? '暂无场地详情' : '暂无活动详情'}</Text>
                )
              )}
              {!!activity?.poster_long && (
                <Image
                  className='activity-long-poster'
                  src={activity.poster_long}
                  mode='widthFix'
                  onClick={() => Taro.previewImage({ urls: [activity.poster_long as string], current: activity.poster_long as string })}
                />
              )}
            </View>
          )}
          {activeTab === 1 && (
            <View className='section-pane'>
              {relatedActivities.length > 0 ? (
                relatedActivities.map((item) => (
                  <View key={item.id} className='related-item'>
                    <Text className='related-title'>{item.product_name}</Text>
                    <Text className='related-price'>¥{formatYuanFromCents(item.price)}</Text>
                  </View>
                ))
              ) : (
                <Text className='empty-tip'>{isVenue ? '暂无相关场地' : '暂无相关活动'}</Text>
              )}
            </View>
          )}
          {activeTab === 2 && (
            <View className='section-pane'>
              {relatedNotes.length > 0 ? (
                <View className='activity-related-note-list'>
                  {relatedNotes.map((note) => {
                    const cover = getRelatedNoteCover(note)
                    return (
                      <View key={note.id} className='activity-related-note-card' onClick={() => handleRelatedNoteClick(note.id)}>
                        {cover ? (
                          <Image className='activity-related-note-cover' src={cover} mode='aspectFill' />
                        ) : (
                          <View className='activity-related-note-cover placeholder' />
                        )}
                        <View className='activity-related-note-info'>
                          <Text className='activity-related-note-title'>{note.title}</Text>
                          <Text className='activity-related-note-meta'>{note.authorName} · {note.likeCount} 赞</Text>
                        </View>
                        <AtIcon value='chevron-right' size='14' color='#777' />
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text className='empty-tip'>{relatedNotesLoading ? '动态加载中...' : '暂无相关动态'}</Text>
              )}
            </View>
          )}

          {activity?.is_hidden ? (
            <View className='ticket-bar'>
              <View className='ticket-pill disabled'>
                <Text className='ticket-text'>活动已下架</Text>
              </View>
            </View>
          ) : !isVenue && (
            <View className='ticket-bar' onClick={() => setDrawerOpen(true)}>
              <View className='ticket-pill'>
                <Text className='ticket-text'>立即购票</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {drawerOpen && (
        <View className='drawer-mask open' onClick={() => setDrawerOpen(false)}>
          <View className='drawer-panel open' onClick={(e) => e.stopPropagation()}>
            <View className='drawer-header'>
              <View className='drawer-title'>
                <Image
                  className='drawer-poster'
                  src={heroImage || posterImage}
                  mode='aspectFill'
                  onClick={() => {
                    const url = heroImage || posterImage
                    if (url) Taro.previewImage({ urls: [url], current: url })
                  }}
                />
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

            <ScrollView scrollY className='drawer-body'>
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
                <View className='count-btn' onClick={() => setTicketCount(Math.min(6, ticketCount + 1))}>
                  +
                </View>
              </View>
            </View>

            <View className='viewer-section'>
              <View className='section-row'>
                <Text className='section-title'>观演人信息</Text>
                <Text className='section-sub'>已选 {selectedViewers.length}/{ticketCount} 位</Text>
              </View>
              {viewerLoading ? (
                <Text className='viewer-empty'>加载中...</Text>
              ) : viewerList.length === 0 ? (
                <Text className='viewer-empty'>{viewerError || '暂无观演人，请先新增'}</Text>
              ) : (
                <ScrollView scrollY className='viewer-list'>
                  {viewerList.map((viewer) => (
                    <View
                      key={viewer.id}
                      className='viewer-item'
                      onClick={() => {
                        const nextIds = toggleViewerSelection(selectedViewerIds, viewer.id, ticketCount)
                        if (nextIds === selectedViewerIds) {
                          Taro.showToast({ title: `最多选择 ${ticketCount} 位观演人`, icon: 'none' })
                          return
                        }
                        setSelectedViewerIds(nextIds)
                      }}
                    >
                      <View className='viewer-meta'>
                        <Text className='viewer-name'>{viewer.real_name}</Text>
                        <Text className='viewer-sub'>
                          {viewer.id_card} {viewer.phone}
                        </Text>
                      </View>
                      <View className={`viewer-check ${selectedViewerIds.includes(viewer.id) ? 'active' : ''}`}>
                        {selectedViewerIds.includes(viewer.id) && <Text>✓</Text>}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}

              {selectedViewers.length > 0 && (
                <Text className='viewer-selected-tip'>
                  当前已选：{selectedViewers.map((viewer) => viewer.real_name).join('、')}
                </Text>
              )}

              <View className='viewer-add' onClick={handleManageViewers}>
                新增观演人
              </View>
            </View>

            <View className='points-section'>
              <View className='section-row'>
                <Text className='section-title'>积分抵扣</Text>
                <Text className='section-sub'>
                  {pointsLoading ? '加载中...' : pointsError || `可用 ${pointsBalance} 积分`}
                </Text>
              </View>
              <View
                className={`points-toggle ${pointsAmount > 0 ? 'active' : ''} ${!canUsePoints ? 'disabled' : ''}`}
                onClick={() => {
                  if (!canUsePoints) {
                    Taro.showToast({ title: pointsError || '暂无可用积分', icon: 'none' })
                    return
                  }
                  setUsePoints((prev) => !prev)
                }}
              >
                <View>
                  <Text className='points-title'>使用积分抵扣</Text>
                  <Text className='points-desc'>预计抵扣 ¥{formatYuanFromCents(discountCents)}，消耗 {pointsAmount} 积分</Text>
                </View>
                <View className='points-check'>
                  {pointsAmount > 0 ? '已选' : '未选'}
                </View>
              </View>
            </View>

            {(activity?.tags?.length || activity?.description || activity?.poster_long) ? (
              <View className='drawer-detail-section'>
                <View className='section-row'>
                  <Text className='section-title'>活动详情</Text>
                </View>
                {!!activity?.tags?.length && (
                  <View className='drawer-tag-list'>
                    {activity.tags.map((tag, index) => (
                      <Text key={`${tag.id ?? index}`} className='drawer-detail-tag'>{tag.name || ''}</Text>
                    ))}
                  </View>
                )}
                {!!activity?.description && (
                  <RichText className='drawer-detail-text' nodes={activity.description} />
                )}
                {!!activity?.poster_long && (
                  <Image
                    className='drawer-long-poster'
                    src={activity.poster_long}
                    mode='widthFix'
                    onClick={() => Taro.previewImage({ urls: [activity.poster_long as string], current: activity.poster_long as string })}
                  />
                )}
              </View>
            ) : null}
            </ScrollView>

            <View className='drawer-footer'>
              <View className='total'>
                <Text className='total-label'>合计 ¥{formatYuanFromCents(payableCents)}</Text>
                <Text className='total-sub'>共 {ticketCount} 张{pointsAmount > 0 ? `，已抵 ¥${formatYuanFromCents(discountCents)}` : ''}</Text>
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
        onClose={() => {
          setShowShareModal(false)
          setSelectedShareSession(null)
        }}
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
                className={`activity-session-item ${selectedShareSession?.peer_id === session.peer_id && selectedShareSession?.session_type === session.session_type ? 'selected' : ''}`}
                onClick={() => setSelectedShareSession(session)}
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
                <AtIcon value={selectedShareSession?.peer_id === session.peer_id && selectedShareSession?.session_type === session.session_type ? 'check' : 'chevron-right'} size='20' color='#999' />
              </View>
            ))}
          </ScrollView>
          <View className={`activity-share-confirm ${selectedShareSession ? 'enabled' : ''}`} onClick={handleConfirmShare}>
            确认分享
          </View>
        </View>
      </AtFloatLayout>
      )}
    </View>
  )
}
