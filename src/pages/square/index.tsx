import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useState, useEffect, useRef, memo } from 'react'
import { AtIcon, AtActivityIndicator } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

const DEFAULT_CHANNELS = ['关注', '推荐', '同城', '滑板', '骑行', '派对', '纹身', '改装车', '露营', '篮球', '足球', '飞盘']
const RECOMMEND_CHANNELS = ['潮鞋', '电子竞技', '健身', '艺术', '场地', '乐队', '音乐节', '化妆']

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

// --- 提取子组件并使用 memo 优化性能 (防闪烁关键) ---

const WaterfallCard = memo(({ item, onClick }: { item: NoteItem, onClick: () => void }) => {
  return (
      <View className='waterfall-card' onClick={onClick}>
          {item.media_data && item.media_data.length > 0 ? (
              <Image 
                src={item.media_data[0].thumbnail_url || item.media_data[0].url} 
                mode='aspectFill' 
                className='cover'
                  // 这里的 finalHeight 已经在 fetchNotes 中计算好了
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
}, (prev, next) => prev.item.id === next.item.id) // 自定义对比逻辑，ID 不变则不重绘

const formatTime = (timeStr: string) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    if (date.getDate() === now.getDate()) {
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    return `${date.getMonth() + 1}-${date.getDate()}`
 }

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
  const [myChannels, setMyChannels] = useState(DEFAULT_CHANNELS)
  const [isChannelEditOpen, setIsChannelEditOpen] = useState(false)

  // --- 数据状态 ---
  const [noteList, setNoteList] = useState<NoteItem[]>([]) 
  const [leftCol, setLeftCol] = useState<NoteItem[]>([])   
  const [rightCol, setRightCol] = useState<NoteItem[]>([])  
  const columnHeights = useRef({ left: 0, right: 0 })
  
  // --- 分页状态 ---
  const [cursor, setCursor] = useState<string | number>(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 布局适配状态
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0) 
  const TAB_HEIGHT = 44 
  
  const itemWidthRef = useRef(0)

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
  }, [])

  Taro.useDidShow(() => { setTabBarIndex(1) })

  // --- 核心：获取帖子列表 ---
  const fetchNotes = async (isRefresh = false) => {
    if (isLoading) return
    if (!isRefresh && !hasMore) return

    setIsLoading(true)
    if (isRefresh) setIsRefreshing(true)

    try {
      const currentCursor = isRefresh ? 0 : cursor
      const token = Taro.getStorageSync('access_token')
      
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/list`, 
        method: 'GET',
        data: { pageSize: 10, cursor: currentCursor },
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
      try { resBody = JSON.parse(jsonStr) } catch(e) { console.error('JSON Parse Error', e) }

      if (resBody && resBody.code === 200 && resBody.data) {
        const { notes, next_cursor, has_more } = resBody.data
        const rawNotes: any[] = notes || []
        
        const currentItemWidth = itemWidthRef.current

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
          setNoteList(processedNotes)
          columnHeights.current = { left: 0, right: 0 }
          
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
          setLeftCol(left)
          setRightCol(right)
        } else {
          // 追加数据：使用函数式更新，确保拿到最新的列表
          // 因为有了 Memo 组件，这里 state 更新不会导致旧卡片重绘
          setNoteList(prev => [...prev, ...processedNotes])
          
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
          setLeftCol(newLeft)
          setRightCol(newRight)
        }

        setCursor(next_cursor)
        setHasMore(has_more)
      } else if (res.statusCode === 401) {
          Taro.showToast({ title: '登录已过期', icon: 'none' })
      }
    } catch (err) {
      console.error('获取帖子失败', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleTabClick = (index: number) => {
    setActiveIdx(index)
    setIsChannelEditOpen(false)
  }
  const handleSwiperChange = (e: any) => {
    if (e.detail.source === 'touch') setActiveIdx(e.detail.current)
  }
  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/square/post-detail/index?id=${id}` })
  }

  // --- 组件渲染 ---

  const renderSingleFlow = () => (
      <View className='single-flow-list'>
        {noteList.map(item => (
           <InstaCard key={item.id} item={item} onClick={() => goDetail(item.id)} />
        ))}
        {renderLoadMore()}
      </View>
  )

  const renderWaterfallFlow = () => (
      <View className='waterfall-flow'>
        <View className='col'>
           {leftCol.map(item => <WaterfallCard key={item.id} item={item} onClick={() => goDetail(item.id)} />)}
        </View>
        <View className='col'>
           {rightCol.map(item => <WaterfallCard key={item.id} item={item} onClick={() => goDetail(item.id)} />)}
        </View>
        <View className='footer-loader-wrap'>
           {renderLoadMore()}
        </View>
      </View>
  )

  const renderLoadMore = () => (
      <View className='load-more'>
          {isLoading ? (
              <AtActivityIndicator content='加载中...' color='#999' />
          ) : (
              !hasMore && <Text className='no-more'>- 没有更多了 -</Text>
          )}
      </View>
  )

  const renderChannelEdit = () => {
    if (!isChannelEditOpen) return null
    const topPos = statusBarHeight + navBarHeight + TAB_HEIGHT
    return (
      <View className='channel-edit-overlay' style={{ top: `${topPos}px` }}>
         {/* ... 频道编辑内容保持不变 ... */}
         <View className='channel-header'>
            <Text className='title'>我的频道</Text>
            <View className='actions'>
               <View className='btn-finish' onClick={() => setIsChannelEditOpen(false)}>完成</View>
               <View className='btn-close' onClick={() => setIsChannelEditOpen(false)}>收起</View>
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
      {/* 固定头部 */}
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
          
          {/* 
             修复点：【展开】按钮样式调整
             确保它在最右侧，且有背景遮罩防止文字穿透 
          */}
          <View className='expand-btn-side' onClick={() => setIsChannelEditOpen(!isChannelEditOpen)}>
             <View className='gradient-mask' />
             <View className='btn-content'>
                 <Text className='expand-text'>展开</Text>
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
        {myChannels.map((channel) => (
          <SwiperItem key={channel}>
            <ScrollView 
              scrollY 
              className='tab-scroll-view'
              refresherEnabled
              refresherTriggered={isRefreshing}
              onRefresherRefresh={() => fetchNotes(true)}
              onScrollToLower={() => fetchNotes(false)}
              lowerThreshold={200}
              refresherBackground="#000000"
              refresherDefaultStyle="white"
            >
               {channel === '关注' ? renderSingleFlow() : renderWaterfallFlow()}
            </ScrollView>
          </SwiperItem>
        ))}
      </Swiper>

      {renderChannelEdit()}

    </View>
  )
}