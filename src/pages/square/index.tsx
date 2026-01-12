import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

// ... (DEFAULT_CHANNELS, RECOMMEND_CHANNELS, POSTS 数据保持不变，省略) ...
const DEFAULT_CHANNELS = ['关注', '推荐', '同城', '滑板', '骑行', '派对', '纹身', '改装车', '露营', '篮球', '足球', '飞盘']
const RECOMMEND_CHANNELS = ['潮鞋', '电子竞技', '健身', '艺术', '场地', '乐队', '音乐节', '化妆']

const POSTS = [
  { id: 1, type: 'video', cover: 'https://cdn.pixabay.com/photo/2023/08/25/07/37/woman-8212392_1280.jpg', title: 'INS风格落地 | 小小的心去旅行', user: 'ORANGE', avatar: '', likes: 16, time: '7小时前', desc: '终于，他变得温柔，在生命面前，任何工作都是值得被尊敬的。' },
  { id: 2, type: 'image', cover: 'https://cdn.pixabay.com/photo/2023/05/29/18/35/girl-8026779_1280.jpg', title: '这颜值还是可以的吧！', user: '小蝴蝶不谈恋爱', avatar: '', likes: 4207, time: '昨天', desc: '今天天气真好，出来炸街啦！' },
  { id: 3, type: 'image', cover: 'https://cdn.pixabay.com/photo/2023/11/09/19/36/zoo-8378189_1280.jpg', title: '周末去哪儿玩', user: 'Traveler', avatar: '', likes: 88, time: '2天前', desc: '探索城市边缘的秘境。' },
  { id: 4, type: 'image', cover: 'https://cdn.pixabay.com/photo/2023/10/24/16/09/bicycles-8338435_1280.jpg', title: '骑行日记 Vol.1', user: 'BikeLover', avatar: '', likes: 120, time: '3天前', desc: '风一般的自由。' },
]

