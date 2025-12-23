import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { AtIcon } from 'taro-ui'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

export default function SquarePage() {
  
  Taro.useDidShow(() => {
    setTabBarIndex(1)
  })

  const [activeTab, setActiveTab] = useState(1) // 0:成都, 1:推荐, 2:关注
  const [activeSubTab, setActiveSubTab] = useState(0) // 子标签索引

  const subTabs = ['发现', '音乐', '骑行', '滑板', '纹身', '汽车', '露营', '派对']

  // 模拟帖子数据
  const posts = [
    { id: 1, title: '开M3上街 深圳港的烟火日常', user: '盆栽阿珍', likes: 2324, image: '', height: 240 },
    { id: 2, title: 'KMOJD 中国巡演', user: '戴高帽', likes: 2324, image: '', height: 300 },
    { id: 3, title: '更适合中国宝宝体质的音乐节', user: '越电音', likes: 2324, image: '', height: 280 },
    { id: 4, title: '就这样被喷了一身', user: 'BUNNYH', likes: 2324, image: '', height: 260 },
    { id: 5, title: '周末去哪儿玩？', user: '成都土著', likes: 128, image: '', height: 220 },
    { id: 6, title: 'TechNo 永远的神', user: 'Raver', likes: 999, image: '', height: 320 },
  ]

  // 跳转详情
  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/square/post-detail/index?id=${id}` })
  }

  // 点击发布按钮 - 弹出ActionSheet
  const handlePublishClick = () => {
    Taro.showActionSheet({
      itemList: ['从相册选择', '相机'],
      success: () => {
        // 无论选哪个，演示都跳转到发布页
        Taro.navigateTo({ url: '/pages/square/post-create/index' })
      },
      fail: (res) => {
        console.log(res.errMsg)
      }
    })
  }

  return (
    <View className='square-page'>
      {/* 顶部主导航 */}
      <View className='header-tabs'>
        <View className={`tab-item ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>成都</View>
        <View className={`tab-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>推荐</View>
        <View className={`tab-item ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>关注</View>
      </View>

      {/* 子标签滚动区 */}
      <ScrollView scrollX className='sub-tabs-scroll' enableFlex>
        {subTabs.map((item, index) => (
          <View 
            key={index} 
            className={`sub-tab-pill ${activeSubTab === index ? 'active' : ''}`}
            onClick={() => setActiveSubTab(index)}
          >
            {item}
          </View>
        ))}
        <View className='sub-tab-expand'>
           <Text>展开</Text>
        </View>
      </ScrollView>

      {/* 瀑布流内容区 */}
      <ScrollView scrollY className='feed-container'>
        <View className='masonry-layout'>
          {posts.map((item) => (
            <View key={item.id} className='feed-card' onClick={() => goDetail(item.id)}>
              {/* 模拟不同高度的图片占位 */}
              <View className='card-image' style={{ height: `${item.height}rpx`, background: '#E5E7EB' }} />
              
              <View className='card-info'>
                <Text className='card-title'>{item.title}</Text>
                <View className='card-meta'>
                  <View className='user-box'>
                    <View className='avatar' />
                    <Text className='username'>{item.user}</Text>
                  </View>
                  <View className='like-box'>
                    <AtIcon value='heart' size='14' color='#999' />
                    <Text className='like-count'>{item.likes}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
        {/* 底部占位，防止被TabBar遮挡 */}
        <View className='bottom-spacer' />
      </ScrollView>

      {/* 悬浮发布按钮 */}
      <View className='fab-publish' onClick={handlePublishClick}>
        <Text>发布</Text>
      </View>
    </View>
  )
}