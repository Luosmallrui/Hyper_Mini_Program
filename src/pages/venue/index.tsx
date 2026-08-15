import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import { requireLogin } from '@/utils/auth'
import { readContentFollowTarget } from '@/utils/content-follow'
import {
  getRelatedNoteCover,
  normalizeRelatedNotes,
  RelatedNote,
  splitRelatedNotesForWaterfall,
} from '../square/related-notes'
import './index.scss'

// 解析 string 响应并保留 16 位以上的大数字 ID 为字符串，避免雪花 ID 丢精度
const parseJSONWithBigInt = (jsonStr: string) => {
  if (typeof jsonStr !== 'string') return jsonStr
  try {
    const fixedStr = jsonStr.replace(/"(id|user_id|note_id|root_id|parent_id|next_cursor|reply_to_user_id|peer_id)":\s*(\d{16,})/g, '"$1": "$2"')
    return JSON.parse(fixedStr)
  } catch (e) {
    return {}
  }
}

  interface MerchantDetail {
    id: number
    user_id?: string | number
    name: string
    avg_price: number
    location_name: string
    images: string[]
    certificate?: string
    user_name: string
    user_avatar: string
    is_follow: boolean
    business_hours: string
    follow_count?: number
    follow_target_type?: string
    follow_target_id?: string | number
  }

const fallbackAvatar = 'https://cdn.hypercn.cn/note/2026/02/03/2018531527209521152.png'
const fallbackGallery = [
  'https://cdn.hypercn.cn/note/2026/02/03/2018529147365625856.jpg',
  'https://cdn.hypercn.cn/note/2026/02/03/2018529148875575296.jpg',
  'https://cdn.hypercn.cn/note/2026/02/03/2018529173219315712.png'
]
const likeIcon = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPng56c4ed6e45b36ac80da5a57945656d859402021c84bb632895042bc45d1d384d'

