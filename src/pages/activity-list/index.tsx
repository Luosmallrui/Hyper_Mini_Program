import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import CommonHeader from '@/components/CommonHeader'
import { useNavBarMetrics } from '@/hooks/useNavBarMetrics'
import certificationIcon from '../../assets/images/certification.png'
import './index.less'

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
  fans: string
  isVerified: boolean
  time: string
  dynamicCount: number
  attendees: number
  image: string
  price: string
  isFollowed?: boolean
  isSubscribed?: boolean
}

const FILTER_CATS = ['全部', '滑板', '派对', '汽车', '纹身', '体育运动', '活动', '露营', '酒吧/场地', '篮球']
const FILTER_SORTS = ['智能推荐', '距离优先', '人气优先', '高分优先']

export default function ActivityListPage() {
  const [list, setList] = useState<PartyItem[]>([])
  const isFetchingRef = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterOpen, setFilterOpen] = useState<'none' | 'cat' | 'sort'>('none')
  const [selectedCat, setSelectedCat] = useState('全部')
  const [selectedSort, setSelectedSort] = useState('智能推荐')
  const refreshStartRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { statusBarHeight, navBarHeight } = useNavBarMetrics()
  const filterBarGap = 14
  const filterBarHeight = 40
  const listTopGap = 0
  const headerStyle = useMemo(
    () => ({ top: `${statusBarHeight}px`, height: `${navBarHeight}px`, zIndex: 100 }),
    [navBarHeight, statusBarHeight],
  )
  const filterBarTop = statusBarHeight + navBarHeight + filterBarGap
  const listTop = filterBarTop + filterBarHeight + listTopGap
  const handleSearchClick = useCallback(() => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }, [])

  const fetchList = useCallback(async (options?: { isRefresh?: boolean; silentError?: boolean }) => {
    const { isRefresh = false, silentError = false } = options || {}
    if (isFetchingRef.current) return false
    isFetchingRef.current = true
    try {
      const res = await request({
        url: '/api/v1/merchant/list',
        method: 'GET',
      })
      const dataList = res?.data?.data?.list || []
      const mapped: PartyItem[] = Array.isArray(dataList)
        ? dataList.map((item: MerchantItem) => {
            const createdAt = item.created_at ? new Date(item.created_at) : null
            const formattedTime =
              createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString().slice(0, 10) : item.created_at || ''
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
              time: formattedTime,
              price: typeof item.avg_price === 'number' ? (item.avg_price / 100).toFixed(0) : '0',
              attendees: item.current_count,
              dynamicCount: item.post_count,
              fans: String(item.current_count ?? ''),
              isVerified: false,
              isFollowed: false,
              isSubscribed: false,
            }
          })
        : []

      setList(mapped)
      return true
    } catch (error) {
      console.error('Activity list load failed:', error)
      if (isRefresh || !silentError) {
        Taro.showToast({ title: '刷新失败', icon: 'none' })
      }
      return false
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) return

    refreshStartRef.current = Date.now()
    setIsRefreshing(true)

    const succeeded = await fetchList({ isRefresh: true })
    const elapsed = Date.now() - refreshStartRef.current
    const remain = Math.max(600 - elapsed, 0)

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    const finish = () => {
      setIsRefreshing(false)
      if (succeeded) {
        Taro.showToast({ title: '刷新成功', icon: 'success' })
      }
    }

    if (remain > 0) {
      refreshTimerRef.current = setTimeout(() => {
        finish()
        refreshTimerRef.current = null
      }, remain)
    } else {
      finish()
    }
  }, [fetchList])

  useEffect(() => {
    fetchList({ silentError: true })
  }, [fetchList])

  useEffect(() => () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const toggleFollow = (id: string | number) => {
    setList((prev) => prev.map((item) => (item.id === id ? { ...item, isFollowed: !item.isFollowed } : item)))
  }

  const toggleSubscribe = (id: string | number) => {
    setList((prev) => prev.map((item) => (item.id === id ? { ...item, isSubscribed: !item.isSubscribed } : item)))
  }

  const handleFilterClick = (type: 'cat' | 'sort') => {
    setFilterOpen(filterOpen === type ? 'none' : type)
  }

  const handleBackToMap = async () => {
    const pageStack = Taro.getCurrentPages()
    if (pageStack.length > 1) {
      try {
        await Taro.navigateBack({ delta: 1 })
        return
      } catch (error) {
        console.warn('navigateBack failed, fallback to switchTab:', error)
      }
    }
    Taro.switchTab({ url: '/pages/index/index' })
  }

  const handleGoDetail = (item: PartyItem) => {
    const extParams = `&lat=${encodeURIComponent(String(item.lat ?? ''))}&lng=${encodeURIComponent(String(item.lng ?? ''))}&location=${encodeURIComponent(item.location || '')}`
    const path =
      item?.type === '场地'
        ? `/pages/venue/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}${extParams}`
        : `/pages/activity/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}${extParams}`
    Taro.navigateTo({ url: path })
  }

  return (
    <View className='activity-list-page'>
      <CommonHeader
        className='activity-list-header'
        positionMode='fixed'
        style={headerStyle}
        onSearchClick={handleSearchClick}
      />

      <View className='filter-bar' style={{ top: `${filterBarTop}px` }}>
        <View className='filter-actions'>
          <View className={`filter-item ${filterOpen === 'cat' ? 'active' : ''}`} onClick={() => handleFilterClick('cat')}>
            <Text className='txt'>{selectedCat === '全部' ? '全部' : selectedCat}</Text>
            <AtIcon value={filterOpen === 'cat' ? 'chevron-up' : 'chevron-down'} size='10' color={filterOpen === 'cat' ? '#FF2E4D' : '#999'} />
          </View>
          <View className={`filter-item ${filterOpen === 'sort' ? 'active' : ''}`} onClick={() => handleFilterClick('sort')}>
            <Text className='txt'>{selectedSort}</Text>
            <AtIcon value={filterOpen === 'sort' ? 'chevron-up' : 'chevron-down'} size='10' color={filterOpen === 'sort' ? '#FF2E4D' : '#999'} />
          </View>
        </View>

        <View className='back-map-btn' onClick={handleBackToMap}>
          <Image className='back-map-icon' src={require('../../assets/icons/back-to-map.svg')} mode='aspectFit' />
        </View>
      </View>

      {filterOpen !== 'none' && (
        <View className='filter-dropdown-overlay' style={{ top: `${filterBarTop + filterBarHeight}px` }}>
          <View className='mask' onClick={() => setFilterOpen('none')} />
          <View className='dropdown-content'>
            {filterOpen === 'cat' &&
              FILTER_CATS.map((cat) => (
                <View
                  key={cat}
                  className={`dd-item ${selectedCat === cat ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedCat(cat)
                    setFilterOpen('none')
                  }}
                >
                  {cat}
                </View>
              ))}
            {filterOpen === 'sort' &&
              FILTER_SORTS.map((sort) => (
                <View
                  key={sort}
                  className={`dd-item ${selectedSort === sort ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSort(sort)
                    setFilterOpen('none')
                  }}
                >
                  {sort}
                </View>
              ))}
          </View>
        </View>
      )}

      <ScrollView
        scrollY
        refresherEnabled
        refresherTriggered={isRefreshing}
        onRefresherRefresh={handleRefresh}
        onRefresherRestore={() => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
            refreshTimerRef.current = null
          }
          setIsRefreshing(false)
        }}
        onRefresherAbort={() => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
            refreshTimerRef.current = null
          }
          setIsRefreshing(false)
        }}
        refresherBackground='#000000'
        refresherDefaultStyle='white'
        showScrollbar={false}
        className='list-scroll'
        style={{ top: `${listTop}px`, height: `calc(100vh - ${listTop}px)` }}
      >
        {list.map((item) => (
          <View key={item.id} className='activity-card' onClick={() => handleGoDetail(item)}>
            <View className='poster-area'>
              {item.image ? <Image src={item.image} mode='aspectFill' className='cover-img' /> : <View className='cover-placeholder' />}
              <View className='attendees-capsule'>
                <Image className='run-icon' src={require('../../assets/icons/run.svg')} mode='aspectFit' />
                <Text className='num-italic'>{item.attendees || 0}</Text>
              </View>
            </View>

            <View className='info-area'>
              <View className='title-row'>
                <Text className='title'>{item.title}</Text>
                <Text className='tag'>{item.type}</Text>
              </View>

              <View className='meta-row'>
                <View className='meta-left'>
                  <Image className='time-icon' src={require('../../assets/icons/time.svg')} mode='aspectFit' />
                  <Text className='txt txt-first'>{item.time}</Text>
                  <Text className='txt'>{item.dynamicCount}条动态</Text>
                  <Text className='txt price'>¥{item.price}/人</Text>
                </View>
                <Text className='location'>{item.location}</Text>
              </View>

              <View className='action-row'>
                <View className='user-box'>
                  <View className='avatar'>
                    {item.userAvatar && <Image src={item.userAvatar} mode='aspectFill' className='avatar-img' />}
                  </View>
                  <View className='user-text'>
                    <View className='name-line'>
                      <Text className='name'>{item.user}</Text>
                      <Image className='certification-icon' src={certificationIcon} mode='aspectFit' />
                    </View>
                    <Text className='fans'>{item.fans} 粉丝</Text>
                  </View>
                </View>

                <View className='btn-group'>
                  <View
                    className={`btn outline ${item.isFollowed ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFollow(item.id)
                    }}
                  >
                    {item.isFollowed ? '已关注' : '关注'}
                  </View>
                  {item.type !== '场地' && (
                    <View
                      className={`btn outline ${item.isSubscribed ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSubscribe(item.id)
                      }}
                    >
                      {item.isSubscribed ? '已订阅' : '订阅活动'}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: '40px' }} />
      </ScrollView>
    </View>
  )
}
