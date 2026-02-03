import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef, memo } from 'react'
import { AtIcon, AtActivityIndicator } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import { setTabBarIndex } from '../../store/tabbar'
import { request } from '../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

const BASE_CHANNELS = ['关注', '推荐']
const RECOMMEND_CHANNELS = ['附近', '美食', '演出', '露营', '酒吧', '机车', '摄影', '旅行']
const FOLLOW_CHANNEL = BASE_CHANNELS[0]
const RECOMMEND_CHANNEL = BASE_CHANNELS[1]

interface ChannelItem {
  id: number
  name: string
  en_name: string
  icon_url: string
  description: string
  sort_weight: number
  parent_id: number
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
  likes?: number
  is_liked?: boolean
  finalHeight?: number
}

// 瀑布流卡片（双列）
const WaterfallCard = memo(({ item, onClick }: { item: NoteItem, onClick: () => void }) => {
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
              <View className='cover-placeholder' style={{height: '200px'}} />
          )}

          <View className='info'>
              <Text className='title'>{item.title}</Text>
              <View className='bottom'>
              <View className='user'>
                  <View className='avatar-mini'>
                      {item.user_avatar && <Image src={item.user_avatar} className='avatar-img' mode='aspectFill' lazyLoad/>}
                  </View>
                  <Text className='name'>{item.user_name}</Text>
              </View>
              <View className='likes'>
                  <AtIcon value={item.is_liked ? 'heart-2' : 'heart'} size='12' color={item.is_liked ? '#FF2E4D' : '#999'} />
                  <Text className='num' style={{color: item.is_liked ? '#FF2E4D' : '#999'}}>{item.likes}</Text>
              </View>
              </View>
          </View>
      </View>
  )
}, (prev, next) => prev.item.id === next.item.id)

const formatTime = (timeStr: string) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    if (date.getDate() === now.getDate()) {
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    return `${date.getMonth() + 1}-${date.getDate()}`
 }

// 关注频道单列卡片
const InstaCard = memo(({ item, onClick }: { item: NoteItem, onClick: () => void }) => (
    <View className='insta-card' onClick={onClick}>
        <View className='card-header'>
            <View className='user-info'>
            <View className='avatar'>
                {item.user_avatar && <Image src={item.user_avatar} className='avatar-img' mode='aspectFill' lazyLoad/>}
            </View>
            <Text className='name'>{item.user_name}</Text>
            <Text className='time'>{formatTime(item.created_at)}</Text>
            </View>
            <AtIcon value='menu' size='20' color='#fff' />
        </View>

        <View className='media-wrap'>
            {item.media_data && item.media_data.length > 0 ? (
                <Image
                  src={item.media_data[0].url}
                  mode={item.type === 2 ? 'aspectFit' : 'aspectFill'}
                  className='media-img'
                  lazyLoad
                />
            ) : (
                <View className='media-placeholder' />
            )}
            {item.media_data.length > 1 && (
                <View className='count-badge'>1/{item.media_data.length}</View>
            )}
        </View>
        <View className='action-bar'>
            <View className='left-actions'>
                <AtIcon value={item.is_liked ? 'heart-2' : 'heart'} size='24' color={item.is_liked ? '#FF2E4D' : '#fff'} />
                <AtIcon value='message' size='24' color='#fff' className='ml-3' />
                <AtIcon value='share' size='24' color='#fff' className='ml-3' />
            </View>
        </View>
        <View className='text-content'>
            <Text className='title'>{item.title}</Text>
            <Text className='desc'>{item.content}</Text>
        </View>
    </View>
), (prev, next) => prev.item.id === next.item.id)