export default function VenuePage() {
  const router = useRouter()
  const venueId = router.params?.id || ''
  const [venue, setVenue] = useState<MerchantDetail | null>(null)
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [currentHero, setCurrentHero] = useState<string>(fallbackGallery[0])
  const [heroIndex, setHeroIndex] = useState(0)
  const [followPending, setFollowPending] = useState(false)
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([])
  const [relatedNotesLoading, setRelatedNotesLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)

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
    const fetchVenue = async () => {
      if (!venueId) return
      try {
        const res = await request({
          url: `/api/v1/merchant/${venueId}`,
          method: 'GET'
        })
        const detail = res?.data?.data || null
        setVenue(detail)
        // 新体系场地（organizers）走旧 merchant 详情时拿不到 user_id（返回 0），
        // 关注状态也以新场地接口为准，这里补拉一次。
        if (detail && !detail.user_id) {
          try {
            const venueRes = await request({
              url: `/api/v1/venues/${venueId}`,
              method: 'GET'
            })
            const venueData = venueRes?.data?.data
            if (venueData) {
              setVenue((prev) => (prev ? {
                ...prev,
                user_id: venueData.user_id ?? prev.user_id,
                is_follow: Boolean(venueData.is_follow),
                follow_count: venueData.follow_count ?? prev.follow_count,
                follow_target_type: venueData.follow_target_type ?? prev.follow_target_type,
                follow_target_id: venueData.follow_target_id ?? prev.follow_target_id,
              } : prev))
            }
          } catch (followStateError) {
            console.error('Venue follow-state load failed:', followStateError)
          }
        }
      } catch (error) {
        console.error('Venue detail load failed:', error)
      }
    }
    fetchVenue()
  }, [venueId])

  useEffect(() => {
    const fetchFollowerCount = async () => {
      if (!venueId) return
      try {
        const res = await request({
          url: `/api/v1/merchant/${venueId}/follower/count`,
          method: 'GET',
        })
        setFollowerCount(Number((res as any)?.data?.data?.follower_count) || 0)
      } catch (error) {
        console.error('Follower count load failed:', error)
      }
    }
    fetchFollowerCount()
  }, [venueId])

  useEffect(() => {
    const fetchRelatedNotes = async () => {
      if (!venueId) return
      setRelatedNotesLoading(true)
      try {
        const token = Taro.getStorageSync('access_token')
        const res = await Taro.request({
          url: `https://www.hypercn.cn/api/v1/note/related?store_id=${venueId}&pageSize=20`,
          method: 'GET',
          header: token ? { 'Authorization': `Bearer ${token}` } : {},
          dataType: 'string',
          responseType: 'text',
        })
        const resBody = parseJSONWithBigInt(res.data as string)
        setRelatedNotes(normalizeRelatedNotes(resBody?.data?.notes || []))
      } catch (error) {
        console.error('Venue related notes load failed:', error)
        setRelatedNotes([])
      } finally {
        setRelatedNotesLoading(false)
      }
    }

    fetchRelatedNotes()
  }, [venueId])

  const galleryImages = useMemo(() => {
    if (venue?.images && venue.images.length > 0) {
      return venue.images
    }
    return fallbackGallery
  }, [venue?.images])

  useEffect(() => {
    if (galleryImages.length > 0) {
      setCurrentHero(galleryImages[0])
      setHeroIndex(0)
    }
  }, [galleryImages])

  const venueName = venue?.name || 'SWING鸡尾酒吧（大源店）'
  const venueTime = venue?.business_hours ? `营业中：${venue.business_hours}` : '营业中：19:30-次日02:30'
  const venuePrice = typeof venue?.avg_price === 'number' ? `¥${(venue.avg_price / 100).toFixed(0)}/人起` : '¥80/人起'
  const venueLocation = venue?.location_name || '高新区盛园街道保利星荟5栋1楼'
  const venueUser = venue?.user_name || 'SWING'
  const venueAvatar = venue?.user_avatar || fallbackAvatar
  const noteList = relatedNotes
  const { left: leftNotes, right: rightNotes } = useMemo(
    () => splitRelatedNotesForWaterfall(noteList),
    [noteList],
  )

  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}w`
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
    return String(num)
  }

  const venueFans = formatNumber(followerCount)

  const calculateImageHeight = (width?: number, height?: number): number => {
    const containerWidth = (Taro.getSystemInfoSync().windowWidth - 80) / 2
    const aspectRatio = width && height ? height / width : 1.2
    const calculatedHeight = containerWidth * aspectRatio
    return Math.min(Math.max(calculatedHeight, 200), 400)
  }

  const handleNoteClick = (noteId: string | number) => {
    Taro.navigateTo({ url: `/pages/square-sub/post-detail/index?id=${String(noteId)}` })
  }

  const handleHeroSwiperChange = (e: { detail: { current: number } }) => {
    const nextIndex = e.detail.current
    setHeroIndex(nextIndex)
    const nextHero = galleryImages[nextIndex]
    if (nextHero) setCurrentHero(nextHero)
  }

  const handleHeroThumbClick = (img: string, idx: number) => {
    setCurrentHero(img)
    setHeroIndex(idx)
  }

  const handleOpenOrganizerHome = () => {
    // 新体系下 venue id 即 organizer id，跳 C 端商家公开主页
    if (!venueId) return
    Taro.navigateTo({ url: `/pages/user-sub/organizer-home/index?id=${venueId}` })
  }

  const handleToggleFollow = async () => {
    if (!requireLogin()) return
    if (!venue || followPending) return

    const nextFollow = !Boolean(venue.is_follow)
    const action = nextFollow ? 'follow' : 'unfollow'

    setFollowPending(true)
    setVenue((prev) => (prev ? { ...prev, is_follow: nextFollow } : prev))

    try {
      // 旧 merchant 体系按主办方用户 ID 关注；新体系场地详情没有 user_id，
      // 改按场地 ID 关注（后端同样落 user_follow，见 venue_subscription_api 文档第 5 节）。
      // 已返回 follow_target_* 时按对象关注（docs/content_follow_api_20260810.md）。
      const followTarget = readContentFollowTarget(venue)
      const res = venue.user_id
        ? await request({
            url: `/api/v1/follow/${action}`,
            method: 'POST',
            data: {
              user_id: String(venue.user_id),
              ...(followTarget ? { target_type: followTarget.type, target_id: followTarget.id } : {}),
            },
          })
        : await request({
            url: `/api/v1/venues/${venueId}/follow`,
            method: nextFollow ? 'POST' : 'DELETE',
          })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) {
        throw new Error((res as any)?.data?.msg || '操作失败')
      }
      Taro.showToast({ title: nextFollow ? '已关注' : '已取消关注', icon: 'success' })
    } catch (error) {
      setVenue((prev) => (prev ? { ...prev, is_follow: !nextFollow } : prev))
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setFollowPending(false)
    }
  }

  const renderNoteCard = (note: RelatedNote) => {
    const cover = getRelatedNoteCover(note)
    const firstMedia = note.media[0]
    const imageHeight = calculateImageHeight(firstMedia?.width, firstMedia?.height)
    const authorAvatar = note.authorAvatar || venueAvatar
    const authorName = note.authorName || venueUser

    return (
      <View key={note.id} className='note-card' onClick={() => handleNoteClick(note.id)}>
        {cover ? (
          <Image className='note-cover' src={cover} mode='aspectFill' style={{ height: `${imageHeight}px` }} />
        ) : (
          <View className='note-cover note-cover-placeholder' style={{ height: `${imageHeight}px` }} />
        )}
        <View className='note-info'>
          <Text className='note-title'>{note.title}</Text>
          <View className='note-footer'>
            <View className='author-info'>
              <Image className='author-avatar' src={authorAvatar} mode='aspectFill' />
              <Text className='author-name'>{authorName}</Text>
            </View>
            <View className='like-info'>
              <Image className='like-icon' src={likeIcon} mode='aspectFit' />
              <Text className='like-count'>{formatNumber(note.likeCount)}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='venue-page'>
      {/* 顶部导航（固定、透明） */}
      <View
        className='custom-nav'
        style={{ height: `${statusBarHeight + navBarHeight}px` }}
      >
        <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
        <View className='nav-content' style={{ height: `${navBarHeight}px` }}>
          <View className='nav-left' style={{ width: `${menuButtonWidth}px` }} onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
          <View className='nav-center'>
            {/* Logo */}
             <Image className='nav-logo' src={require('../../assets/images/hyper-icon.png')} mode='aspectFit' />
          </View>
          <View className='nav-right' style={{ width: `${menuButtonWidth}px` }} />
        </View>
      </View>

      {/* Hero 区域（背景图 + 信息） */}
      <View className='hero-section'>
        {/* 背景图支持左右滑动 */}
        <Swiper
          className='hero-bg-swiper'
          current={heroIndex}
          circular
          skipHiddenItemLayout
          onChange={handleHeroSwiperChange}
        >
          {galleryImages.map((img, idx) => (
            <SwiperItem key={`${img}-${idx}`}>
              <Image src={img} className='hero-bg-img' mode='aspectFill' />
            </SwiperItem>
          ))}
        </Swiper>
        <View className='hero-mask' /> {/* 渐变遮罩 */}

        <View className='hero-info-block'>
          {/* 商家信息 */}
          <View className='hero-content'>
             <Text className='title'>{venueName}</Text>
             <View className='meta-row'>
               <Text className='meta'>{venueTime}</Text>
               <Text className='meta price'>{venuePrice}</Text>
             </View>
             <View className='location-row'>
               <Text className='location'>{venueLocation}</Text>
             </View>
          </View>

          {/* 缩略图画廊 */}
          <View className='gallery-float'>
            {galleryImages.map((img, idx) => (
              <View
                key={`${img}-${idx}`}
                className={`gallery-item ${currentHero === img ? 'active' : ''}`}
                onClick={() => handleHeroThumbClick(img, idx)}
              >
                <Image className='gallery-img' src={img} mode='aspectFill' />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 下方内容区域 */}
      <View className='content-scroll'>
        <View className='content-inner'>
          <View className='host-card' onClick={handleOpenOrganizerHome}>
            <View className='host-left'>
              <Image className='host-avatar' src={venueAvatar} mode='aspectFill' />
              <View className='host-info'>
                <View className='host-name-row'>
                  <Text className='host-name'>{venueUser}</Text>
                  {venue?.certificate && <Text className='host-certificate'>{venue.certificate}</Text>}
                </View>
                <Text className='host-fans'>{venueFans} 粉丝</Text>
              </View>
            </View>
            <View
              className='follow-btn'
              onClick={(e) => {
                // 阻止冒泡到 host-card 的跳转
                e.stopPropagation()
                handleToggleFollow()
              }}
            >
              {followPending ? '处理中' : (venue?.is_follow ? '已关注' : '关注')}
            </View>
          </View>

          <View className='tab-row'>
            <Text className='tab active'>动态·{noteList.length}</Text>
          </View>

          <View className='tab-panel active'>
              <View className='notes-section'>
                {noteList.length > 0 ? (
                  <View className='waterfall-container'>
                    <View className='waterfall-column'>
                      {leftNotes.map(renderNoteCard)}
                    </View>
                    <View className='waterfall-column'>
                      {rightNotes.map(renderNoteCard)}
                    </View>
                  </View>
                ) : (
                  <View className='empty-notes'>
                    <Text className='empty-text'>{relatedNotesLoading ? '动态加载中...' : '暂无相关动态'}</Text>
                  </View>
                )}
              </View>
            </View>

          <View className='bottom-space' />
        </View>
      </View>
    </View>
  )
}
