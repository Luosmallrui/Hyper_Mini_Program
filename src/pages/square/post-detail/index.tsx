import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import './index.scss'

export default function PostDetailPage() {
  
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className='detail-page'>
      {/* 自定义顶部导航 */}
      <View className='custom-nav' style={{paddingTop: '60px'}}>
        <View className='back-btn' onClick={handleBack}>
           <AtIcon value='chevron-left' size='24' color='#333' />
        </View>
        <View className='user-mini'>
           <View className='avatar' />
           <Text className='name'>KFJJD</Text>
        </View>
        <View className='nav-actions'>
           <View className='btn-pill'>关注</View>
           <View className='btn-pill'>分享</View>
        </View>
      </View>

      <ScrollView scrollY className='content-scroll'>
        {/* 图片轮播区 (简化为单图) */}
        <View className='hero-image-area'>
           {/* 模拟白色空白占位 */}
        </View>

        {/* 文本内容 */}
        <View className='article-body'>
           <Text className='title'>最好玩的派对现场，Techno玩家福音</Text>
           <Text className='content'>本期活动电子音乐艺术家的系列SET正式；来到成都</Text>
           <Text className='date'>12-05</Text>
        </View>
        
        <View style={{height: '100px'}}></View>
      </ScrollView>

      {/* 底部互动栏 */}
      <View className='bottom-action-bar'>
        <View className='comment-input'>
           <Text>评论</Text>
        </View>
        
        <View className='action-icons'>
           <View className='icon-item'>
              <View className='circle-bg'><AtIcon value='heart' size='18' color='#999'/></View>
              <Text>喜欢</Text>
           </View>
           <View className='icon-item'>
              <View className='circle-bg'><AtIcon value='star' size='18' color='#999'/></View>
              <Text>收藏</Text>
           </View>
           <View className='icon-item'>
              <View className='circle-bg'><AtIcon value='message' size='18' color='#999'/></View>
              <Text>评论</Text>
           </View>
        </View>
      </View>
    </View>
  )
}