export default function SquarePage() {
  const [activeTab, setActiveTab] = useState('推荐')
  const [myChannels, setMyChannels] = useState(DEFAULT_CHANNELS)
  const [isChannelEditOpen, setIsChannelEditOpen] = useState(false)
  
  const [leftCol, setLeftCol] = useState<typeof POSTS>([])
  const [rightCol, setRightCol] = useState<typeof POSTS>([])

  // 布局适配状态
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0) 
  const TAB_HEIGHT = 44 

  useEffect(() => {
    setTabBarIndex(1)
    
    // 1. 布局适配计算
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    
    // 计算导航栏高度
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)

    // 2. 初始化瀑布流
    const left: typeof POSTS = []
    const right: typeof POSTS = []
    POSTS.forEach((item, i) => {
      if (i % 2 === 0) left.push(item)
      else right.push(item)
    })
    setLeftCol(left)
    setRightCol(right)
  }, [])

  Taro.useDidShow(() => { setTabBarIndex(1) })

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    setIsChannelEditOpen(false)
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/square/post-detail/index?id=${id}` })
  }

  // ... (renderSingleFlow, renderWaterfallFlow, WaterfallCard 保持不变，省略以节省空间) ...
  const renderSingleFlow = () => (
      <View className='single-flow-list'>
        {POSTS.map(item => (
          <View key={item.id} className='insta-card' onClick={() => goDetail(item.id)}>
            <View className='card-header'>
              <View className='user-info'>
                <View className='avatar' />
                <Text className='name'>{item.user}</Text>
                <Text className='time'>{item.time}</Text>
              </View>
              <AtIcon value='menu' size='20' color='#fff' />
            </View>
            <View className='media-wrap'>
               <Image src={item.cover} mode='aspectFill' className='media-img' />
            </View>
            <View className='action-bar'>
               <View className='left-actions'>
                  <AtIcon value='heart' size='24' color='#fff' />
                  <AtIcon value='message' size='24' color='#fff' className='ml-3' />
                  <AtIcon value='share' size='24' color='#fff' className='ml-3' />
               </View>
            </View>
            <View className='text-content'>
               <Text className='title'>{item.title}</Text>
               <Text className='desc'>{item.desc}</Text>
            </View>
          </View>
        ))}
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
      </View>
  )

  const WaterfallCard = ({ item, onClick }: { item: any, onClick: () => void }) => (
    <View className='waterfall-card' onClick={onClick}>
      <Image src={item.cover} mode='widthFix' className='cover' />
      <View className='info'>
        <Text className='title'>{item.title}</Text>
        <View className='bottom'>
           <View className='user'>
              <View className='avatar-mini' />
              <Text className='name'>{item.user}</Text>
           </View>
           <View className='likes'>
              <AtIcon value='heart' size='12' color='#999' />
              <Text className='num'>{item.likes}</Text>
           </View>
        </View>
      </View>
    </View>
  )

  const renderChannelEdit = () => {
    if (!isChannelEditOpen) return null
    const topPos = statusBarHeight + navBarHeight + TAB_HEIGHT
    return (
      <View className='channel-edit-overlay' style={{ top: `${topPos}px` }}>
         <View className='channel-header'>
            <Text className='title'>我的频道</Text>
            <View className='actions'>
               <View className='btn-finish' onClick={() => setIsChannelEditOpen(false)}>完成</View>
               <View className='btn-close' onClick={() => setIsChannelEditOpen(false)}>收起</View>
            </View>
         </View>
         <View className='channel-grid'>
            {myChannels.map(ch => (
               <View key={ch} className='channel-chip active'>
                  <Text>{ch}</Text>
                  <View className='del-icon'>×</View>
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

  const totalHeaderHeight = statusBarHeight + navBarHeight + TAB_HEIGHT

  return (
    <View className='square-page'>
      
      {/* --- 固定头部区域 (Navbar + Tabs) --- */}
      <View className='fixed-header-wrapper'>
        {/* 1. 顶部导航 (Flex Column 布局) */}
        <View className='top-nav' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
           
           {/* 状态栏占位 (必须有高度) */}
           <View className='status-bar-placeholder' style={{ height: `${statusBarHeight}px` }} />

           {/* 导航内容区 */}
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
              
              {/* Logo 绝对居中于 nav-content */}
              <View className='logo-container'>
                 <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='logo' />
              </View>
           </View>
        </View>

        {/* 2. 频道 Tab 栏 */}
        <View className='channel-tabs-row' style={{ height: `${TAB_HEIGHT}px` }}>
          <ScrollView 
            scrollX 
            className='channel-scroll-view' 
            scrollIntoView={`tab-${activeTab}`}
            showScrollbar={false}
            enableFlex 
          >
             <View className='tab-container'>
                {myChannels.map(tab => (
                    <View 
                      key={tab} 
                      id={`tab-${tab}`}
                      className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => handleTabClick(tab)}
                    >
                       <Text className='tab-text'>{tab}</Text>
                       {activeTab === tab && <View className='indicator' />}
                    </View>
                ))}
                <View style={{ width: '20px' }}></View>
             </View>
          </ScrollView>
          
          <View className='expand-btn-side' onClick={() => setIsChannelEditOpen(!isChannelEditOpen)}>
             <View className='gradient-mask' />
             <View className='btn-content'>
                 <Text className='expand-text'>展开</Text>
             </View>
          </View>
        </View>
      </View>

      {/* --- 频道编辑浮层 --- */}
      {renderChannelEdit()}

      {/* --- 内容区域 --- */}
      <ScrollView 
        scrollY 
        className='content-scroll' 
        style={{ paddingTop: `${totalHeaderHeight}px` }}
      >
         {activeTab === '关注' ? renderSingleFlow() : renderWaterfallFlow()}
         <View style={{height: '120px'}} />
      </ScrollView>
    </View>
  )
}