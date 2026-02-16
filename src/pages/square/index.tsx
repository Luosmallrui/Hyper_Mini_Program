import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef, memo } from 'react'
import { AtIcon, AtActivityIndicator } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import CommonHeader from '@/components/CommonHeader'
import { useNavBarMetrics } from '@/hooks/useNavBarMetrics'
import { setTabBarIndex } from '../../store/tabbar'
import { request } from '../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface ChannelApiItem {
  id: number
  name: string
  en_name: string
  icon_url: string
  description: string
  sort_weight: number
  is_visible?: boolean
  parent_id: number
  created_at?: string
  updated_at?: string
}

interface NoteMedia {
  url: string
  thumbnail_url: string
  width: number
  height: number
  duration: number
}

interface NoteLocation {
  lat: number
  lng: number
  name: string
}

interface NoteItem {
  id: string
  user_id: number
  title: string
  content: string
  topic_ids: number[]
  location: NoteLocation
  media_data: NoteMedia[]
  type: number
  status: number
  visible_conf: number
  created_at: string
  updated_at: string
  avatar: string
  nickname: string
  user_name?: string
  user_avatar?: string
  likes: number
  is_liked: boolean
  liked_by_me: boolean
  finalHeight?: number
}

const WaterfallCard = memo(({
  item,
  onClick,
  onToggleLike
}: {
  item: NoteItem
  onClick: () => void
  onToggleLike: (noteId: string, isLikedByMe: boolean) => void
}) => {
  return (
    <View className='waterfall-card' onClick={onClick}>
      {item.media_data && item.media_data.length > 0 ? (
        <Image
          src={item.media_data[0].thumbnail_url || item.media_data[0].url}
          mode='aspectFill'
          className='cover'
          style={{ width: '100%', height: `${item.finalHeight}px` }}
          lazyLoad
        />
      ) : (
        <View className='cover-placeholder' style={{ height: '200px' }} />
      )}

      <View className='info'>
        <Text className='title'>{item.title}</Text>
        <View className='bottom'>
          <View className='user'>
            <View className='avatar-mini'>
              {item.user_avatar && <Image src={item.user_avatar} className='avatar-img' mode='aspectFill' lazyLoad />}
            </View>
            <Text className='name'>{item.user_name}</Text>
          </View>
          <View
            className='likes'
            onClick={(e: any) => {
              e.stopPropagation?.()
              onToggleLike(item.id, item.liked_by_me)
            }}
          >
            <AtIcon
              value={item.is_liked ? 'heart-2' : 'heart'}
              size='12'
              color={item.is_liked ? '#FF2E4D' : '#999'}
              className={item.is_liked ? 'liked-anim' : ''}
            />
            <Text className='num' style={{ color: item.is_liked ? '#FF2E4D' : '#999' }}>{item.likes ?? 0}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}, (prev, next) => (
  prev.item.id === next.item.id &&
  prev.item.liked_by_me === next.item.liked_by_me &&
  prev.item.is_liked === next.item.is_liked &&
  (prev.item.likes ?? 0) === (next.item.likes ?? 0) &&
  prev.item.finalHeight === next.item.finalHeight
))

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  if (Number.isNaN(date.getTime())) return ''
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  if (sameDay) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return `${date.getMonth() + 1}-${date.getDate()}`
}

