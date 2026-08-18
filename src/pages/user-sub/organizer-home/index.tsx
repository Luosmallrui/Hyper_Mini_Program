import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { useNavBarMetrics } from '@/hooks/useNavBarMetrics'
import { request } from '@/utils/request'
import ProfileBindModal from '@/components/ProfileBindModal'
import { useProfileBindGate } from '@/hooks/useProfileBindGate'
import { buildFollowPayload } from '@/utils/content-follow'
import { formatYuanFromCents } from '../../activity/points'
import './index.scss'

const PAGE_SIZE = 20

interface OrganizerActivityItem {
  id: number | string
  type?: string
  name?: string
  poster_list?: string
  start_time?: string
  end_time?: string
  status?: number
  /** 下架标记（后端返回时卡片展示「已下架」） */
  is_hidden?: boolean | number
}

interface OrganizerVenueItem {
  /** 场地 id（=主办方 organizer_id），跳场地详情页用 */
  id: number | string
  /** 旧模型场地对应的活动 id（仅兼容展示，不再用于跳转） */
  activity_id?: number | string
  /** 场地活动标题，卡片标题优先展示 */
  activity_name?: string
  name?: string
  cover_image?: string
  description?: string
  address?: string
  /** 当前用户是否订阅该场地（venue 类型时用于订阅按钮） */
  is_subscribe?: boolean
  /** 下架标记（后端返回时卡片展示「已下架」） */
  is_hidden?: boolean | number
}

// C 端商家公开主页数据，见 docs/public_organizer_home_api_20260811.md
// 头部展示 organizers 表的 name/logo（商家名称与 Logo），不使用 owner_nickname/owner_avatar（申请人个人昵称头像）
interface OrganizerHomeData {
  id: number | string
  user_id?: number | string
  // 商家类型（注册时确定）：party 只展示活动区，venue 只展示场地区；未返回时两区都展示
  type?: string
  name?: string
  logo?: string
  cover_image?: string
  gallery?: string[]
  description?: string
  business_hours?: string
  service_phone?: string
  province?: string
  city?: string
  district?: string
  address?: string
  latitude?: number
  longitude?: number
  average_spend?: number
  follow_count?: number
  is_follow?: boolean
  follow_target_type?: string
  follow_target_id?: number | string
  activity_count?: number
  venue_count?: number
  activities?: { list?: OrganizerActivityItem[]; total?: number }
  venues?: { list?: OrganizerVenueItem[]; total?: number }
}

// 把 ISO 时间（2026-08-15T20:00:00+08:00）格式化为可读形式（2026-08-15 20:00），非 ISO 文本原样保留
const formatDateTimeText = (value?: string) => {
  if (!value) return ''
  return value.replace(
    /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?/g,
    '$1-$2-$3 $4:$5',
  )
}

