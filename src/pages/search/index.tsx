import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  // 状态栏高度适配
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    
    // 计算自定义导航栏的内容高度 (胶囊顶部 - 状态栏高度) * 2 + 胶囊高度
    // 这种算法能确保内容区与胶囊按钮完全垂直居中对齐
    const contentHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(contentHeight > 0 ? contentHeight : 44)
  }, [])

  const handleBack = () => {
    Taro.navigateBack()
  }

  // 模拟数据
  const subscriptions = [
    { id: 1, name: 'Pure Loop', avatar: '', color: '#1E1E2E' }, 
    { id: 2, name: 'HYPER', avatar: '', color: '#2C2C2E' },
    { id: 3, name: 'GREEN CONNER', avatar: '', color: '#00C853' },
  ]

  const historyTags = ['HYPER', 'PURE LOOP', 'GREEN CONNER']

  return (
    <View className='search-page-dark'>
      {/* 1. 自定义顶部导航栏 */}
      {/* 修改点：这里改为 top 定位，与 Index 页保持一致的对齐逻辑 */}
      <View 
        className='custom-navbar' 
        style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px` }}
      >
        <View className='nav-left' onClick={handleBack}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        
        <View className='nav-center'>
          {/* Logo 图片 */}
          <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='nav-logo' />
        </View>
        
        {/* 右侧占位，宽度与左侧一致，确保 Logo 视觉居中 */}
        <View className='nav-right' /> 
      </View>

      {/* 占位块：高度 = 状态栏高度 + 导航栏内容高度 */}
      {/* 防止内容被 fixed 的导航栏遮挡 */}
      <View style={{ height: `${statusBarHeight + navBarHeight}px` }} />

      <ScrollView scrollY className='search-content'>
        {/* 2. 搜索框 */}
        <View className='search-bar-wrapper'>
          <View className='search-input-box'>
            <AtIcon value='search' size='18' color='#999' />
            <Input 
              className='search-input' 
              placeholder='搜索商家、俱乐部、活动名称、主办方等' 
              placeholderClass='ph-dark'
              value={keyword}
              onInput={e => setKeyword(e.detail.value)}
              confirmType='search'
            />
          </View>
        </View>

        {/* 3. 我的订阅 */}
        <View className='section-block'>
          <Text className='section-title'>我的订阅</Text>
          <View className='subscription-list'>
            {subscriptions.map(sub => (
              <View key={sub.id} className='sub-item'>
                <View className='avatar-circle' style={{ backgroundColor: sub.color }}>
                  <View className='mock-logo-text'>logo</View>
                </View>
                <Text className='sub-name'>{sub.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. 历史搜索 */}
        <View className='section-block'>
          <View className='title-row'>
            <Text className='section-title'>历史搜索</Text>
            <View className='trash-btn' onClick={() => Taro.showToast({title: '清除历史', icon: 'none'})}>
              <AtIcon value='trash' size='16' color='#666' />
            </View>
          </View>
          <View className='history-tags'>
            {historyTags.map((tag, index) => (
              <View key={index} className='tag-pill'>
                {tag}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}