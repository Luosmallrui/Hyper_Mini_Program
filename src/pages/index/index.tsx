import { View, Text, Map, Swiper, SwiperItem, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/slider.scss'
import { request } from '@/utils/request'
import { setTabBarIndex } from '../../store/tabbar'
import './index.less'

// --- 静态筛选配置 ---
const CATEGORIES = ['全部分类', '滑板', '派对', '汽车', '纹身', '体育运动', '活动', '露营', '酒吧/场地', '篮球']
const AREA_LEVEL1 = [{ key: 'dist', name: '距离' }, { key: 'region', name: '行政区/商圈' }]
const AREA_LEVEL2 = ['不限', '热门商圈', '高新区', '锦江区']
const AREA_LEVEL3 = ['春熙路', '宽窄巷子', '兰桂坊', '铁像寺', 'SKP', '玉林', '望平街']
const MORE_TAGS = ['积分立减', '买单立减', '新人优惠']

interface PartyItem {
  id: string
  title: string
  type: string
  location: string
  distance: string
  price: string
  lat: number
  lng: number
  tags: string[]
  tag: string
  user: string
  userAvatar: string
  fans: string
  isVerified: boolean
  time: string
  dynamicCount: number
  attendees: number
  isFull: boolean
  rank: string
  image: string
  isLiked: boolean
  isAttending: boolean
}


export default function IndexPage() {
  const [current, setCurrent] = useState(0)
  const [markers, setMarkers] = useState<any[]>([])
  const [partyList, setPartyList] = useState<PartyItem[]>([])
  
  // 筛选状态
  const [filterOpen, setFilterOpen] = useState<'none' | 'all' | 'area' | 'more'>('none')
  
  // 筛选选中项
  const [selectedCategory, setSelectedCategory] = useState('全部分类')
  const [areaL1, setAreaL1] = useState('region')
  const [areaL2, setAreaL2] = useState('热门商圈')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedTags] = useState<string[]>([])

  // 布局状态
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [initialCenter, setInitialCenter] = useState({ lng: 104.066, lat: 30.657 })
  const mapCtx = useRef<any>(null)

  Taro.useDidShow(() => { setTabBarIndex(0) })

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const calculatedNavHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(Number.isNaN(calculatedNavHeight) ? 44 : calculatedNavHeight)

    mapCtx.current = Taro.createMapContext('myMap')
  }, [])

  useEffect(() => {
    const fetchPartyList = async () => {
      try {
        const res = await request({
          url: '/api/v1/party/list',
          method: 'GET',
        })
        const list = res?.data?.data?.list || []
        setPartyList(list)
        if (list.length > 0) {
          setCurrent(0)
          setInitialCenter({ lng: list[0].lng, lat: list[0].lat })
          updateMarkers(list, 0)
        } else {
          setMarkers([])
        }
      } catch (error) {
        console.error('Party list load failed:', error)
      }
    }

    fetchPartyList()
  }, [])

  const updateMarkers = (list: PartyItem[], activeIndex: number) => {
    const newMarkers = list.map((item, index) => ({
      id: item.id,
      latitude: item.lat,
      longitude: item.lng,
      width: index === activeIndex ? 50 : 32,
      height: index === activeIndex ? 50 : 32,
      iconPath: require('../../assets/icons/map-pin.svg'),
      zIndex: index === activeIndex ? 999 : 1,
      callout: {
        content: ` ${item.title} `,
        display: index === activeIndex ? 'ALWAYS' : 'BYCLICK',
        padding: 12,
        borderRadius: 30,
        bgColor: '#333333',
        color: '#ffffff',
        fontSize: 12,
        textAlign: 'center'
      }
    }))
    setMarkers(newMarkers)
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
    updateMarkers(partyList, index)
  }

  const handleLocate = () => {
    if (mapCtx.current) mapCtx.current.moveToLocation()
  }

  const navigateTo = (path: string) => Taro.navigateTo({ url: path })

  // 样式计算
  const topHeaderStyle = { top: `${statusBarHeight}px`, height: `${navBarHeight}px` }
  const filterContainerStyle = { top: `${statusBarHeight + navBarHeight + 10}px` }

  const toggleFilter = (type: 'all' | 'area' | 'more') => {
    setFilterOpen(filterOpen === type ? 'none' : type)
  }

  // 判断高亮
  const isHighlight = (type: string) => {
    if (type === 'all') return selectedCategory !== '全部分类'
    if (type === 'area') return selectedRegion !== ''
    if (type === 'more') return selectedTags.length > 0
    return false
  }

  // 渲染下拉内容 (根据 filterOpen 渲染不同内容)
  const renderDropdownContent = () => {
    if (filterOpen === 'none') return null

    return (
      <View className='dropdown-content'>
        {/* 1. 全部 - 单列列表 */}
        {filterOpen === 'all' && (
          <ScrollView scrollY className='list-scroll'>
            {CATEGORIES.map(cat => (
              <View 
                key={cat} 
                className={`list-item ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat); setFilterOpen('none'); }}
              >
                <Text>{cat}</Text>
                {selectedCategory === cat && <AtIcon value='check' size='16' color='#FF2E4D' />}
              </View>
            ))}
          </ScrollView>
        )}

        {/* 2. 区域 - 三级联动 (仿链家/贝壳风格) */}
        {filterOpen === 'area' && (
          <View className='split-view'>
            {/* 一级：距离/商圈 */}
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
            {/* 二级：具体商圈分类 */}
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
            {/* 三级：具体地点 */}
            <ScrollView scrollY className='col col-3'>
              {AREA_LEVEL3.map(item => (
                <View 
                  key={item} 
                  className={`item ${selectedRegion === item ? 'active' : ''}`}
                  onClick={() => { setSelectedRegion(item); setFilterOpen('none'); }}
                >
                  {item}
                  {selectedRegion === item && <AtIcon value='check' size='14' color='#FF2E4D' />}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 3. 更多筛选 - 标签 */}
        {filterOpen === 'more' && (
          <View className='more-view'>
            <Text className='label'>优惠</Text>
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
      <Map
        id='myMap'
        className='map-bg'
        longitude={initialCenter.lng}
        latitude={initialCenter.lat}
        scale={13}
        markers={markers}
        showLocation
        setting={{ enableSatellite: false, enableTraffic: false }}
        onError={(e) => {
          console.error('Map error:', e)
        }}
      />

      {/* 遮罩层 (放在地图之上，筛选器之下) */}
      {filterOpen !== 'none' && (
        <View className='mask-layer' onClick={() => setFilterOpen('none')} />
      )}

      {/* Header */}
      <View className='custom-header' style={topHeaderStyle}>
        <View className='left-area'>
          <Text className='city-text'>成都</Text>
          <AtIcon value='chevron-right' size='16' color='#fff' />
          <View className='search-icon-btn' onClick={() => navigateTo('/pages/search/index')}>
            <AtIcon value='search' size='22' color='#fff' />
          </View>
        </View>
        <View className='center-logo-container'>
           <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='logo-img' />
        </View>
      </View>

      {/* 核心修改：一体化筛选容器 */}
      <View 
        className={`filter-container-wrapper ${filterOpen !== 'none' ? 'is-open' : ''}`} 
        style={filterContainerStyle}
      >
        {/* 上部：筛选按钮条 (白色圆角背景) */}
        <View className='filter-bar-header'>
          {/* 灰色胶囊 1 */}
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

          {/* 灰色胶囊 2 */}
          <View 
            className={`capsule-item ${filterOpen === 'area' ? 'highlight-bg' : ''}`} 
            onClick={() => toggleFilter('area')}
          >
            <Text className={isHighlight('area') || filterOpen === 'area' ? 'highlight-text' : ''}>区域</Text>
            <View
              className={`triangle-icon ${isHighlight('area') || filterOpen === 'area' ? 'active' : ''} ${filterOpen === 'area' ? 'up' : 'down'}`}
            />
          </View>

          {/* 灰色胶囊 3 */}
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

        {/* 下部：展开的内容 (直接衔接在 Header 下方) */}
        {renderDropdownContent()}
      </View>

      {/* 右侧悬浮按钮组 */}
      <View className='floating-group'>
        <View className='circle-btn locate-btn' onClick={handleLocate}>
          <Image className='map-pin' src={require('../../assets/icons/map-pin.svg')} mode='aspectFit' />
        </View>
        <View className='capsule-btn list-btn' onClick={() => navigateTo('/pages/activity-list/index')}>
          <AtIcon value='list' size='16' color='#fff'/>
          <Text className='txt'>查看列表</Text>
        </View>
      </View>

      {/* 底部卡片 Swiper (保持不变) */}
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
                onClick={() => navigateTo(`/pages/activity/index?id=${item.id}`)}
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
                      <View className='avatars'>
                         <View className='av' style={{zIndex:3}} />
                         <View className='av' style={{zIndex:2, left: '14px'}} />
                         <View className='av' style={{zIndex:1, left: '28px'}} />
                      </View>
                      <View className='count-info'>
                        <Text className='num-italic'>{item.attendees}</Text>
                        <Text className='label'>人报名</Text>
                      </View>
                   </View>
                </View>

                <View className='card-body'>
                   <View className='title-row'>
                      <Text className='title'>{item.title}</Text>
                      <Text className='type-tag'>{item.type}</Text>
                   </View>
                   <View className='info-row'>
                      <AtIcon value='clock' size='14' color='#999' />
                      <Text className='info-txt'>{item.time}</Text>
                      <Text className='info-txt gap'>|</Text>
                      <Text className='info-txt'>{item.dynamicCount}条动态</Text>
                      <Text className='price'>¥{item.price}/人</Text>
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
                               {item.isVerified && <AtIcon value='check-circle' size='12' color='#007AFF' />}
                            </View>
                            <Text className='fans'>{item.fans} 粉丝</Text>
                         </View>
                      </View>
                      <View className='action-btns'>
                         <View className='card-action-btn outline'>关注</View>
                         <View className='card-action-btn primary'>订阅活动</View>
                      </View>
                   </View>
                </View>
              </View>
            </SwiperItem>
          ))}
        </Swiper>
      </View>
    </View>
  )
}
