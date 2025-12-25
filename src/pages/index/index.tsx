import { View, Text, Map, Swiper, SwiperItem } from '@tarojs/components'
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
    title: 'Power Flow嘻哈与电子音乐结合',
    location: '东南大街段上乘街道',
    distance: '6.10km',
    price: '65',
    lat: 30.657,
    lng: 104.066,
    tags: ['HipHop', '电子', '早鸟票'],
    user: 'PURE LOOP',
    fans: '5234',
    image: '' // 实际开发请填入图片URL
  },
  {
    id: 2,
    title: '疯狂派对：午夜狂欢',
    location: '建设路主要路口',
    distance: '2.5km',
    price: '88',
    lat: 30.670,
    lng: 104.070,
    tags: ['EDM', '派对'],
    user: 'CRAZY CLUB',
    fans: '1200',
    image: ''
  },
  {
    id: 3,
    title: '复古迪斯科之夜',
    location: '九眼桥酒吧街',
    distance: '4.2km',
    price: '120',
    lat: 30.645,
    lng: 104.080,
    tags: ['Disco', '复古'],
    user: 'RETRO VIBE',
    fans: '3300',
    image: ''
  }
]

export default function IndexPage() {
  const [current, setCurrent] = useState(0)
  const [markers, setMarkers] = useState<any[]>([])
  const [filterOpen, setFilterOpen] = useState<'none' | 'all' | 'area' | 'more'>('none')
  const mapCtx = useRef<any>(null)

  Taro.useDidShow(() => {
    setTabBarIndex(0)
  })

  useEffect(() => {
    // 初始化地图上下文
    mapCtx.current = Taro.createMapContext('myMap')
    updateMarkers(0)
  }, [])

  // 更新 Markers，高亮当前选中的
  const updateMarkers = (activeIndex: number) => {
    const newMarkers = PARTY_DATA.map((item, index) => ({
      id: item.id,
      latitude: item.lat,
      longitude: item.lng,
      width: index === activeIndex ? 40 : 24, // 选中变大
      height: index === activeIndex ? 40 : 24,
      iconPath: index === activeIndex 
        ? 'https://cdn-icons-png.flaticon.com/512/684/684908.png' // 红色大图标 (模拟)
        : 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // 橙色小图标
      // 真实项目中建议使用不同颜色的图标图片
      callout: {
        content: item.title,
        display: index === activeIndex ? 'ALWAYS' : 'BYCLICK',
        padding: 8,
        borderRadius: 4,
        bgColor: '#ffffff',
        color: '#000000'
      }
    }))
    setMarkers(newMarkers)
  }

  // 卡片滑动处理
  const handleSwiperChange = (e: any) => {
    const index = e.detail.current
    setCurrent(index)
    updateMarkers(index)

    // 地图中心聚焦到当前 Party
    const target = PARTY_DATA[index]
    if (mapCtx.current) {
      mapCtx.current.moveToLocation({
        longitude: target.lng,
        latitude: target.lat,
      })
    }
  }

  // 点击定位回用户位置
  const handleLocate = () => {
    if (mapCtx.current) {
      mapCtx.current.moveToLocation()
    }
  }

  // 导航跳转
  const navigateTo = (path: string) => Taro.navigateTo({ url: path })

  // 渲染筛选下拉层
  const renderFilterModal = () => {
    if (filterOpen === 'none') return null
    return (
      <View className='filter-modal' onClick={() => setFilterOpen('none')}>
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
                <View className='section'>
                  <Text className='label'>时段</Text>
                  <View className='time-tags'>
                    <View className='time-tag'>上午</View>
                    <View className='time-tag'>下午</View>
                    <View className='time-tag active'>晚上</View>
                  </View>
                </View>
             </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className='index-page-map'>
      {/* 地图层 */}
      <Map
        id='myMap'
        className='map-bg'
        longitude={104.066}
        latitude={30.657}
        scale={13}
        markers={markers}
        showLocation
        // 关键：Taro 中配置深色地图通常需要 subkey 和 layer-style
        // subkey="YOUR_QQ_MAP_KEY"
        // layer-style="1" // 腾讯地图样式 1通常是深色
        setting={{
          enableSatellite: false,
          enableTraffic: false,
        }}
      />

      {/* 顶部搜索栏 */}
      <View className='top-bar'>
        <View className='location-text'>成都市</View>
        <View className='search-pill'>
          <View className='pill-btn' onClick={() => navigateTo('/pages/search/index')}>
             <AtIcon value='search' size='14' color='#333'/>
             <Text>搜索</Text>
          </View>
          <View className='line' />
          <View className='pill-btn' onClick={() => navigateTo('/pages/my-tickets/index')}>
             <AtIcon value='qr-code' size='14' color='#333'/>
             <Text>二维码</Text>
          </View>
        </View>
      </View>

      {/* 筛选栏 */}
      <View className='filter-bar'>
        <View className='filter-btn' onClick={() => setFilterOpen(filterOpen === 'all' ? 'none' : 'all')}>
          全部 <AtIcon value='chevron-down' size='10' color='#333'/>
        </View>
        <View className='filter-btn' onClick={() => setFilterOpen(filterOpen === 'area' ? 'none' : 'area')}>
          区域 <AtIcon value='chevron-down' size='10' color='#333'/>
        </View>
        <View className='filter-btn' onClick={() => setFilterOpen(filterOpen === 'more' ? 'none' : 'more')}>
          更多筛选 <AtIcon value='chevron-down' size='10' color='#333'/>
        </View>
      </View>

      {/* 筛选弹窗 */}
      {renderFilterModal()}

      {/* 右侧悬浮按钮 */}
      <View className='floating-controls'>
        <View className='float-btn' onClick={handleLocate}>
          <AtIcon value='map-pin' size='20' color='#333'/>
          {/* <Text className='btn-txt'>定位</Text> */}
        </View>
        <View className='float-btn list-btn' onClick={() => navigateTo('/pages/activity-list/index')}>
          <AtIcon value='list' size='18' color='#333'/>
          <Text className='btn-txt'>查看列表</Text>
        </View>
      </View>

      {/* 底部 Swiper 卡片 */}
      <View className='bottom-swiper-container'>
        <Swiper
          className='party-swiper'
          current={current}
          onChange={handleSwiperChange}
          previousMargin='24px'
          nextMargin='24px'
          circular
        >
          {PARTY_DATA.map((item) => (
            <SwiperItem key={item.id} className='party-item'>
              <View 
                className={`card-content ${item.image ? '' : 'no-img'}`}
                onClick={() => navigateTo(`/pages/activity-detail/index?id=${item.id}`)}
              >
                {/* 模拟图片占位 */}
                <View className='card-bg' /> 
                
                <View className='card-info'>
                   <View className='price-tag'>
                      <Text className='symbol'>¥</Text>
                      <Text className='val'>{item.price}</Text>
                      <Text className='sub'>起</Text>
                      <Text className='dist'>{item.distance}</Text>
                   </View>
                   
                   <Text className='card-title'>{item.title}</Text>
                   
                   <View className='tags'>
                      {item.tags.map(t => <View key={t} className='tag'>{t}</View>)}
                   </View>
                   
                   <View className='user-row'>
                      <View className='avatar' />
                      <View className='user-meta'>
                        <Text className='name'>{item.user}</Text>
                        <Text className='fans'>{item.fans}粉丝</Text>
                      </View>
                      <View className='btns'>
                         <View className='mini-btn'>订阅</View>
                         <View className='mini-btn'>路线</View>
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