const formatNumber = (num: number): string => {
  if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}w`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(num)
}

export default function OrganizerHomePage() {
  const router = useRouter()
  const organizerId = router.params?.id || ''
  const { requireProfile, bindVisible, closeBindModal } = useProfileBindGate()
  const { statusBarHeight, navBarHeight } = useNavBarMetrics()

  const [organizer, setOrganizer] = useState<OrganizerHomeData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [followPending, setFollowPending] = useState(false)
  const [subscribePending, setSubscribePending] = useState(false)

  const [activities, setActivities] = useState<OrganizerActivityItem[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityPage, setActivityPage] = useState(1)
  const [activityLoading, setActivityLoading] = useState(false)

  const [venues, setVenues] = useState<OrganizerVenueItem[]>([])
  const [venueTotal, setVenueTotal] = useState(0)
  const [venuePage, setVenuePage] = useState(1)
  const [venueLoading, setVenueLoading] = useState(false)

  const requestOrganizerHome = useCallback(
    async (nextActivityPage: number, nextVenuePage: number): Promise<OrganizerHomeData> => {
      const res = await request({
        url: `/api/v1/organizers/${organizerId}?activity_page=${nextActivityPage}&activity_size=${PAGE_SIZE}&venue_page=${nextVenuePage}&venue_size=${PAGE_SIZE}`,
        method: 'GET',
      })
      const code = Number((res as any)?.data?.code)
      const data = (res as any)?.data?.data
      // 未审核、已驳回或被停用的商家主页不可见，按不存在处理（响应非 200 或 404）
      if ((res as any)?.statusCode !== 200 || code !== 200 || !data) {
        throw new Error((res as any)?.data?.msg || 'organizer not found')
      }
      return data as OrganizerHomeData
    },
    [organizerId],
  )

  useEffect(() => {
    const fetchHome = async () => {
      if (!organizerId) {
        setPageLoading(false)
        setNotFound(true)
        return
      }
      setPageLoading(true)
      try {
        const data = await requestOrganizerHome(1, 1)
        setOrganizer(data)
        setNotFound(false)
        setActivities(Array.isArray(data?.activities?.list) ? data.activities.list : [])
        setActivityTotal(Number(data?.activities?.total) || 0)
        setActivityPage(1)
        setVenues(Array.isArray(data?.venues?.list) ? data.venues.list : [])
        setVenueTotal(Number(data?.venues?.total) || 0)
        setVenuePage(1)
      } catch (error) {
        console.error('Organizer home load failed:', error)
        setNotFound(true)
      } finally {
        setPageLoading(false)
      }
    }
    fetchHome()
  }, [organizerId, requestOrganizerHome])

  const handleLoadMoreActivities = async () => {
    if (activityLoading || activities.length >= activityTotal) return
    const nextPage = activityPage + 1
    setActivityLoading(true)
    try {
      const data = await requestOrganizerHome(nextPage, 1)
      const list = Array.isArray(data?.activities?.list) ? data.activities.list : []
      setActivities((prev) => [...prev, ...list])
      setActivityTotal(Number(data?.activities?.total) || 0)
      setActivityPage(nextPage)
    } catch (error) {
      console.error('Organizer activities load failed:', error)
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      setActivityLoading(false)
    }
  }

  const handleLoadMoreVenues = async () => {
    if (venueLoading || venues.length >= venueTotal) return
    const nextPage = venuePage + 1
    setVenueLoading(true)
    try {
      const data = await requestOrganizerHome(1, nextPage)
      const list = Array.isArray(data?.venues?.list) ? data.venues.list : []
      setVenues((prev) => [...prev, ...list])
      setVenueTotal(Number(data?.venues?.total) || 0)
      setVenuePage(nextPage)
    } catch (error) {
      console.error('Organizer venues load failed:', error)
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      setVenueLoading(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!requireProfile()) return
    if (!organizer || followPending) return

    const prevFollow = Boolean(organizer.is_follow)
    const prevCount = Number(organizer.follow_count) || 0
    const nextFollow = !prevFollow
    const action = nextFollow ? 'follow' : 'unfollow'

    setFollowPending(true)
    // 乐观更新关注状态与粉丝数，失败回滚
    setOrganizer((prev) =>
      prev
        ? { ...prev, is_follow: nextFollow, follow_count: Math.max(prevCount + (nextFollow ? 1 : -1), 0) }
        : prev,
    )

    try {
      const res = await request({
        url: `/api/v1/follow/${action}`,
        method: 'POST',
        // 按商家主页返回的 follow_target_*（organizer 类型）组装；后端未返回时回退为商家自身 id
        data: buildFollowPayload(organizer.user_id ?? organizer.id, {
          follow_target_type: organizer.follow_target_type || 'organizer',
          follow_target_id: organizer.follow_target_id ?? organizer.id,
        }),
      })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) {
        throw new Error((res as any)?.data?.msg || '操作失败')
      }
      Taro.showToast({ title: nextFollow ? '已关注' : '已取消关注', icon: 'success' })
    } catch (error) {
      setOrganizer((prev) =>
        prev ? { ...prev, is_follow: prevFollow, follow_count: prevCount } : prev,
      )
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setFollowPending(false)
    }
  }

  const handleCallService = async () => {
    const phone = organizer?.service_phone
    if (!phone) return
    try {
      await Taro.makePhoneCall({ phoneNumber: String(phone) })
    } catch (error) {
      // 用户取消拨号，无需提示
    }
  }

  const handleToggleSubscribe = async () => {
    if (!requireProfile()) return
    if (!organizer || subscribePending) return
    const venueItem = organizer?.type === 'venue' ? venues[0] : null
    if (!venueItem) return

    const nextSubscribed = !Boolean(venueItem.is_subscribe)
    setSubscribePending(true)
    setVenues(prev => prev.map((v, i) => (i === 0 ? { ...v, is_subscribe: nextSubscribed } : v)))

    try {
      const res = await request({
        url: `/api/v1/venues/${venueItem.id}/subscribe`,
        method: nextSubscribed ? 'POST' : 'DELETE',
      })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) throw new Error((res as any)?.data?.msg || '操作失败')
      Taro.showToast({ title: nextSubscribed ? '订阅成功' : '已取消订阅', icon: 'none' })
    } catch (e) {
      setVenues(prev => prev.map((v, i) => (i === 0 ? { ...v, is_subscribe: !nextSubscribed } : v)))
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setSubscribePending(false)
    }
  }

  const handleOpenMap = () => {
    const lat = Number(organizer?.latitude)
    const lng = Number(organizer?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      Taro.showToast({ title: '位置信息缺失', icon: 'none' })
      return
    }
    Taro.openLocation({
      latitude: lat,
      longitude: lng,
      name: organizer?.name || '',
      address: addressText,
      scale: 16,
    })
  }

  const handlePreviewCover = () => {
    if (heroImage) {
      Taro.previewImage({ current: heroImage, urls: [heroImage] })
    }
  }

  const handleOpenActivity = (id: number | string) => {
    Taro.navigateTo({ url: `/pages/activity/index?id=${String(id)}` })
  }

  const handleOpenVenue = (item: OrganizerVenueItem) => {
    // 新模型下场地即主办方资料（id=organizer_id），统一跳场地详情页，不再依赖 activity_id
    Taro.navigateTo({ url: `/pages/venue/index?id=${String(item.id)}` })
  }

  const heroImage = organizer?.cover_image || organizer?.logo || ''
  const galleryImages = Array.isArray(organizer?.gallery) ? organizer.gallery.filter(Boolean) : []
  const addressText = [organizer?.province, organizer?.city, organizer?.district, organizer?.address]
    .filter(Boolean)
    .join('')
  const averageSpend = Math.max(Number(organizer?.average_spend) || 0, 0)
  const fansCount = Number(organizer?.follow_count) || 0
  const isFollowed = Boolean(organizer?.is_follow)
  const hasInfoRow = Boolean(organizer?.business_hours || addressText || organizer?.service_phone) || averageSpend > 0
  // 商家类型确定：所有类型只展示活动区；venue 顶部已展示场地资料，不再重复列场地区
  const showActivitySection = true
  const showVenueSection = false

  return (
    <View className='organizer-home-page'>
      <ProfileBindModal visible={bindVisible} onClose={closeBindModal} />
      {/* 顶部导航（固定、透明渐变） */}
      <View className='custom-nav' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
        <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
        <View className='nav-content' style={{ height: `${navBarHeight}px` }}>
          <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
          <Text className='nav-title'>商家主页</Text>
          <View className='nav-back nav-back-placeholder' />
        </View>
      </View>

      {pageLoading ? (
        <View className='page-state'>
          <Text className='page-state-text'>加载中...</Text>
        </View>
      ) : notFound || !organizer ? (
        <View className='page-state'>
          <Text className='page-state-text'>商家不存在或已下线</Text>
        </View>
      ) : (
        <>
          {/* 头图：cover_image，无则 logo，再无则深色占位 */}
          <View className='hero-section' onClick={handlePreviewCover}>
            {heroImage ? (
              <Image className='hero-bg-img' src={heroImage} mode='aspectFill' />
            ) : (
              <View className='hero-bg-img hero-placeholder' />
            )}
            <View className='hero-mask' />
          </View>

          <View className='content-scroll'>
            <View className='content-inner'>
              {/* 商家卡 */}
              <View className='merchant-card'>
                <View className='merchant-left'>
                  {organizer.logo ? (
                    <Image className='merchant-logo' src={organizer.logo} mode='aspectFill' />
                  ) : (
                    <View className='merchant-logo merchant-logo-placeholder' />
                  )}
                  <View className='merchant-info'>
                    <Text className='merchant-name'>{organizer.name || '商家'}</Text>
                    <View className='merchant-sub-row'>
                      <Text className='merchant-fans'>{formatNumber(fansCount)} 粉丝</Text>
                    </View>
                  </View>
                </View>
                <View className='merchant-actions'>
                  {organizer?.type === 'venue' && (
                    <View className={`subscribe-btn ${venues[0]?.is_subscribe ? 'subscribed' : ''}`} onClick={handleToggleSubscribe}>
                      {subscribePending ? '处理中' : venues[0]?.is_subscribe ? '已订阅' : '订阅'}
                    </View>
                  )}
                  <View className={`follow-btn ${isFollowed ? 'followed' : ''}`} onClick={handleToggleFollow}>
                    {followPending ? '处理中' : isFollowed ? '已关注' : '关注'}
                  </View>
                </View>
              </View>

              {/* 资料区 */}
              {hasInfoRow ? (
                <View className='info-card'>
                  {organizer.business_hours ? (
                    <View className='info-row'>
                      <AtIcon value='clock' size='15' color='#999' />
                      <Text className='info-label'>经营时间</Text>
                      <Text className='info-value'>{organizer.business_hours}</Text>
                    </View>
                  ) : null}
                  {addressText ? (
                    <View className='info-row' onClick={handleOpenMap}>
                      <AtIcon value='map-pin' size='15' color='#999' />
                      <Text className='info-label'>商家地址</Text>
                      <Text className='info-value'>{addressText}</Text>
                    </View>
                  ) : null}
                  {organizer.service_phone ? (
                    <View className='info-row' onClick={handleCallService}>
                      <AtIcon value='phone' size='15' color='#999' />
                      <Text className='info-label'>客服电话</Text>
                      <Text className='info-value info-phone'>{organizer.service_phone}</Text>
                    </View>
                  ) : null}
                  {averageSpend > 0 ? (
                    <View className='info-row'>
                      <AtIcon value='money' size='15' color='#999' />
                      <Text className='info-label'>人均消费</Text>
                      <Text className='info-value'>¥{formatYuanFromCents(averageSpend)}/人</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* 简介 */}
              {organizer.description ? (
                <View className='section'>
                  <Text className='section-title'>简介</Text>
                  <Text className='desc-text'>{organizer.description}</Text>
                </View>
              ) : null}

              {/* 场地图册 */}
              {galleryImages.length > 0 ? (
                <View className='section'>
                  <Text className='section-title'>场地图册</Text>
                  <ScrollView className='gallery-scroll' scrollX enhanced showScrollbar={false}>
                    <View className='gallery-row'>
                      {galleryImages.map((img, idx) => (
                        <Image
                          key={`${img}-${idx}`}
                          className='gallery-img'
                          src={img}
                          mode='aspectFill'
                          onClick={() => Taro.previewImage({ current: img, urls: galleryImages })}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}

              {/* 活动区（仅派对类商家展示） */}
              {showActivitySection ? (
              <View className='section'>
                <Text className='section-title'>活动·{activityTotal}</Text>
                {activities.length > 0 ? (
                  <View className='card-list'>
                    {activities.map((item) => (
                      <View key={item.id} className='list-card' onClick={() => handleOpenActivity(item.id)}>
                        {item.poster_list ? (
                          <Image className='list-card-img' src={item.poster_list} mode='aspectFill' />
                        ) : (
                          <View className='list-card-img list-card-img-placeholder' />
                        )}
                        <View className='list-card-info'>
                          <View className='list-card-title-row'>
                            <Text className='list-card-title'>{item.name || '活动'}</Text>
                            {!!item.is_hidden && <Text className='list-card-badge'>已下架</Text>}
                          </View>
                          <Text className='list-card-sub'>{formatDateTimeText(item.start_time) || '时间待定'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className='empty-block'>
                    <Text className='empty-text'>暂无上架活动</Text>
                  </View>
                )}
                {activities.length < activityTotal ? (
                  <View className='load-more' onClick={handleLoadMoreActivities}>
                    {activityLoading ? '加载中...' : '加载更多'}
                  </View>
                ) : null}
              </View>
              ) : null}

              {/* 场地区（仅场地类商家展示） */}
              {showVenueSection ? (
              <View className='section'>
                <Text className='section-title'>场地·{venueTotal}</Text>
                {venues.length > 0 ? (
                  <View className='card-list'>
                    {venues.map((item) => (
                      <View key={item.id} className='list-card' onClick={() => handleOpenVenue(item)}>
                        {item.cover_image ? (
                          <Image className='list-card-img' src={item.cover_image} mode='aspectFill' />
                        ) : (
                          <View className='list-card-img list-card-img-placeholder' />
                        )}
                        <View className='list-card-info'>
                          <View className='list-card-title-row'>
                            <Text className='list-card-title'>{item.activity_name || item.name || '场地'}</Text>
                            {!!item.is_hidden && <Text className='list-card-badge'>已下架</Text>}
                          </View>
                          <Text className='list-card-sub'>{item.address || ''}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className='empty-block'>
                    <Text className='empty-text'>暂无场地</Text>
                  </View>
                )}
                {venues.length < venueTotal ? (
                  <View className='load-more' onClick={handleLoadMoreVenues}>
                    {venueLoading ? '加载中...' : '加载更多'}
                  </View>
                ) : null}
              </View>
              ) : null}

              <View className='bottom-space' />
            </View>
          </View>
        </>
      )}
    </View>
  )
}
