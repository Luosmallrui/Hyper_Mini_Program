import { View, Text, Map as TaroMap, Swiper, SwiperItem, Image, ScrollView, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/slider.scss'
import { request } from '@/utils/request'
import CommonHeader from '@/components/CommonHeader'
import { useNavBarMetrics } from '@/hooks/useNavBarMetrics'
import { setTabBarIndex } from '../../store/tabbar'
import mapPinIcon from '../../assets/icons/map-pin.svg'
import mapPinFallbackIcon from '../../assets/icons/map-pin-fallback.png'
import partyMarkerFallbackIcon from '../../assets/icons/marker-party-fallback.png'
import venueMarkerFallbackIcon from '../../assets/icons/marker-venue-fallback.png'
import {
  AVATAR_MARKER_CANVAS_ID,
  ICON_ONLY_MARKER_CANVAS_ID,
  buildIconOnlyMarker,
  buildCircularAvatarMarker,
} from './map-marker'
import './index.less'

const CATEGORIES = ['全部分类', '滑板', '派对', '汽车', '纹身', '体育运动', '活动', '露营', '酒吧/场地', '篮球']
const AREA_LEVEL1 = [{ key: 'dist', name: '距离' }, { key: 'region', name: '行政区/商圈' }]
const MAP_KEY = 'Y7YBZ-3UUEN-Z3KFC-SH4QG-LH5RT-IAB4S'
const USER_LOCATION_MARKER_ID = 99900001
const MARKER_INACTIVE_HEIGHT = 50
const MARKER_ACTIVE_HEIGHT = 58
const AREA_LEVEL2 = ['不限', '热门商圈', '高新区', '锦江区']
const AREA_LEVEL3 = ['春熙路', '宽窄巷子', '兰桂坊', '铁像寺', 'SKP', '玉林', '望平街']
const MORE_TAGS = ['积分立减', '买单立减', '新人优惠']

interface MerchantItem {
  id: number
  title: string
  type: string
  location: string
  lat: number
  lng: number
  username: string
  user_avatar: string
  cover_image: string
  created_at: string
  avg_price: number
  current_count: number
  post_count: number
  icon?: string
}

interface PartyItem {
  id: string | number
  title: string
  type: string
  location: string
  lat: number
  lng: number
  user: string
  userAvatar: string
  time: string
  price: string
  attendees: number
  dynamicCount: number
  image: string
  icon?: string
  rank?: string
  fans?: string
  isVerified?: boolean
}

export default function IndexPage() {
  const [current, setCurrent] = useState(0)
  const [markers, setMarkers] = useState<any[]>([])
  const [userLocationMarker, setUserLocationMarker] = useState<any | null>(null)
  const [partyList, setPartyList] = useState<PartyItem[]>([])
  const isEmpty = partyList.length === 0

  const [filterOpen, setFilterOpen] = useState<'none' | 'all' | 'area' | 'more'>('none')
  const [selectedCategory, setSelectedCategory] = useState('全部分类')
  const [areaL1, setAreaL1] = useState('region')
  const [areaL2, setAreaL2] = useState('热门商圈')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedTags] = useState<string[]>([])

  const { statusBarHeight, navBarHeight } = useNavBarMetrics()
  const [initialCenter, setInitialCenter] = useState({ lng: 104.066, lat: 30.657 })
  const mapCtx = useRef<any>(null)
  const markerBuildTokenRef = useRef(0)
  const markerIndexMapRef = useRef<Map<number, number>>(new Map())

  Taro.useDidShow(() => {
    setTabBarIndex(0)
    Taro.eventCenter.trigger('TAB_SWITCH_LOADING', false)
    void refreshUserLocationMarker()
  })

  useEffect(() => {
    mapCtx.current = Taro.createMapContext('myMap')
  }, [])

  useEffect(() => {
    const onUserUpdate = () => {
      void refreshUserLocationMarker()
    }
    Taro.eventCenter.on('USER_INFO_UPDATED', onUserUpdate)
    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', onUserUpdate)
    }
  }, [])

  useEffect(() => {
    void refreshUserLocationMarker()
  }, [])

  useEffect(() => {
    const fetchPartyList = async () => {
      try {
        const res = await request({
          url: '/api/v1/merchant/list',
          method: 'GET',
        })
        const list = res?.data?.data?.list || []
        const mappedList: PartyItem[] = Array.isArray(list)
          ? list.map((item: MerchantItem) => {
              const createdAt = item.created_at ? new Date(item.created_at) : null
              const formattedTime = createdAt && !Number.isNaN(createdAt.getTime())
                ? createdAt.toISOString().slice(0, 10)
                : item.created_at || ''
              return {
                id: item.id,
                title: item.title,
                type: item.type,
                location: item.location,
                lat: item.lat,
                lng: item.lng,
                user: item.username,
                userAvatar: item.user_avatar,
                image: item.cover_image,
                icon: item.icon,
                time: formattedTime,
                price: typeof item.avg_price === 'number' ? (item.avg_price / 100).toFixed(0) : '0',
                attendees: item.current_count,
                dynamicCount: item.post_count,
                fans: String(item.current_count ?? ''),
                isVerified: false,
                rank: '',
              }
            })
          : []

        setPartyList(mappedList)
        if (mappedList.length > 0) {
          setCurrent(0)
          setInitialCenter({ lng: mappedList[0].lng, lat: mappedList[0].lat })
          await updateMarkers(mappedList, 0)
        } else {
          await updateMarkers([], 0)
        }
      } catch (error) {
        console.error('Party list load failed:', error)
      }
    }

    fetchPartyList()
  }, [])

  const resolveMarkerFallback = (item: PartyItem) => {
    if (item.type === '场地') return venueMarkerFallbackIcon
    if (item.type === '派对') return partyMarkerFallbackIcon
    return mapPinFallbackIcon
  }

  const resolveMarkerIconPath = (item: PartyItem) => {
    const iconUrl = (item.icon || '').trim()
    if (!iconUrl) return resolveMarkerFallback(item)
    if (/\.svg(\?.*)?$/i.test(iconUrl)) return resolveMarkerFallback(item)
    return iconUrl
  }

  const formatMarkerTitle = (title: string) => {
    const safe = (title || '').trim()
    if (!safe) return ''
    if (safe.length <= 18) return safe
    return `${safe.slice(0, 18)}...`
  }

  const updateMarkers = async (list: PartyItem[], activeIndex: number) => {
    const buildToken = ++markerBuildTokenRef.current
    if (list.length === 0) {
      markerIndexMapRef.current = new Map()
      if (buildToken !== markerBuildTokenRef.current) return
      setMarkers([])
      return
    }

    const markerIndexMap = new Map<number, number>()
    const markerAssets = await Promise.all(
      list.map(async (item, index) => {
        const markerId = Number(item.id)
        markerIndexMap.set(markerId, index)
        const isActive = index === activeIndex
        const fallbackPath = resolveMarkerFallback(item)
        const rawIconPath = resolveMarkerIconPath(item)
        const ratioHint = item.type === '派对' ? 44 / 54 : 1
        const iconAsset = await buildIconOnlyMarker(
          rawIconPath,
          fallbackPath,
          isActive ? MARKER_ACTIVE_HEIGHT : MARKER_INACTIVE_HEIGHT,
          ratioHint,
        )
        return {
          id: markerId,
          latitude: item.lat,
          longitude: item.lng,
          width: iconAsset.width,
          height: iconAsset.height,
          iconPath: iconAsset.iconPath,
          zIndex: isActive ? 999 : 200,
          anchor: { x: 0.5, y: 0.5 },
          label: {
            content: formatMarkerTitle(item.title),
            color: '#ffffff',
            fontSize: isActive ? 13 : 12,
            anchorX: 0,
            anchorY: Math.round(iconAsset.height / 2 + 14),
            borderWidth: 0,
            borderColor: 'transparent',
            borderRadius: 6,
            bgColor: 'rgba(0,0,0,0.58)',
            padding: 6,
            textAlign: 'center',
          },
        }
      }),
    )

    if (buildToken !== markerBuildTokenRef.current) return
    markerIndexMapRef.current = markerIndexMap
    setMarkers(markerAssets)
  }

  const getCachedUserAvatar = () => {
    const cachedUser = Taro.getStorageSync('userInfo')
    if (!cachedUser || typeof cachedUser !== 'object') return ''
    return cachedUser.avatar_url || cachedUser.avatar || cachedUser.headimgurl || cachedUser.head_img || ''
  }

  const refreshUserLocationMarker = async (): Promise<{ latitude: number; longitude: number } | null> => {
    let avatarUrl = getCachedUserAvatar()
    if (!avatarUrl) {
      const accessToken = Taro.getStorageSync('access_token')
      if (accessToken) {
        try {
          const res = await request({ url: '/api/v1/user/info', method: 'GET' })
          const latestUser = res?.data?.data?.user
          if (latestUser) {
            const normalizedUser = {
              ...latestUser,
              avatar_url: latestUser.avatar_url || latestUser.avatar || latestUser.headimgurl || latestUser.head_img || '',
            }
            Taro.setStorageSync('userInfo', normalizedUser)
            avatarUrl = normalizedUser.avatar_url
          }
        } catch (error) {
          console.warn('load latest user info for marker failed:', error)
        }
      }
    }

    try {
      const location = await Taro.getLocation({ type: 'gcj02' })
      const avatarIconPath = await buildCircularAvatarMarker(avatarUrl, mapPinFallbackIcon)
      setUserLocationMarker({
        id: USER_LOCATION_MARKER_ID,
        latitude: location.latitude,
        longitude: location.longitude,
        width: 60,
        height: 60,
        iconPath: avatarIconPath || mapPinFallbackIcon,
        zIndex: 4000,
        anchor: { x: 0.5, y: 0.5 },
      })
      return {
        latitude: location.latitude,
        longitude: location.longitude,
      }
    } catch (error) {
      console.warn('refresh user location marker failed:', error)
      return null
    }
  }

  const handleSwiperChange = (e: any) => {
    if (e.detail.source === 'touch' || e.detail.source === '') {
      setCurrent(e.detail.current)
    }
  }

  const handleSwiperAnimationFinish = (e: any) => {
    const index = e.detail.current
    const target = partyList[index]
    if (!target) return
    if (mapCtx.current) {
      mapCtx.current.moveToLocation({
        longitude: target.lng,
        latitude: target.lat,
      })
    }
    void updateMarkers(partyList, index)
  }

  const handleLocate = async () => {
    const location = await refreshUserLocationMarker()
    if (!location) {
      Taro.showToast({
        title: '定位失败，请开启定位权限',
        icon: 'none',
      })
      return
    }
    setInitialCenter({
      lng: location.longitude,
      lat: location.latitude,
    })

    const ctx = mapCtx.current || Taro.createMapContext('myMap')
    mapCtx.current = ctx
    if (ctx) {
      ctx.moveToLocation({
        longitude: location.longitude,
        latitude: location.latitude,
      })
    }
  }

  const handleMarkerTap = (e: any) => {
    const markerId = Number(e?.detail?.markerId)
    if (markerId === USER_LOCATION_MARKER_ID) return
    const targetIndex = markerIndexMapRef.current.get(markerId)
    if (typeof targetIndex !== 'number') return

    setCurrent(targetIndex)
    const target = partyList[targetIndex]
    if (!target) return
    mapCtx.current?.moveToLocation({
      longitude: target.lng,
      latitude: target.lat,
    })
    void updateMarkers(partyList, targetIndex)
  }

  const navigateTo = (path: string) => Taro.navigateTo({ url: path })
  const getDetailPath = (item: PartyItem) => {
    if (item?.type === '场地') {
      return `/pages/venue/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}`
    }
    return `/pages/activity/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}`
  }

  const topHeaderStyle = { top: `${statusBarHeight}px`, height: `${navBarHeight}px` }
  const topHeaderFadeStyle = { height: `${statusBarHeight + navBarHeight}px` }
  const filterContainerStyle = { top: `${statusBarHeight + navBarHeight + 10}px` }

  const toggleFilter = (type: 'all' | 'area' | 'more') => {
    setFilterOpen(filterOpen === type ? 'none' : type)
  }

  const isHighlight = (type: string) => {
    if (type === 'all') return selectedCategory !== '全部分类'
    if (type === 'area') return selectedRegion !== ''
    if (type === 'more') return selectedTags.length > 0
    return false
  }

  const renderDropdownContent = () => {
    if (filterOpen === 'none') return null

    return (
      <View className='dropdown-content'>
        {filterOpen === 'all' && (
          <ScrollView scrollY className='list-scroll'>
            {CATEGORIES.map(cat => (
              <View
                key={cat}
                className={`list-item ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat); setFilterOpen('none') }}
              >
                <Text>{cat}</Text>
                {selectedCategory === cat && <AtIcon value='check' size='16' color='#FF2E4D' />}
              </View>
            ))}
          </ScrollView>
        )}

        {filterOpen === 'area' && (
          <View className='split-view'>
            <ScrollView scrollY className='col col-1'>
              {AREA_LEVEL1.map(item => (
                <View
                  key={item.key}
                  className={`item ${areaL1 === item.key ? 'active' : ''}`}
                  onClick={() => setAreaL1(item.key)}
                >
                  {item.name}
                </View>
              ))}
            </ScrollView>
            <ScrollView scrollY className='col col-2'>
              {AREA_LEVEL2.map(item => (
                <View
                  key={item}
                  className={`item ${areaL2 === item ? 'active' : ''}`}
                  onClick={() => setAreaL2(item)}
                >
                  {item}
                </View>
              ))}
            </ScrollView>
            <ScrollView scrollY className='col col-3'>
              {AREA_LEVEL3.map(item => (
                <View
                  key={item}
                  className={`item ${selectedRegion === item ? 'active' : ''}`}
                  onClick={() => { setSelectedRegion(item); setFilterOpen('none') }}
                >
                  {item}
                  {selectedRegion === item && <AtIcon value='check' size='14' color='#FF2E4D' />}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {filterOpen === 'more' && (
          <View className='more-view'>
            <Text className='label'>优惠标签</Text>
            <View className='tags'>
              {MORE_TAGS.map(tag => (
                <View key={tag} className='tag'>
                  {tag}
                </View>
              ))}
            </View>
            <View className='btn-row'>
              <View className='btn reset'>重置</View>
              <View className='btn confirm' onClick={() => setFilterOpen('none')}>确定</View>
            </View>
          </View>
        )}
      </View>
    )
  }

  return (
    <View className='index-page-map'>
      <TaroMap
        id='myMap'
        className='map-bg'
        longitude={initialCenter.lng}
        latitude={initialCenter.lat}
        scale={13}
        markers={userLocationMarker ? [...markers, userLocationMarker] : markers}
        subkey={MAP_KEY}
        setting={{ enableSatellite: false, enableTraffic: false }}
        onMarkerTap={handleMarkerTap}
        onError={(e) => {
          console.error('Map error:', e)
        }}
      />
      <Canvas canvasId={ICON_ONLY_MARKER_CANVAS_ID} className='icon-marker-canvas' />
      <Canvas canvasId={AVATAR_MARKER_CANVAS_ID} className='avatar-marker-canvas' />

      <View className='top-header-fade' style={topHeaderFadeStyle} />

      {filterOpen !== 'none' && (
        <View className='mask-layer' onClick={() => setFilterOpen('none')} />
      )}

      <CommonHeader style={topHeaderStyle} onSearchClick={() => navigateTo('/pages/search/index')} />

      <View
        className={`filter-container-wrapper ${filterOpen !== 'none' ? 'is-open' : ''}`}
        style={filterContainerStyle}
      >
        <View className='filter-bar-header'>
          <View
            className={`capsule-item ${isHighlight('all') || filterOpen === 'all' ? 'highlight-bg' : ''}`}
            onClick={() => toggleFilter('all')}
          >
            <Text className={isHighlight('all') || filterOpen === 'all' ? 'highlight-text' : ''}>
              {selectedCategory === '全部分类' ? '全部' : selectedCategory}
            </Text>
            <View
              className={`triangle-icon ${isHighlight('all') || filterOpen === 'all' ? 'active' : ''} ${filterOpen === 'all' ? 'up' : 'down'}`}
            />
          </View>

          <View
            className={`capsule-item ${filterOpen === 'area' ? 'highlight-bg' : ''}`}
            onClick={() => toggleFilter('area')}
          >
            <Text className={isHighlight('area') || filterOpen === 'area' ? 'highlight-text' : ''}>区域</Text>
            <View
              className={`triangle-icon ${isHighlight('area') || filterOpen === 'area' ? 'active' : ''} ${filterOpen === 'area' ? 'up' : 'down'}`}
            />
          </View>

          <View
            className={`capsule-item ${filterOpen === 'more' ? 'highlight-bg' : ''}`}
            onClick={() => toggleFilter('more')}
          >
            <Text className={isHighlight('more') || filterOpen === 'more' ? 'highlight-text' : ''}>更多筛选</Text>
            <View
              className={`triangle-icon ${isHighlight('more') || filterOpen === 'more' ? 'active' : ''} ${filterOpen === 'more' ? 'up' : 'down'}`}
            />
          </View>
        </View>

        {renderDropdownContent()}
      </View>

      <View className={`floating-group${isEmpty ? ' empty' : ''}`}>
        <View className='circle-btn locate-btn' onClick={handleLocate}>
          <Image className='map-pin' src={mapPinIcon} mode='aspectFit' />
        </View>
        <View className='capsule-btn list-btn' onClick={() => navigateTo('/pages/activity-list/index')}>
          <AtIcon value='list' size='16' color='#fff' />
          <Text className='txt'>查看列表</Text>
        </View>
      </View>

      {partyList.length === 0 && (
        <View className='empty-result'>
          <View className='empty-icon'>!</View>
          <Text className='empty-text'>没有找到相关结果</Text>
        </View>
      )}

      {partyList.length > 0 && (
        <View className='bottom-card-container'>
          <Swiper
            className='card-swiper'
            current={current}
            onChange={handleSwiperChange}
            onAnimationFinish={handleSwiperAnimationFinish}
            previousMargin='20px'
            nextMargin='20px'
            circular={false}
          >
            {partyList.map((item) => (
              <SwiperItem key={item.id} className='card-item-wrapper'>
                <View
                  className='party-card-pro'
                  onClick={() => navigateTo(getDetailPath(item))}
                >
                  <View className='fake-glass-layer' />
                  <View
                    className='card-header-bg'
                    style={item.image ? {
                      backgroundImage: `url(${item.image})`,
                    } : undefined}
                  >
                    {item.rank && (
                      <View className='rank-badge'>
                        <AtIcon value='fire' size='12' color='#fff' />
                        <Text className='txt'>{item.rank}</Text>
                      </View>
                    )}
                    <View className='attendees-capsule'>
                      <Image
                        className='run-icon'
                        src={require('../../assets/icons/run.svg')}
                        mode='aspectFit'
                      />
                      <Text className='num-italic'>{item.attendees || 0}</Text>
                    </View>
                  </View>

                  <View className='card-body'>
                    <View className='title-row'>
                      <Text className='title'>{item.title}</Text>
                      <Text className='type-tag'>{item.type}</Text>
                    </View>
                    <View className='info-row'>
                      <AtIcon value='clock' size='14' color='#999' />
                      <Text className='info-txt info-first'>{item.time}</Text>
                      <Text className='info-txt'>{item.dynamicCount}条动态</Text>
                      <Text className='info-txt price'>¥{item.price}/人</Text>
                    </View>
                    <View className='card-footer'>
                      <View className='user-info'>
                        <View className='avatar'>
                          {item.userAvatar && (
                            <Image
                              src={item.userAvatar}
                              className='avatar-img'
                              mode='aspectFill'
                            />
                          )}
                        </View>
                        <View className='meta'>
                          <View className='name-row'>
                            <Text className='name'>{item.user}</Text>
                            {item.isVerified && <AtIcon className='verified-icon' value='check-circle' size='14' color='#3d8bff' />}
                          </View>
                          <Text className='fans'>{item.fans} 粉丝</Text>
                        </View>
                      </View>
                      <View className='action-btns'>
                        <View className='card-action-btn follow-btn'>关注</View>
                        <View className='card-action-btn subscribe-btn'>订阅活动</View>
                      </View>
                    </View>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
      )}
    </View>
  )
}