const InstaCard = memo(({
  item,
  onClick,
  onToggleLike
}: {
  item: NoteItem
  onClick: () => void
  onToggleLike: (noteId: string, isLikedByMe: boolean) => void
}) => (
  <View className='insta-card' onClick={onClick}>
    <View className='card-header'>
      <View className='user-info'>
        <View className='avatar'>
          {item.user_avatar && <Image src={item.user_avatar} className='avatar-img' mode='aspectFill' lazyLoad />}
        </View>
        <Text className='name'>{item.user_name}</Text>
        <Text className='time'>{formatTime(item.created_at)}</Text>
      </View>
      <AtIcon value='menu' size='20' color='#fff' />
    </View>

    <View className='media-wrap'>
      {item.media_data && item.media_data.length > 0 ? (
        <Image
          src={item.media_data[0].url || item.media_data[0].thumbnail_url}
          mode={item.type === 2 ? 'aspectFit' : 'aspectFill'}
          className='media-img'
          lazyLoad
        />
      ) : (
        <View className='media-placeholder' />
      )}
      {item.media_data?.length > 1 && (
        <View className='count-badge'>1/{item.media_data.length}</View>
      )}
    </View>

    <View className='action-bar'>
      <View className='left-actions'>
        <View
          onClick={(e: any) => {
            e.stopPropagation?.()
            onToggleLike(item.id, item.liked_by_me)
          }}
        >
          <AtIcon value={item.is_liked ? 'heart-2' : 'heart'} size='24' color={item.is_liked ? '#FF2E4D' : '#fff'} />
        </View>
        <AtIcon value='message' size='24' color='#fff' className='ml-3' />
        <AtIcon value='share' size='24' color='#fff' className='ml-3' />
      </View>
    </View>

    <View className='text-content'>
      <Text className='title'>{item.title}</Text>
      <Text className='desc'>{item.content}</Text>
    </View>
  </View>
), (prev, next) => (
  prev.item.id === next.item.id &&
  prev.item.liked_by_me === next.item.liked_by_me &&
  prev.item.is_liked === next.item.is_liked &&
  (prev.item.likes ?? 0) === (next.item.likes ?? 0)
))

const normalizeChannels = (channels: ChannelApiItem[] = []) => {
  return channels.filter(item => item && item.id && item.name && item.is_visible !== false)
}

const normalizeLikeFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return false
}

const DEFAULT_FOLLOW_CHANNEL_ID = -1001
const DEFAULT_RECOMMEND_CHANNEL_ID = -1002

const DEFAULT_CHANNELS: ChannelApiItem[] = [
  {
    id: DEFAULT_FOLLOW_CHANNEL_ID,
    name: '\u5173\u6ce8',
    en_name: 'follow',
    icon_url: '',
    description: '',
    sort_weight: 0,
    is_visible: true,
    parent_id: 0
  },
  {
    id: DEFAULT_RECOMMEND_CHANNEL_ID,
    name: '\u63a8\u8350',
    en_name: 'recommend',
    icon_url: '',
    description: '',
    sort_weight: 0,
    is_visible: true,
    parent_id: 0
  }
]

const isDefaultChannelId = (channelId?: number | null) => (
  channelId === DEFAULT_FOLLOW_CHANNEL_ID || channelId === DEFAULT_RECOMMEND_CHANNEL_ID
)

const pickDefaultActiveChannelId = (channels: ChannelApiItem[]): number | null => {
  if (!channels.length) return null
  const recommend = channels.find(channel => channel.id === DEFAULT_RECOMMEND_CHANNEL_ID)
  if (recommend) return recommend.id
  return channels[0].id
}