export default function SquarePage() {
  const [activeIdx, setActiveIdx] = useState(1)
  const [myChannels, setMyChannels] = useState<string[]>(BASE_CHANNELS)
  const [channelList, setChannelList] = useState<ChannelItem[]>([])
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null)
  const [isChannelEditOpen, setIsChannelEditOpen] = useState(false)

  // 列表数据与缓存
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

  // 分页状态
  const [cursor, setCursor] = useState<string | number>(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshStartRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 顶部导航尺寸
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const TAB_HEIGHT = 44

  const itemWidthRef = useRef(0)
  const activeIdxRef = useRef(activeIdx)
  // 根据频道名称生成缓存 key
  const getTabKey = (index: number) => {
    const name = myChannels[index]
    if (name === FOLLOW_CHANNEL) return 'follow'
    if (name === RECOMMEND_CHANNEL) return 'recommend'
    const channel = channelList.find(item => item.name === name)
    return channel ? `channel_${channel.id}` : `channel_${name || index}`
  }

  useEffect(() => {
    setTabBarIndex(1)

    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)

    const screenWidth = sysInfo.screenWidth
    const _itemWidth = (screenWidth - 20 - 10) / 2
    itemWidthRef.current = _itemWidth

    if (_itemWidth > 0) {
        fetchNotes(true)
    }

    fetchChannelList()
  }, [])

  useEffect(() => {
    activeIdxRef.current = activeIdx
  }, [activeIdx])

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

  // 拉取帖子列表（支持刷新/切换）
  const fetchNotes = async (isRefresh = false, targetIndex?: number, isUserRefresh = false) => {
    if (isLoading && !isRefresh) return
    if (!isRefresh && !hasMore) return

    setIsLoading(true)
    if (isRefresh && isUserRefresh) {
      refreshStartRef.current = Date.now()
      setIsRefreshing(true)
    }

    const indexToUse = typeof targetIndex === 'number' ? targetIndex : activeIdx
    const tabKey = getTabKey(indexToUse)

    let refreshSucceeded = false
    try {
      setLoadingTabKey(tabKey)
      const currentCursor = isRefresh ? 0 : cursor
      const token = Taro.getStorageSync('access_token')

      const activeName = myChannels[indexToUse]
      const data: any = { pageSize: 10, cursor: currentCursor }
      if (activeName === FOLLOW_CHANNEL) {
        data.search_type = 'follow'
      } else if (activeName !== RECOMMEND_CHANNEL) {
        const channel = channelList.find(item => item.name === activeName)
        if (channel) data.channel_id = channel.id
      }

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/list`,
        method: 'GET',
        data,
        header: { 'Authorization': `Bearer ${token}` },
        dataType: 'string',
        responseType: 'text'
      })

      let jsonStr = res.data as unknown as string
      if (typeof jsonStr === 'string') {
         jsonStr = jsonStr.replace(/"id":\s*(\d{16,})/g, '"id": "$1"')
         jsonStr = jsonStr.replace(/"next_cursor":\s*(\d{16,})/g, '"next_cursor": "$1"')
      }

      let resBody: any = {}
      try { resBody = JSON.parse(jsonStr) } catch(e) { console.error('JSON解析失败', e) }

      if (resBody && resBody.code === 200 && resBody.data) {
        refreshSucceeded = isRefresh && isUserRefresh
        const { notes, next_cursor, has_more } = resBody.data
        const rawNotes: any[] = notes || []

        const currentItemWidth = itemWidthRef.current
        const isActiveTab = indexToUse === activeIdxRef.current

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
                likes: item.like_count !== undefined ? item.like_count : 0,
                is_liked: item.is_liked || false,
                finalHeight: Math.floor(h)
            }
        })

        if (isRefresh) {
          if (isActiveTab) {
            setNoteList(processedNotes)
            columnHeights.current = { left: 0, right: 0 }
          }

          const left: NoteItem[] = []
          const right: NoteItem[] = []

          processedNotes.forEach(item => {
             const cardTotalHeight = (item.finalHeight || 200) + 85
             if (columnHeights.current.left <= columnHeights.current.right) {
                 left.push(item)
                 columnHeights.current.left += cardTotalHeight
             } else {
                 right.push(item)
                 columnHeights.current.right += cardTotalHeight
             }
          })
          if (isActiveTab) {
            setLeftCol(left)
            setRightCol(right)
          }
          setTabCache(prev => ({
            ...prev,
            [tabKey]: {
              notes: processedNotes,
              left,
              right,
              cursor: next_cursor,
              hasMore: has_more
            }
          }))
        } else {
          if (isActiveTab) {
            setNoteList(prev => [...prev, ...processedNotes])
          }

          const newLeft = [...leftCol]
          const newRight = [...rightCol]

          processedNotes.forEach(item => {
             const cardTotalHeight = (item.finalHeight || 200) + 85
             if (columnHeights.current.left <= columnHeights.current.right) {
                 newLeft.push(item)
                 columnHeights.current.left += cardTotalHeight
             } else {
                 newRight.push(item)
                 columnHeights.current.right += cardTotalHeight
             }
          })
          if (isActiveTab) {
            setLeftCol(newLeft)
            setRightCol(newRight)
          }
          setTabCache(prev => ({
            ...prev,
            [tabKey]: {
              notes: [...(prev[tabKey]?.notes || []), ...processedNotes],
              left: newLeft,
              right: newRight,
              cursor: next_cursor,
              hasMore: has_more
            }
          }))
        }

        if (isActiveTab) {
          setCursor(next_cursor)
          setHasMore(has_more)
        }
      } else if (res.statusCode === 401) {
          Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      }
    } catch (err) {
      console.error('获取帖子失败', err)
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

  const handleTabClick = (index: number) => {
    setActiveIdx(index)
    activeIdxRef.current = index
    setIsChannelEditOpen(false)
    const channelName = myChannels[index]
    const channel = channelList.find(item => item.name === channelName)
    setActiveChannelId(channel ? channel.id : null)
    if (index !== activeIdx) {
      const nextKey = getTabKey(index)
      const cached = tabCache[nextKey]
      if (cached) {
        setNoteList(cached.notes)
        setLeftCol(cached.left)
        setRightCol(cached.right)
        setCursor(cached.cursor)
        setHasMore(cached.hasMore)
        return
      } else {
        setNoteList([])
        setLeftCol([])
        setRightCol([])
        setCursor(0)
        setHasMore(true)
      }
      fetchNotes(true, index)
      return
    }
  }
  const handleSwiperChange = (e: any) => {
    if (e.detail.source === 'touch') {
      const nextIndex = e.detail.current
      setActiveIdx(nextIndex)
      activeIdxRef.current = nextIndex
      setIsChannelEditOpen(false)
      const channelName = myChannels[nextIndex]
      const channel = channelList.find(item => item.name === channelName)
      setActiveChannelId(channel ? channel.id : null)
      const tabKey = getTabKey(nextIndex)
      const cached = tabCache[tabKey]
      if (cached) {
        setNoteList(cached.notes)
        setLeftCol(cached.left)
        setRightCol(cached.right)
        setCursor(cached.cursor)
        setHasMore(cached.hasMore)
        return
      } else {
        setNoteList([])
        setLeftCol([])
        setRightCol([])
        setCursor(0)
        setHasMore(true)
      }
      fetchNotes(true, nextIndex)
    }
  }
  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/square-sub/post-detail/index?id=${id}` })
  }

  const fetchChannelList = async () => {
    try {
      const res = await request({ url: '/api/v1/channel/list', method: 'GET' })
      const resData: any = res.data
      if (resData && resData.code === 200 && resData.data?.channels) {
        const list: ChannelItem[] = resData.data.channels || []
        setChannelList(list)
        const baseSet = new Set(BASE_CHANNELS)
        const uniqueNames: string[] = []
        const seen = new Set<string>()
        list.forEach(item => {
          const name = item?.name?.trim()
          if (!name || baseSet.has(name) || seen.has(name)) return
          seen.add(name)
          uniqueNames.push(name)
        })
        const merged = [...BASE_CHANNELS, ...uniqueNames]
        setMyChannels(merged)
        setActiveIdx(prev => (prev >= merged.length ? 0 : prev))
        if (activeChannelId === null) {
          const currentName = merged[activeIdx]
          const currentChannel = list.find(item => item.name === currentName)
          setActiveChannelId(currentChannel ? currentChannel.id : null)
        }
      }
    } catch (e) {
      console.error('获取频道失败', e)
    }
  }


  // 加载更多/空态提示
  const renderLoadMore = (isActiveLoading: boolean, hasMoreFlag: boolean) => (
      <View className='load-more'>
          {isActiveLoading ? (
              <AtActivityIndicator content='加载中...' color='#999' />
          ) : (
              !hasMoreFlag && <Text className='no-more'>- 没有更多了 -</Text>
          )}
      </View>
  )

  // 首屏骨架
  const renderSingleSkeleton = () => (
    <View className='single-flow-list skeleton-list'>
      {[0, 1, 2].map((i) => (
        <View key={`single-skel-${i}`} className='insta-card skeleton-card'>
          <View className='skeleton-row'>
            <View className='skeleton-block skeleton-circle' />
            <View className='skeleton-block skeleton-line' style={{ width: '40%' }} />
          </View>
          <View className='skeleton-block skeleton-rect' style={{ height: '220px', marginTop: '12px' }} />
          <View className='skeleton-block skeleton-line' style={{ width: '70%', marginTop: '12px' }} />
          <View className='skeleton-block skeleton-line' style={{ width: '50%', marginTop: '8px' }} />
        </View>
      ))}
    </View>
  )

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
           <InstaCard key={item.id} item={item} onClick={() => goDetail(item.id)} />
        ))}
        {renderLoadMore(isActiveLoading, hasMoreFlag)}
      </View>
  )

  const renderWaterfallFlow = (left: NoteItem[], right: NoteItem[], isActiveLoading: boolean, hasMoreFlag: boolean) => (
      <View className='waterfall-flow'>
        <View className='col'>
           {left.map(item => <WaterfallCard key={item.id} item={item} onClick={() => goDetail(item.id)} />)}
        </View>
        <View className='col'>
           {right.map(item => <WaterfallCard key={item.id} item={item} onClick={() => goDetail(item.id)} />)}
        </View>
        <View className='footer-loader-wrap'>
           {renderLoadMore(isActiveLoading, hasMoreFlag)}
        </View>
      </View>
  )

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

  // 频道管理弹层
  const renderChannelEdit = () => {
    if (!isChannelEditOpen) return null
    const topPos = statusBarHeight + navBarHeight + TAB_HEIGHT
    return (
      <View className='channel-edit-overlay' style={{ top: `${topPos}px` }}>
        <View className='channel-header'>
          <Text className='title'>频道管理</Text>
          <View className='actions'>
            <View className='btn-finish' onClick={() => setIsChannelEditOpen(false)}>完成</View>
            <View className='btn-close' onClick={() => setIsChannelEditOpen(false)}>关闭</View>
          </View>
        </View>
        <View className='channel-grid'>
          {myChannels.map((ch, idx) => (
            <View key={ch} className={`channel-chip ${activeIdx === idx ? 'active' : ''}`} onClick={() => { handleTabClick(idx) }}>
              <Text>{ch}</Text>
            </View>
          ))}
        </View>
        <Text className='sub-title'>推荐频道</Text>
        <View className='channel-grid'>
          {RECOMMEND_CHANNELS.map(ch => (
            <View key={ch} className='channel-chip'>
              <Text>+ {ch}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const headerTotalHeight = statusBarHeight + navBarHeight + TAB_HEIGHT

  return (
    <View className='square-page'>
      <View className='fixed-header-wrapper'>
              <View className='top-nav' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
                 <View className='status-bar-placeholder' style={{ height: `${statusBarHeight}px` }} />
                 <View className='nav-content' style={{ height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
                    <View className='left-area'>
                        <View className='location'>
                           <Text>成都</Text>
                           <AtIcon value='chevron-right' size='14' color='#fff' />
                        </View>
                        <View className='search-icon'>
                           <AtIcon value='search' size='20' color='#fff' />
                        </View>
                    </View>
                    <View className='logo-container'>
                       <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='logo' />
                    </View>
                 </View>
              </View>

              <View className='channel-tabs-row' style={{ height: `${TAB_HEIGHT}px` }}>
                <ScrollView
                  scrollX
                  className='channel-scroll-view'
                  scrollIntoView={`tab-${activeIdx <= 1 ? 0 : activeIdx - 1}`}
                  showScrollbar={false}
                  enableFlex
                >
                   <View className='tab-container'>
                      {myChannels.map((tab, idx) => (
                          <View
                            key={tab}
                            id={`tab-${idx}`}
                            className={`tab-item ${activeIdx === idx ? 'active' : ''}`}
                            onClick={() => handleTabClick(idx)}
                          >
                             <Text className='tab-text'>{tab}</Text>
                             {activeIdx === idx && <View className='indicator' />}
                          </View>
                      ))}
                      <View style={{ width: '20px' }}></View>
                   </View>
                </ScrollView>

                <View className='expand-btn-side' onClick={() => setIsChannelEditOpen(!isChannelEditOpen)}>
                   <View className='gradient-mask' />
                   <View className='btn-content'>
                       <Text className='expand-text'>编辑</Text>
                   </View>
                </View>
              </View>
            </View>



      <Swiper
        className='content-swiper'
        style={{ height: `calc(100vh - ${headerTotalHeight}px)`, marginTop: `${headerTotalHeight}px` }}
        current={activeIdx}
        onChange={handleSwiperChange}
        duration={300}
      >
        {myChannels.map((channel, idx) => {
          const tabData = getTabData(idx)
          const isActive = idx === activeIdx
          const tabKey = getTabKey(idx)
          const isActiveLoading = isActive && loadingTabKey === tabKey && isLoading
          const showSkeleton = isActive && !tabCache[tabKey] && isActiveLoading
          return (
            <SwiperItem key={channel}>
              <ScrollView
                scrollY
                enhanced
                bounces={false}
                className='tab-scroll-view'
                refresherEnabled={isActive}
                refresherTriggered={isActive && isRefreshing}
                onRefresherRefresh={() => { if (isActive) fetchNotes(true, idx, true) }}
                onScrollToLower={() => { if (isActive) fetchNotes(false, idx) }}
                lowerThreshold={200}
                refresherBackground="#000000"
                refresherDefaultStyle="white"
              >
                {showSkeleton
                  ? (channel === FOLLOW_CHANNEL ? renderSingleSkeleton() : renderWaterfallSkeleton())
                  : (channel === FOLLOW_CHANNEL
                    ? renderSingleFlow(tabData.notes, isActiveLoading, tabData.hasMore)
                    : renderWaterfallFlow(tabData.left, tabData.right, isActiveLoading, tabData.hasMore))}
              </ScrollView>
            </SwiperItem>
          )
        })}
      </Swiper>

      {renderChannelEdit()}
    </View>
  )
}
