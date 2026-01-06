import { View, Text, Map, Swiper, SwiperItem, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon, AtSlider } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/slider.scss'
import { setTabBarIndex } from '../../store/tabbar'
import './index.less'

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
  const [filterOpen, setFilterOpen] = useState<'none' | 'all' | 'area' | 'more'>('none')
  
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [statusBarHeight, setStatusBarHeight] = useState(20)

  const [initialCenter] = useState({
    lng: PARTY_DATA[0].lng,
    lat: PARTY_DATA[0].lat
  })

  const mapCtx = useRef<any>(null)

  Taro.useDidShow(() => {
    setTabBarIndex(0)
  })

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
  const topHeaderStyle = {
    top: `${statusBarHeight}px`,
    height: `${navBarHeight}px`
  }
  
  const filterBarStyle = {
    top: `${statusBarHeight + navBarHeight + 10}px`
  }

  // 渲染筛选弹窗 (根据 filterOpen 渲染不同内容)
  const renderFilterModal = () => {
    if (filterOpen === 'none') return null
    return (
      <View className='filter-modal' onClick={() => setFilterOpen('none')} style={{ top: `${statusBarHeight + navBarHeight + 70}px` }}>
        <View className='filter-content' onClick={e => e.stopPropagation()}>
          {filterOpen === 'all' && (
            <View className='list-filter'>
              {['全部', '演出', '滑板', '骑行', '汽车', '派对'].map(tag => (
                <View key={tag} className='filter-item'>{tag}</View>
              ))}
            </View>
          )}
          {filterOpen === 'area' && (
             <View className='list-filter'>
                <View className='filter-group-title'>行政区</View>
                <View className='row-wrap'>
                  {['锦江区', '青羊区', '武侯区', '高新区'].map(item => <View key={item} className='tag-item'>{item}</View>)}
                </View>
             </View>
          )}
           {filterOpen === 'more' && (
             <View className='more-filter'>
                <View className='section'>
                  <Text className='label'>价格</Text>
                  <AtSlider value={50} min={0} max={500} activeColor='#333' backgroundColor='#eee' />
                </View>
             </View>
          )}
        </View>
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
      />

      {/* 1. 顶部 Header (修复居中) */}
      <View className='custom-header' style={topHeaderStyle}>
        {/* 左侧 */}
        <View className='left-area'>
          <Text className='city-text'>成都</Text>
          <AtIcon value='chevron-right' size='16' color='#fff' />
          <View className='search-icon-btn' onClick={() => navigateTo('/pages/search/index')}>
            <AtIcon value='search' size='22' color='#fff' />
          </View>
        </View>
        
        {/* 绝对居中 LOGO */}
        <View className='center-logo-container'>
           <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='logo-img' />
        </View>
        
        {/* 右侧空容器(用于占位避让胶囊) */}
        <View className='right-area-placeholder' />
      </View>

      {/* 2. 筛选栏 (单一白条) */}
      <View className='filter-bar-unified' style={filterBarStyle}>
        <View className='filter-item' onClick={() => setFilterOpen(filterOpen === 'all' ? 'none' : 'all')}>
          <Text>全部</Text>
          <AtIcon value='chevron-down' size='10' color='#333'/>
        </View>
        {/* 分割线 */}
        <View className='divider' /> 
        <View className='filter-item' onClick={() => setFilterOpen(filterOpen === 'area' ? 'none' : 'area')}>
          <Text>区域</Text>
          <AtIcon value='chevron-down' size='10' color='#333'/>
        </View>
        <View className='divider' />
        <View className='filter-item' onClick={() => setFilterOpen(filterOpen === 'more' ? 'none' : 'more')}>
          <Text>更多筛选</Text>
          <AtIcon value='chevron-down' size='10' color='#333'/>
        </View>
      </View>

      {renderFilterModal()}

      {/* 3. 右侧悬浮按钮组 */}
      <View className='floating-group'>
        <View className='circle-btn locate-btn' onClick={handleLocate}>
          <Image className='map-pin' src={require('../../assets/icons/map-pin.svg')} mode='heightFix' />
        </View>
        <View className='capsule-btn list-btn' onClick={() => navigateTo('/pages/activity-list/index')}>
          <AtIcon value='list' size='13' color='#000000'/>
          <Text className='txt'>查看列表</Text>
        </View>
      </View>

      {/* 4. 底部卡片 Swiper */}
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
                onClick={() => navigateTo(`/pages/activity-detail/index?id=${item.id}`)}
              >
                {/* 图片背景 Header */}
                <View className='card-header-bg'>
                   {item.rank && (
                     <View className='rank-badge'>
                        <AtIcon value='fire' size='12' color='#fff' />
                        <Text className='txt'>{item.rank}</Text>
                     </View>
                   )}
                   {/* 报名人数胶囊 */}
                   <View className='attendees-capsule'>
                      <View className='avatars'>
                         <View className='av' style={{zIndex:1}} />
                         <View className='av' style={{zIndex:2, left: '14px'}} />
                         <View className='av' style={{zIndex:3, left: '28px'}} />
                      </View>
                      <View className='count-info'>
                        <Text className='num-italic'>{item.attendees}</Text>
                        <Text className='label'>人报名</Text>
                      </View>
                   </View>
                </View>

                {/* 内容 Body */}
                <View className='card-body'>
                   <View className='title-row'>
                      <Text className='title'>{item.title}</Text>
                      <Text className='type-tag'>{item.type}</Text>
                   </View>
                   
                   <View className='info-row'>
                      <AtIcon value='clock' size='14' color='#999' />
                      <Text className='info-txt info-first'>{item.time}</Text>
                      <Text className='info-txt'>{item.dynamicCount}条动态</Text>
                      <Text className='info-txt'>¥{item.price}/人</Text>
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