export default function SquarePage() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [myChannels, setMyChannels] = useState<ChannelApiItem[]>([])
  const [otherChannels, setOtherChannels] = useState<ChannelApiItem[]>([])
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null)
  const [isChannelEditOpen, setIsChannelEditOpen] = useState(false)
  const [isChannelEditing, setIsChannelEditing] = useState(false)

  const [noteList, setNoteList] = useState<NoteItem[]>([])
  const [leftCol, setLeftCol] = useState<NoteItem[]>([])
  const [rightCol, setRightCol] = useState<NoteItem[]>([])
  const columnHeights = useRef({ left: 0, right: 0 })
  const [tabCache, setTabCache] = useState<Record<string, {
    notes: NoteItem[]
    left: NoteItem[]
    right: NoteItem[]
    cursor: string | number
    hasMore: boolean
  }>>({})
  const [loadingTabKey, setLoadingTabKey] = useState<string | null>(null)

  const [cursor, setCursor] = useState<string | number>(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshStartRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingLikeIdsRef = useRef<Set<string>>(new Set())

  const { statusBarHeight, navBarHeight } = useNavBarMetrics()
  const TAB_HEIGHT = 44

  const itemWidthRef = useRef(0)
  const activeIdxRef = useRef(activeIdx)
  const activeChannelIdRef = useRef<number | null>(activeChannelId)

  const editableMyChannels = myChannels.filter(channel => !isDefaultChannelId(channel.id))
  const editableOtherChannels = otherChannels.filter(channel => !isDefaultChannelId(channel.id))
  const displayChannels: ChannelApiItem[] = [...DEFAULT_CHANNELS, ...editableMyChannels]

  const getTabKeyByChannelId = (channelId: number | null | undefined) => {
    if (!channelId) return 'channel_none'
    return `channel_${channelId}`
  }

  const getTabKey = (index: number) => {
    const channel = displayChannels[index]
    return getTabKeyByChannelId(channel?.id)
  }

  useEffect(() => {
    activeIdxRef.current = activeIdx
  }, [activeIdx])

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId
  }, [activeChannelId])

  useEffect(() => {
    setTabBarIndex(1)
    const screenWidth = Taro.getWindowInfo().screenWidth
    const itemWidth = (screenWidth - 20 - 10) / 2
    itemWidthRef.current = itemWidth

    fetchChannelList()
  }, [])

  useEffect(() => () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  Taro.useDidShow(() => {
    setTabBarIndex(1)
    Taro.eventCenter.trigger('TAB_SWITCH_LOADING', false)
  })

  const fetchNotes = async (
    isRefresh = false,
    targetIndex?: number,
    isUserRefresh = false,
    explicitChannelId?: number | null
  ) => {
    const indexToUse = typeof targetIndex === 'number' ? targetIndex : activeIdxRef.current
    const channelId = explicitChannelId ?? displayChannels[indexToUse]?.id ?? activeChannelIdRef.current
    if (typeof channelId !== 'number') return

    if (isLoading && !isRefresh) return
    if (!isRefresh && !hasMore) return

    const tabKey = getTabKeyByChannelId(channelId)
    setIsLoading(true)

    if (isRefresh && isUserRefresh) {
      refreshStartRef.current = Date.now()
      setIsRefreshing(true)
    }

    let refreshSucceeded = false
    try {
      setLoadingTabKey(tabKey)
      const currentCursor = isRefresh ? 0 : cursor
      const token = Taro.getStorageSync('access_token')

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/list`,
        method: 'GET',
        data: (() => {
          const payload: Record<string, any> = {
            pageSize: 10,
            cursor: currentCursor,
          }
          if (channelId === DEFAULT_FOLLOW_CHANNEL_ID) {
            payload.search_type = 'follow'
          } else if (!isDefaultChannelId(channelId)) {
            payload.channel_id = channelId
          }
          return payload
        })(),
        header: { Authorization: `Bearer ${token}` },
        dataType: 'string',
        responseType: 'text'
      })

      let jsonStr = res.data as unknown as string
      if (typeof jsonStr === 'string') {
        jsonStr = jsonStr.replace(/"id":\s*(\d{16,})/g, '"id": "$1"')
        jsonStr = jsonStr.replace(/"next_cursor":\s*(\d{16,})/g, '"next_cursor": "$1"')
      }

      let resBody: any = {}
      try {
        resBody = JSON.parse(jsonStr)
      } catch (e) {
        console.error('解析笔记列表失败', e)
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        refreshSucceeded = isRefresh && isUserRefresh
        const { notes, next_cursor, has_more } = resBody.data
        const rawNotes: any[] = notes || []

        const currentItemWidth = itemWidthRef.current
        const isActiveTab = channelId === activeChannelIdRef.current

        const processedNotes: NoteItem[] = rawNotes.map(item => {
          let mediaList: NoteMedia[] = []
          if (item.media_data) {
            if (Array.isArray(item.media_data)) {
              mediaList = item.media_data
            } else if (typeof item.media_data === 'object') {
              mediaList = [item.media_data]
            }
          }

          let h = currentItemWidth * 1.33
          if (mediaList.length > 0) {
            const { width, height } = mediaList[0]
            if (width && height && width > 0 && height > 0 && currentItemWidth > 0) {
              const ratio = height / width
              const clampedRatio = Math.min(Math.max(ratio, 0.7), 1.6)
              h = currentItemWidth * clampedRatio
            }
          }

          return {
            ...item,
            id: String(item.id),
            media_data: mediaList,
            user_name: item.nickname || `用户${item.user_id}`,
            user_avatar: item.avatar || '',
            likes: (() => {
              const likesCount = Number(item.like_count ?? 0)
              return Number.isFinite(likesCount) ? Math.max(0, likesCount) : 0
            })(),
            liked_by_me: normalizeLikeFlag(item.is_liked),
            is_liked: normalizeLikeFlag(item.is_liked),
            finalHeight: Math.floor(h)
          }
        })

        if (isRefresh) {
          const nextLeft: NoteItem[] = []
          const nextRight: NoteItem[] = []
          const nextHeightState = { left: 0, right: 0 }

          processedNotes.forEach(item => {
            const cardTotalHeight = (item.finalHeight || 200) + 85
            if (nextHeightState.left <= nextHeightState.right) {
              nextLeft.push(item)
              nextHeightState.left += cardTotalHeight
            } else {
              nextRight.push(item)
              nextHeightState.right += cardTotalHeight
            }
          })

          setTabCache(prev => ({
            ...prev,
            [tabKey]: {
              notes: processedNotes,
              left: nextLeft,
              right: nextRight,
              cursor: next_cursor,
              hasMore: has_more
            }
          }))

          if (isActiveTab) {
            setNoteList(processedNotes)
            setLeftCol(nextLeft)
            setRightCol(nextRight)
            columnHeights.current = nextHeightState
            setCursor(next_cursor)
            setHasMore(has_more)
          }
        } else {
          const baseLeft = [...leftCol]
          const baseRight = [...rightCol]
          const nextHeightState = { ...columnHeights.current }

          processedNotes.forEach(item => {
            const cardTotalHeight = (item.finalHeight || 200) + 85
            if (nextHeightState.left <= nextHeightState.right) {
              baseLeft.push(item)
              nextHeightState.left += cardTotalHeight
            } else {
              baseRight.push(item)
              nextHeightState.right += cardTotalHeight
            }
          })

          setTabCache(prev => ({
            ...prev,
            [tabKey]: {
              notes: [...(prev[tabKey]?.notes || []), ...processedNotes],
              left: baseLeft,
              right: baseRight,
              cursor: next_cursor,
              hasMore: has_more
            }
          }))

          if (isActiveTab) {
            setNoteList(prev => [...prev, ...processedNotes])
            setLeftCol(baseLeft)
            setRightCol(baseRight)
            columnHeights.current = nextHeightState
            setCursor(next_cursor)
            setHasMore(has_more)
          }
        }
      } else if (res.statusCode === 401) {
        Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      }
    } catch (err) {
      console.error('获取笔记失败', err)
    } finally {
      setIsLoading(false)
      if (isRefresh && isUserRefresh) {
        const elapsed = Date.now() - refreshStartRef.current
        const remain = Math.max(600 - elapsed, 0)
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current)
          refreshTimerRef.current = null
        }
        if (remain > 0) {
          refreshTimerRef.current = setTimeout(() => {
            setIsRefreshing(false)
            if (refreshSucceeded) {
              Taro.showToast({ title: '刷新成功', icon: 'success' })
            }
            refreshTimerRef.current = null
          }, remain)
        } else {
          setIsRefreshing(false)
          if (refreshSucceeded) {
            Taro.showToast({ title: '刷新成功', icon: 'success' })
          }
        }
      }
      setLoadingTabKey(prev => (prev === tabKey ? null : prev))
    }
  }

  const applyTabData = (tabKey: string) => {
    const cached = tabCache[tabKey]
    if (cached) {
      setNoteList(cached.notes)
      setLeftCol(cached.left)
      setRightCol(cached.right)
      setCursor(cached.cursor)
      setHasMore(cached.hasMore)
      const heights = { left: 0, right: 0 }
      cached.left.forEach(item => {
        heights.left += (item.finalHeight || 200) + 85
      })
      cached.right.forEach(item => {
        heights.right += (item.finalHeight || 200) + 85
      })
      columnHeights.current = heights
      return true
    }
    setNoteList([])
    setLeftCol([])
    setRightCol([])
    setCursor(0)
    setHasMore(true)
    columnHeights.current = { left: 0, right: 0 }
    return false
  }

  const switchToChannel = (index: number) => {
    const channel = displayChannels[index]
    if (!channel) return

    setActiveIdx(index)
    activeIdxRef.current = index
    setActiveChannelId(channel.id)
    activeChannelIdRef.current = channel.id
    setIsChannelEditOpen(false)
    setIsChannelEditing(false)

    const tabKey = getTabKeyByChannelId(channel.id)
    if (!applyTabData(tabKey)) {
      fetchNotes(true, index, false, channel.id)
    }
  }

  const handleTabClick = (index: number) => {
    if (index === activeIdx) {
      setIsChannelEditOpen(false)
      setIsChannelEditing(false)
      return
    }
    switchToChannel(index)
  }

  const handleSwiperChange = (e: any) => {
    if (e.detail.source !== 'touch') return
    const nextIndex = e.detail.current
    if (nextIndex === activeIdxRef.current) return
    switchToChannel(nextIndex)
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/square-sub/post-detail/index?id=${id}` })
  }

  const fetchChannelList = async () => {
    try {
      const res = await request({ url: '/api/v1/channel', method: 'GET' })
      const resData: any = res.data
      if (!(resData && resData.code === 200 && resData.data)) {
        return
      }

      const nextMy = normalizeChannels(resData.data.my_channels || [])
        .filter(item => !isDefaultChannelId(item.id))
      const nextOther = normalizeChannels(resData.data.other_channels || [])
        .filter(item => !isDefaultChannelId(item.id))
      const nextDisplay = [...DEFAULT_CHANNELS, ...nextMy]

      setMyChannels(nextMy)
      setOtherChannels(nextOther)

      const currentActiveId = activeChannelIdRef.current
      const keepCurrent = typeof currentActiveId === 'number' && nextDisplay.some(item => item.id === currentActiveId)
      const nextActiveId = keepCurrent ? currentActiveId : pickDefaultActiveChannelId(nextDisplay)
      const nextIndex = typeof nextActiveId === 'number'
        ? Math.max(nextDisplay.findIndex(item => item.id === nextActiveId), 0)
        : 0

      setActiveIdx(nextIndex)
      activeIdxRef.current = nextIndex
      setActiveChannelId(nextActiveId)
      activeChannelIdRef.current = nextActiveId

      if (typeof nextActiveId === 'number') {
        const tabKey = getTabKeyByChannelId(nextActiveId)
        if (!applyTabData(tabKey)) {
          fetchNotes(true, nextIndex, false, nextActiveId)
        }
      }
    } catch (e) {
      console.error('获取频道失败', e)
    }
  }

  const subscribeChannel = async (channel: ChannelApiItem) => {
    if (isDefaultChannelId(channel.id)) {
      return
    }
    try {
      const res = await request({
        url: '/api/v1/channel/subscribe',
        method: 'POST',
        data: { channel_id: channel.id }
      })
      const resData: any = res.data
      if (resData?.code !== 200) {
        Taro.showToast({ title: resData?.msg || '订阅失败', icon: 'none' })
        return
      }

      setOtherChannels(prev => prev.filter(item => item.id !== channel.id))
      setMyChannels(prev => {
        if (prev.some(item => item.id === channel.id)) return prev
        return [...prev, channel]
      })
      Taro.showToast({ title: '已订阅', icon: 'success' })
    } catch (error) {
      console.error('订阅频道失败', error)
      Taro.showToast({ title: '订阅失败', icon: 'none' })
    }
  }

  const unsubscribeChannel = async (channel: ChannelApiItem) => {
    if (isDefaultChannelId(channel.id)) {
      return
    }
    try {
      const res = await request({
        url: '/api/v1/channel/unsubscribe',
        method: 'POST',
        data: { channel_id: channel.id }
      })
      const resData: any = res.data
      if (resData?.code !== 200) {
        Taro.showToast({ title: resData?.msg || '退订失败', icon: 'none' })
        return
      }

      const nextMy = myChannels.filter(item => item.id !== channel.id)
      const nextDisplay = [...DEFAULT_CHANNELS, ...nextMy]
      setMyChannels(nextMy)
      setOtherChannels(prev => {
        if (prev.some(item => item.id === channel.id)) return prev
        return [...prev, channel]
      })

      setTabCache(prev => {
        const keyToRemove = getTabKeyByChannelId(channel.id)
        if (!(keyToRemove in prev)) return prev
        const next = { ...prev }
        delete next[keyToRemove]
        return next
      })

      const currentActiveId = activeChannelIdRef.current
      const keepCurrent = typeof currentActiveId === 'number' && nextDisplay.some(item => item.id === currentActiveId)
      const nextActiveId = keepCurrent ? currentActiveId : (pickDefaultActiveChannelId(nextDisplay) as number)
      const nextIndex = Math.max(nextDisplay.findIndex(item => item.id === nextActiveId), 0)

      setActiveIdx(nextIndex)
      activeIdxRef.current = nextIndex
      setActiveChannelId(nextActiveId)
      activeChannelIdRef.current = nextActiveId

      const tabKey = getTabKeyByChannelId(nextActiveId)
      if (!applyTabData(tabKey)) {
        fetchNotes(true, nextIndex, false, nextActiveId)
      }

      Taro.showToast({ title: '已退订', icon: 'success' })
    } catch (error) {
      console.error('退订频道失败', error)
      Taro.showToast({ title: '退订失败', icon: 'none' })
    }
  }

  const renderLoadMore = (isActiveLoading: boolean, hasMoreFlag: boolean) => {
    if (isActiveLoading) {
      return (
        <View className='load-more'>
          <AtActivityIndicator content='加载中...' color='#999' />
        </View>
      )
    }
    if (!hasMoreFlag) {
      return (
        <View className='load-more'>
          <Text className='no-more'>- 没有更多了 -</Text>
        </View>
      )
    }
    return null
  }

  const renderWaterfallSkeleton = () => (
    <View className='waterfall-flow skeleton-waterfall'>
      <View className='col'>
        {[220, 180, 260].map((h, i) => (
          <View key={`left-skel-${i}`} className='waterfall-card skeleton-card'>
            <View className='skeleton-block skeleton-rect' style={{ height: `${h}px` }} />
            <View className='skeleton-block skeleton-line' style={{ width: '80%', marginTop: '12px' }} />
            <View className='skeleton-block skeleton-line' style={{ width: '60%', marginTop: '8px' }} />
          </View>
        ))}
      </View>
      <View className='col'>
        {[200, 240, 190].map((h, i) => (
          <View key={`right-skel-${i}`} className='waterfall-card skeleton-card'>
            <View className='skeleton-block skeleton-rect' style={{ height: `${h}px` }} />
            <View className='skeleton-block skeleton-line' style={{ width: '80%', marginTop: '12px' }} />
            <View className='skeleton-block skeleton-line' style={{ width: '60%', marginTop: '8px' }} />
          </View>
        ))}
      </View>
    </View>
  )

  const renderSingleFlow = (notes: NoteItem[], isActiveLoading: boolean, hasMoreFlag: boolean) => (
    <View className='single-flow-list'>
      {notes.map(item => (
        <InstaCard
          key={item.id}
          item={item}
          onClick={() => goDetail(item.id)}
          onToggleLike={toggleNoteLike}
        />
      ))}
      {renderLoadMore(isActiveLoading, hasMoreFlag)}
    </View>
  )

  const renderWaterfallFlow = (left: NoteItem[], right: NoteItem[], isActiveLoading: boolean, hasMoreFlag: boolean) => {
    const loadMoreNode = renderLoadMore(isActiveLoading, hasMoreFlag)
    return (
      <View className='waterfall-flow'>
        <View className='col'>
          {left.map(item => (
            <WaterfallCard
              key={item.id}
              item={item}
              onClick={() => goDetail(item.id)}
              onToggleLike={toggleNoteLike}
            />
          ))}
        </View>
        <View className='col'>
          {right.map(item => (
            <WaterfallCard
              key={item.id}
              item={item}
              onClick={() => goDetail(item.id)}
              onToggleLike={toggleNoteLike}
            />
          ))}
        </View>
        {loadMoreNode && <View className='footer-loader-wrap'>{loadMoreNode}</View>}
      </View>
    )
  }

  const updateLikeStateInList = (list: NoteItem[], noteId: string, nextLikedByMe: boolean): NoteItem[] => {
    return list.map(item => {
      if (item.id !== noteId) return item
      const prevLikes = item.likes
      const nextLikes = nextLikedByMe ? prevLikes + 1 : Math.max(0, prevLikes - 1)
      return {
        ...item,
        liked_by_me: nextLikedByMe,
        likes: nextLikes,
        is_liked: nextLikedByMe
      }
    })
  }

  const toggleNoteLike = async (noteId: string, currentLikedByMe: boolean) => {
    if (pendingLikeIdsRef.current.has(noteId)) return
    pendingLikeIdsRef.current.add(noteId)

    const nextLikedByMe = !currentLikedByMe
    const tabKey = getTabKeyByChannelId(activeChannelIdRef.current)
    const prevLeftCol = leftCol
    const prevRightCol = rightCol
    const nextLeftCol = updateLikeStateInList(prevLeftCol, noteId, nextLikedByMe)
    const nextRightCol = updateLikeStateInList(prevRightCol, noteId, nextLikedByMe)
    setLeftCol(nextLeftCol)
    setRightCol(nextRightCol)

    try {
      await request({
        url: `/api/v1/note/${noteId}/like`,
        method: currentLikedByMe ? 'DELETE' : 'POST'
      })
      setTabCache(prev => {
        const current = prev[tabKey]
        if (!current) return prev
        return {
          ...prev,
          [tabKey]: {
            ...current,
            notes: updateLikeStateInList(current.notes, noteId, nextLikedByMe),
            left: updateLikeStateInList(current.left, noteId, nextLikedByMe),
            right: updateLikeStateInList(current.right, noteId, nextLikedByMe)
          }
        }
      })
    } catch (error) {
      console.error('点赞操作失败', error)
      setLeftCol(prevLeftCol)
      setRightCol(prevRightCol)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      pendingLikeIdsRef.current.delete(noteId)
    }
  }

  const getTabData = (index: number) => {
    const tabKey = getTabKey(index)
    const cached = tabCache[tabKey]
    if (cached) return cached
    if (index === activeIdx) {
      return {
        notes: noteList,
        left: leftCol,
        right: rightCol,
        cursor,
        hasMore
      }
    }
    return { notes: [], left: [], right: [], cursor: 0, hasMore: true }
  }

  const closeChannelEdit = () => {
    setIsChannelEditOpen(false)
    setIsChannelEditing(false)
  }

  const handleFinishEdit = async () => {
    setIsChannelEditing(false)
    await fetchChannelList()
  }

  const handleExpandButtonClick = () => {
    if (isChannelEditOpen) {
      closeChannelEdit()
      return
    }
    setIsChannelEditOpen(true)
    setIsChannelEditing(false)
  }

  const renderChannelEdit = () => {
    if (!isChannelEditOpen) return null
    const topPos = statusBarHeight + navBarHeight

    return (
      <View className={`channel-edit-overlay ${isChannelEditing ? 'editing' : ''}`} style={{ top: `${topPos}px` }}>
        <View className='channel-header'>
          <Text className='title'>我的频道</Text>
          <View className='actions'>
            {isChannelEditing ? (
              <View className='btn-finish' onClick={handleFinishEdit}>完成编辑</View>
            ) : (
              <View className='btn-edit' onClick={() => setIsChannelEditing(true)}>频道编辑</View>
            )}
            <View className='btn-close' onClick={closeChannelEdit}>收起</View>
          </View>
        </View>
        <View className='channel-grid'>
          {editableMyChannels.map((ch) => (
            <View
              key={ch.id}
              className={`channel-chip ${activeChannelId === ch.id ? 'active' : ''}`}
              onClick={() => {
                if (isChannelEditing) return
                const displayIndex = displayChannels.findIndex(item => item.id === ch.id)
                if (displayIndex >= 0) handleTabClick(displayIndex)
              }}
            >
              <Text>{ch.name}</Text>
              {isChannelEditing && (
                <View
                  className='del-icon'
                  onClick={(e) => {
                    e.stopPropagation()
                    unsubscribeChannel(ch)
                  }}
                >
                  <Text>x</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text className='sub-title'>推荐频道</Text>
        <View className='channel-grid'>
          {editableOtherChannels.map(ch => (
            <View
              key={ch.id}
              className={`channel-chip add-chip ${isChannelEditing ? '' : 'disabled'}`}
              onClick={() => {
                if (!isChannelEditing) return
                subscribeChannel(ch)
              }}
            >
              <Text>{ch.name}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const headerTotalHeight = statusBarHeight + navBarHeight + TAB_HEIGHT
  const topHeaderStyle = { top: `${statusBarHeight}px`, height: `${navBarHeight}px`, zIndex: 101 as const }
  const handleSearchClick = () => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }

  return (
    <View className='square-page'>
      <View className='fixed-header-wrapper'>
        <CommonHeader
          className='square-common-header'
          positionMode='fixed'
          style={topHeaderStyle}
          onSearchClick={handleSearchClick}
        />

        {!isChannelEditOpen && (
          <View className='channel-tabs-row' style={{ height: `${TAB_HEIGHT}px`, marginTop: `${statusBarHeight + navBarHeight}px` }}>
            {displayChannels.length > 0 ? (
              <ScrollView
                scrollX
                className='channel-scroll-view'
                scrollIntoView={activeIdx > 0 ? `tab-${Math.max(activeIdx - 1, 0)}` : undefined}
                showScrollbar={false}
                enableFlex
              >
                <View className='tab-container'>
                  {displayChannels.map((tab, idx) => (
                    <View
                      key={tab.id}
                      id={`tab-${idx}`}
                      className={`tab-item ${activeIdx === idx ? 'active' : ''}`}
                      onClick={() => handleTabClick(idx)}
                    >
                      <Text className='tab-text'>{tab.name}</Text>
                      {activeIdx === idx && <View className='indicator' />}
                    </View>
                  ))}
                  <View style={{ width: '20px' }} />
                </View>
              </ScrollView>
            ) : (
              <View className='empty-tab-tip'>暂无订阅频道</View>
            )}

            <View className='expand-btn-side' onClick={handleExpandButtonClick}>
              <View className='gradient-mask' />
              <View className='btn-content'>
                <Text className='expand-text'>{isChannelEditOpen ? '收起' : '编辑'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {displayChannels.length > 0 ? (
        <Swiper
          className='content-swiper'
          style={{ height: `calc(100vh - ${headerTotalHeight}px)`, marginTop: `${headerTotalHeight}px` }}
          current={activeIdx}
          onChange={handleSwiperChange}
          duration={300}
        >
          {displayChannels.map((channel, idx) => {
            const tabData = getTabData(idx)
            const isActive = idx === activeIdx
            const tabKey = getTabKey(idx)
            const isActiveLoading = isActive && loadingTabKey === tabKey && isLoading
            const showSkeleton = isActive && !tabCache[tabKey] && isActiveLoading
            const isFollowChannel = channel.id === DEFAULT_FOLLOW_CHANNEL_ID

            return (
              <SwiperItem key={channel.id} className='tab-swiper-item'>
                <ScrollView
                  scrollY
                  enhanced
                  bounces={false}
                  className='tab-scroll-view'
                  refresherEnabled={isActive}
                  refresherTriggered={isActive && isRefreshing}
                  onRefresherRefresh={() => {
                    if (isActive) fetchNotes(true, idx, true, channel.id)
                  }}
                  onScrollToLower={() => {
                    if (isActive) fetchNotes(false, idx, false, channel.id)
                  }}
                  lowerThreshold={200}
                  refresherBackground='#000000'
                  refresherDefaultStyle='white'
                >
                  {showSkeleton
                    ? renderWaterfallSkeleton()
                    : (isFollowChannel
                      ? renderSingleFlow(tabData.notes, isActiveLoading, tabData.hasMore)
                      : renderWaterfallFlow(tabData.left, tabData.right, isActiveLoading, tabData.hasMore))}
                </ScrollView>
              </SwiperItem>
            )
          })}
        </Swiper>
      ) : (
        <View className='empty-channel-content' style={{ marginTop: `${headerTotalHeight}px` }}>
          <Text className='empty-title'>暂无订阅频道</Text>
          <View
            className='empty-action'
            onClick={() => {
              setIsChannelEditOpen(true)
              setIsChannelEditing(false)
            }}
          >
            去添加
          </View>
        </View>
      )}

      {renderChannelEdit()}
    </View>
  )
}

