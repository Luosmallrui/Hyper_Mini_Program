import { View, Text, Map, Swiper, SwiperItem, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/slider.scss'
import { setTabBarIndex } from '../../store/tabbar'
import './index.less'

// --- 静态数据配置 ---
const CATEGORIES = ['全部分类', '滑板', '派对', '汽车', '纹身', '体育运动', '活动', '露营', '酒吧/场地', '篮球']
const AREA_LEVEL1 = [{ key: 'dist', name: '距离' }, { key: 'region', name: '行政区/商圈' }]
const AREA_LEVEL2 = ['不限', '热门商圈', '高新区', '锦江区'] // 模拟二级
const AREA_LEVEL3 = ['春熙路', '宽窄巷子', '兰桂坊', '铁像寺', 'SKP', '玉林', '望平街'] // 模拟三级
const MORE_TAGS = ['积分立减', '买单立减', '新人优惠']

// 模拟 Party 数据
const PARTY_DATA = [
  {
    id: 1,
    title: 'POWER FLOW 嘻哈与电子音乐结合',
    type: '派对活动',
    location: '东南大街段上乘街道',
    distance: '6.10km',
    price: '76',
    lat: 30.657,
    lng: 104.066,
    tags: ['HipHop', '电子', '早鸟票'],
    user: 'Pure Loop',
    userAvatar: '', 
    fans: '5245',
    isVerified: true,
    time: '2025·12·31',
    dynamicCount: 372,
    attendees: 9932,
    rank: '派对热度榜No.1',
    image: '' 
  },
  {
    id: 2,
    title: '疯狂派对：午夜狂欢',
    type: '夜店演出',
    location: '建设路主要路口',
    distance: '2.5km',
    price: '88',
    lat: 30.670,
    lng: 104.070,
    tags: ['EDM', '派对'],
    user: 'CRAZY CLUB',
    userAvatar: '',
    fans: '1200',
    isVerified: true,
    time: '2025·12·30',
    dynamicCount: 128,
    attendees: 450,
    rank: '',
    image: ''
  },
  {
    id: 3,
    title: '复古迪斯科之夜',
    type: '复古派对',
    location: '九眼桥酒吧街',
    distance: '4.2km',
    price: '120',
    lat: 30.645,
    lng: 104.080,
    tags: ['Disco', '复古'],
    user: 'RETRO VIBE',
    userAvatar: '',
    fans: '3300',
    isVerified: false,
    time: '2026·01·01',
    dynamicCount: 56,
    attendees: 2100,
    rank: '复古榜No.1',
    image: ''
  }
]

export default function IndexPage() {
  const [current, setCurrent] = useState(0)
  const [markers, setMarkers] = useState<any[]>([])
  
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
  const [initialCenter] = useState({ lng: PARTY_DATA[0].lng, lat: PARTY_DATA[0].lat })
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
    updateMarkers(0)
  }, [])

  const updateMarkers = (activeIndex: number) => {
    const newMarkers = PARTY_DATA.map((item, index) => ({
      id: item.id,
      latitude: item.lat,
      longitude: item.lng,
      width: index === activeIndex ? 50 : 32,
      height: index === activeIndex ? 50 : 32,
      iconPath: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', 
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
    const target = PARTY_DATA[index]
    if (mapCtx.current) {
      mapCtx.current.moveToLocation({
        longitude: target.lng,
        latitude: target.lat,
      })
    }
    updateMarkers(index)
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
            <AtIcon 
              value={filterOpen === 'all' ? 'chevron-up' : 'chevron-down'} 
              size='10' 
              color={isHighlight('all') || filterOpen === 'all' ? '#FF2E4D' : '#666'}
            />
          </View>

          {/* 灰色胶囊 2 */}
          <View 
            className={`capsule-item ${filterOpen === 'area' ? 'highlight-bg' : ''}`} 
            onClick={() => toggleFilter('area')}
          >
            <Text className={isHighlight('area') || filterOpen === 'area' ? 'highlight-text' : ''}>区域</Text>
            <AtIcon 
              value={filterOpen === 'area' ? 'chevron-up' : 'chevron-down'} 
              size='10' 
              color={isHighlight('area') || filterOpen === 'area' ? '#FF2E4D' : '#666'}
            />
          </View>

          {/* 灰色胶囊 3 */}
          <View 
            className={`capsule-item ${filterOpen === 'more' ? 'highlight-bg' : ''}`} 
            onClick={() => toggleFilter('more')}
          >
            <Text className={isHighlight('more') || filterOpen === 'more' ? 'highlight-text' : ''}>更多筛选</Text>
            <AtIcon 
              value={filterOpen === 'more' ? 'chevron-up' : 'chevron-down'} 
              size='10' 
              color={isHighlight('more') || filterOpen === 'more' ? '#FF2E4D' : '#666'}
            />
          </View>
        </View>

        {/* 下部：展开的内容 (直接衔接在 Header 下方) */}
        {renderDropdownContent()}
      </View>

      {/* 右侧悬浮按钮组 */}
      <View className='floating-group'>
        <View className='circle-btn locate-btn' onClick={handleLocate}>
          <AtIcon value='map-pin' size='20' color='#333'/>
        </View>
        <View className='capsule-btn list-btn' onClick={() => navigateTo('/pages/activity-list/index')}>
          <AtIcon value='list' size='16' color='#333'/>
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
          circular
        >
          {PARTY_DATA.map((item) => (
            <SwiperItem key={item.id} className='card-item-wrapper'>
              <View 
                className='party-card-pro'
                onClick={() => navigateTo(`/pages/activity/index?id=${item.id}`)}
              >
                <View className='card-header-bg'>
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
                         <View className='avatar' />
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
