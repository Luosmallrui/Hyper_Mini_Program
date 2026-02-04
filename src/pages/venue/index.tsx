import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

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
  
  interface MerchantNote {
    id: string
    user_id: number
    title: string
    type: number
    created_at: string
    updated_at: string
    time_stamp: number
    media_data: {
      url: string
      thumbnail_url: string
      width: number
      height: number
      duration: number
    }
    like_count: number
    coll_count: number
    share_count: number
    comment_count: number
    is_liked: boolean
    is_collected: boolean
    is_followed: boolean
  }
  
  interface MerchantDetail {
    id: number
    name: string
    avg_price: number
    location_name: string
    images: string[]
    goods: MerchantGood[]
    notes: MerchantNote[]
    next_cursor: string
    has_more: boolean
    user_name: string
    user_avatar: string
    is_follow: boolean
    business_hours: string
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
  const [activeTab, setActiveTab] = useState<'goods' | 'notes'>('goods')
  const [tabIndex, setTabIndex] = useState(0)
  const [swiperHeight, setSwiperHeight] = useState(0)

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
      } catch (error) {
        console.error('Venue detail load failed:', error)
      }
    }
    fetchVenue()
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
    }
  }, [galleryImages])

  useEffect(() => {
    Taro.nextTick(() => {
      const query = Taro.createSelectorQuery()
      query.select('.tab-panel.active').boundingClientRect((rect) => {
        if (!rect || Array.isArray(rect)) return
        setSwiperHeight(rect.height || 0)
      }).exec()
    })
  }, [venue, tabIndex, activeTab]) // 增加 activeTab 依赖

  const venueName = venue?.name || 'SWING鸡尾酒吧（大源店）'
  const venueTime = venue?.business_hours ? `营业中 ${venue.business_hours}` : '营业中 19:30-次日02:30'
  const venuePrice = typeof venue?.avg_price === 'number' ? `¥${(venue.avg_price / 100).toFixed(0)}/人起` : '¥80/人起'
  const venueLocation = venue?.location_name || '高新区盛园街道保利星荟5栋1楼'
  const venueUser = venue?.user_name || 'SWING'
  const venueAvatar = venue?.user_avatar || fallbackAvatar
  const venueFans = String(venue?.notes?.length || '0')
  const noteList = venue?.notes || []

  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}w`
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
    return String(num)
  }

  const calculateImageHeight = (width: number, height: number): number => {
    const containerWidth = (Taro.getSystemInfoSync().windowWidth - 80) / 2
    const aspectRatio = height / width
    const calculatedHeight = containerWidth * aspectRatio
    return Math.min(Math.max(calculatedHeight, 200), 400)
  }

  const handleNoteClick = (noteId: string | number) => {
    Taro.navigateTo({ url: `/pages/square-sub/post-detail/index?id=${String(noteId)}` })
  }

  const handleTabChange = (nextTab: 'goods' | 'notes') => {
    setActiveTab(nextTab)
    setTabIndex(nextTab === 'goods' ? 0 : 1)
  }

  const handleSwiperChange = (e: { detail: { current: number } }) => {
    const nextIndex = e.detail.current
    setTabIndex(nextIndex)
    setActiveTab(nextIndex === 0 ? 'goods' : 'notes')
  }

  return (
    <View className='venue-page'>
      {/* 顶部导航 (Fixed，透明) */}
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
            {/* Logo 或 标题 */}
             <Image className='nav-logo' src={require('../../assets/images/hyper-icon.png')} mode='aspectFit' />
          </View>
          <View className='nav-right' style={{ width: `${menuButtonWidth}px` }} />
        </View>
      </View>

      {/* Hero 区域 (背景图 + 信息) */}
      <View className='hero-section'>
        {/* 背景大图 */}
        <Image src={currentHero} className='hero-bg-img' mode='aspectFill' />
        <View className='hero-mask' /> {/* 渐变遮罩 */}

        {/* 商家信息 */}
        <View className='hero-content' style={{ paddingTop: `${statusBarHeight + navBarHeight + 20}px` }}>
           <Text className='title'>{venueName}</Text>
           <View className='meta-row'>
             <Text className='meta'>{venueTime}</Text>
             <Text className='meta price'>{venuePrice}</Text>
           </View>
           <View className='location-row'>
             <Text className='location'>{venueLocation}</Text>
             <AtIcon value='chevron-right' size='16' color='#fff' />
           </View>
        </View>

        {/* 缩略图画廊 (绝对定位在左下) */}
        <View className='gallery-float'>
          {galleryImages.map((img, idx) => (
            <View
              key={`${img}-${idx}`}
              className={`gallery-item ${currentHero === img ? 'active' : ''}`}
              onClick={() => setCurrentHero(img)}
            >
              <Image className='gallery-img' src={img} mode='aspectFill' />
            </View>
          ))}
        </View>
      </View>

      {/* 下方内容区域 (白色卡片部分) */}
      <View className='content-scroll'>
        <View className='content-inner'>
          <View className='host-card'>
            <View className='host-left'>
              <Image className='host-avatar' src={venueAvatar} mode='aspectFill' />
              <View className='host-info'>
                <View className='host-name-row'>
                  <Text className='host-name'>{venueUser}</Text>
                  <AtIcon value='check-circle' size='12' color='#2E6BFF' />
                </View>
                <Text className='host-fans'>{venueFans} 粉丝</Text>
              </View>
            </View>
            <View className='follow-btn'>{venue?.is_follow ? '已关注' : '关注'}</View>
          </View>

          <View className='tab-row'>
            <Text className={`tab ${activeTab === 'goods' ? 'active' : ''}`} onClick={() => handleTabChange('goods')}>商品</Text>
            <Text className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => handleTabChange('notes')}>动态·{venue?.notes?.length || 0}</Text>
          </View>

          <Swiper
            className='venue-tab-swiper'
            current={tabIndex}
            onChange={handleSwiperChange}
            style={{ height: swiperHeight ? `${swiperHeight}px` : 'auto' }}
          >
            <SwiperItem>
              <View className={`tab-panel ${activeTab === 'goods' ? 'active' : ''}`}>
                <View className='product-grid'>
                {(venue?.goods || []).map(item => (
                  <View key={item.id} className='product-card'>
                    <Image className='product-img' src={item.cover_image?.trim()} mode='aspectFill' />
                    <Text className='product-title'>{item.product_name}</Text>
                    <View className='product-meta'>
                      <Text className='price'>¥{(item.price / 100).toFixed(0)}</Text>
                      {item.original_price ? <Text className='original'>¥{(item.original_price / 100).toFixed(0)}</Text> : null}
                    </View>
                    <Text className='sale'>{item.description}</Text>
                    <View
                      className='buy-btn'
                      onClick={() => {
                        if (!venueId) return
                        Taro.navigateTo({
                          url: `/pages/venue/product/index?venueId=${venueId}&productId=${item.id}`
                        })
                      }}
                    >
                      购买
                    </View>
                  </View>
                ))}
              </View>
              </View>
            </SwiperItem>
            <SwiperItem>
              <View className={`tab-panel ${activeTab === 'notes' ? 'active' : ''}`}>
                <View className='notes-section'>
                {noteList.length > 0 ? (
                  <View className='waterfall-container'>
                    <View className='waterfall-column'>
                      {noteList.filter((_, i) => i % 2 === 0).map(note => {
                        const imageHeight = calculateImageHeight(note.media_data.width, note.media_data.height)
                        return (
                          <View key={String(note.id)} className='note-card' onClick={() => handleNoteClick(note.id)}>
                            <Image className='note-cover' src={note.media_data.thumbnail_url || note.media_data.url} mode='aspectFill' style={{ height: `${imageHeight}px` }} />
                            <View className='note-info'>
                              <Text className='note-title'>{note.title}</Text>
                              <View className='note-footer'>
                                <View className='author-info'>
                                  <Image className='author-avatar' src={venueAvatar} mode='aspectFill' />
                                  <Text className='author-name'>{venueUser}</Text>
                                </View>
                                <View className='like-info'>
                                  <Image className='like-icon' src={likeIcon} mode='aspectFit' />
                                  <Text className='like-count'>{formatNumber(note.like_count)}</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                    <View className='waterfall-column'>
                      {noteList.filter((_, i) => i % 2 === 1).map(note => {
                        const imageHeight = calculateImageHeight(note.media_data.width, note.media_data.height)
                        return (
                          <View key={String(note.id)} className='note-card' onClick={() => handleNoteClick(note.id)}>
                            <Image className='note-cover' src={note.media_data.thumbnail_url || note.media_data.url} mode='aspectFill' style={{ height: `${imageHeight}px` }} />
                            <View className='note-info'>
                              <Text className='note-title'>{note.title}</Text>
                              <View className='note-footer'>
                                <View className='author-info'>
                                  <Image className='author-avatar' src={venueAvatar} mode='aspectFill' />
                                  <Text className='author-name'>{venueUser}</Text>
                                </View>
                                <View className='like-info'>
                                  <Image className='like-icon' src={likeIcon} mode='aspectFit' />
                                  <Text className='like-count'>{formatNumber(note.like_count)}</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                ) : (
                  <View className='empty-notes'>
                    <Text className='empty-icon'>📷</Text>
                    <Text className='empty-text'>还没有发布动态</Text>
                  </View>
                )}
              </View>
              </View>
             </SwiperItem>
          </Swiper>

          <View className='bottom-space' />
        </View>
      </View>
    </View>
  )
}
