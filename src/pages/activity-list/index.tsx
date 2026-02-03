import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
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

// 筛选配置
const FILTER_CATS = ['全部', '滑板', '派对', '汽车', '纹身', '体育运动', '活动', '露营', '酒吧/场地', '篮球']
const FILTER_SORTS = ['智能推荐', '距离优先', '人气优先', '高分优先']

export default function ActivityListPage() {
  const [list, setList] = useState<PartyItem[]>([])

  // 筛选状态
  const [filterOpen, setFilterOpen] = useState<'none' | 'cat' | 'sort'>('none')
  const [selectedCat, setSelectedCat] = useState('全部')
  const [selectedSort, setSelectedSort] = useState('智能推荐')

  // 导航栏适配
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const contentHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(contentHeight > 0 ? contentHeight : 44)
  }, [])

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await request({
          url: '/api/v1/merchant/list',
          method: 'GET'
        })
        const dataList = res?.data?.data?.list || []
        const mapped = Array.isArray(dataList)
          ? dataList.map((item: MerchantItem) => {
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
                time: formattedTime,
                price: typeof item.avg_price === 'number' ? (item.avg_price / 100).toFixed(0) : '0',
                attendees: item.current_count,
                dynamicCount: item.post_count,
                fans: String(item.current_count ?? ''),
                isVerified: false,
                isFollowed: false,
                isSubscribed: false
              }
            })
          : []
        setList(mapped)
      } catch (error) {
        console.error('Activity list load failed:', error)
      }
    }

    fetchList()
  }, [])

  const toggleFollow = (id: string | number) => {
    setList(prev =>
      prev.map(item => (item.id === id ? { ...item, isFollowed: !item.isFollowed } : item))
    )
  }

  const toggleSubscribe = (id: string | number) => {
    setList(prev =>
      prev.map(item => (item.id === id ? { ...item, isSubscribed: !item.isSubscribed } : item))
    )
  }

  const handleFilterClick = (type: 'cat' | 'sort') => {
    setFilterOpen(filterOpen === type ? 'none' : type)
  }

  const handleGoDetail = (item: PartyItem) => {
    const path =
      item?.type === '场地'
        ? `/pages/venue/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}`
        : `/pages/activity/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}`
    Taro.navigateTo({ url: path })
  }

  return (
    <View className='activity-list-page'>
      {/* 1. 顶部 Header */}
      <View
        className='custom-header'
        style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px` }}
      >
        <View className='left-area'>
          <Text className='city-text'>成都</Text>
          <AtIcon value='chevron-right' size='16' color='#fff' />
          <View
            className='search-icon-btn'
            onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}
          >
            <AtIcon value='search' size='20' color='#fff' />
          </View>
        </View>
        <View className='center-logo-container'>
          <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='logo-img' />
        </View>
      </View>

      {/* 2. 筛选栏 */}
      <View className='filter-bar' style={{ top: `${statusBarHeight + navBarHeight}px` }}>
        <View
          className={`filter-item ${filterOpen === 'cat' ? 'active' : ''}`}
          onClick={() => handleFilterClick('cat')}
        >
          <Text className='txt'>{selectedCat === '全部' ? '全部' : selectedCat}</Text>
          <AtIcon
            value={filterOpen === 'cat' ? 'chevron-up' : 'chevron-down'}
            size='10'
            color={filterOpen === 'cat' ? '#FF2E4D' : '#999'}
          />
        </View>
        <View
          className={`filter-item ${filterOpen === 'sort' ? 'active' : ''}`}
          onClick={() => handleFilterClick('sort')}
        >
          <Text className='txt'>{selectedSort}</Text>
          <AtIcon
            value={filterOpen === 'sort' ? 'chevron-up' : 'chevron-down'}
            size='10'
            color={filterOpen === 'sort' ? '#FF2E4D' : '#999'}
          />
        </View>
      </View>

      {/* 3. 筛选下拉 */}
      {filterOpen !== 'none' && (
        <View className='filter-dropdown-overlay' style={{ top: `${statusBarHeight + navBarHeight + 40}px` }}>
          <View className='mask' onClick={() => setFilterOpen('none')} />
          <View className='dropdown-content'>
            {filterOpen === 'cat' &&
              FILTER_CATS.map(cat => (
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
              FILTER_SORTS.map(sort => (
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

      {/* 4. 列表区域 */}
      <ScrollView scrollY className='list-scroll' style={{ paddingTop: `${statusBarHeight + navBarHeight + 50}px` }}>
        {list.map(item => (
          <View key={item.id} className='activity-card' onClick={() => handleGoDetail(item)}>
            {/* 海报区域 */}
            <View className='poster-area'>
              {item.image ? (
                <Image src={item.image} mode='aspectFill' className='cover-img' />
              ) : (
                <View className='cover-placeholder' />
              )}
              {/* 左下角报名人数 */}
              <View className='attendees-pill'>
                <View className='avatars'>
                  <View className='av' style={{ zIndex: 3 }} />
                  <View className='av' style={{ zIndex: 2, left: '12px' }} />
                </View>
                <Text className='count-text'>
                  <Text className='bold'>{item.attendees}</Text> 人报名
                </Text>
              </View>
            </View>

            {/* 信息区域 */}
            <View className='info-area'>
              <View className='title-row'>
                <Text className='title'>{item.title}</Text>
                <Text className='tag'>{item.type}</Text>
              </View>

              <View className='meta-row'>
                <AtIcon value='clock' size='12' color='#666' />
                <Text className='txt'>{item.time}</Text>
                <Text className='txt split'>|</Text>
                <Text className='txt'>{item.dynamicCount}条动态</Text>
                <Text className='price'>¥{item.price}/人</Text>
                <Text className='location'>{item.location}</Text>
              </View>

              <View className='action-row'>
                <View className='user-box'>
                  <View className='avatar'>
                    {item.userAvatar && (
                      <Image src={item.userAvatar} mode='aspectFill' className='avatar-img' />
                    )}
                  </View>
                  <View className='user-text'>
                    <View className='name-line'>
                      <Text className='name'>{item.user}</Text>
                      {item.isVerified && <AtIcon value='check-circle' size='10' color='#007AFF' />}
                    </View>
                    <Text className='fans'>{item.fans} 粉丝</Text>
                  </View>
                </View>

                <View className='btn-group'>
                  <View
                    className={`btn outline ${item.isFollowed ? 'disabled' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      toggleFollow(item.id)
                    }}
                  >
                    {item.isFollowed ? '已关注' : '关注'}
                  </View>
                  <View
                    className={`btn outline ${item.isSubscribed ? 'disabled' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      toggleSubscribe(item.id)
                    }}
                  >
                    {item.isSubscribed ? '已订阅' : '订阅活动'}
                  </View>
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
