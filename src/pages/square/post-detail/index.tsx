import { View, Text, Image, Swiper, SwiperItem, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

export default function PostDetailPage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [currentMedia, setCurrentMedia] = useState(0)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    setStatusBarHeight(sysInfo.statusBarHeight || 20)
  }, [])

  // 模拟媒体数据
  const mediaList = [
    { type: 'image', url: 'https://cdn.pixabay.com/photo/2023/10/24/16/09/bicycles-8338435_1280.jpg' },
    { type: 'image', url: 'https://cdn.pixabay.com/photo/2023/05/29/18/35/girl-8026779_1280.jpg' },
  ]

  // 模拟评论
  const comments = [
    { id: 1, user: '打本悍匪', content: '点赞，可以互关一下吗？👍', time: '昨天 23:26', likes: 16, avatar: '' },
    { id: 2, user: '熊大', content: '我的同事领导都超好，离职那天我哭惨了，走的很爽但是舍不得他们。', time: '昨天 23:26', likes: 16, avatar: '' },
    { id: 3, user: '社交暴徒', content: '害谁不是呢', time: '昨天 23:40', likes: 16, avatar: '' },
  ]

  return (
    <View className='post-detail-page'>
      {/* 顶部导航栏 (透明背景) */}
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px` }}>
         <View className='left' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
            <View className='user-mini'>
               <View className='avatar' />
               <Text className='name'>派对悍匪</Text>
            </View>
         </View>
         <View className='right'>
            <View className='follow-btn'>已关注</View>
            <AtIcon value='share' size='20' color='#fff' />
         </View>
      </View>

      <ScrollView scrollY className='detail-scroll'>
         {/* 1. 媒体轮播区 */}
         <Swiper 
           className='media-swiper' 
           indicatorDots 
           indicatorColor='rgba(255,255,255,0.3)' 
           indicatorActiveColor='#fff'
           onChange={(e) => setCurrentMedia(e.detail.current)}
         >
            {mediaList.map((item, idx) => (
               <SwiperItem key={idx}>
                  <Image src={item.url} mode='aspectFill' className='media-img' />
               </SwiperItem>
            ))}
         </Swiper>

         {/* 2. 文本内容区 */}
         <View className='content-body'>
            <Text className='post-title'>INS风格落地 | 小小的心去旅行</Text>
            <Text className='post-desc'>
               客服，他变得温柔，在生命面前，任何工作都是值得被尊敬的。在郊外拉琴，天空中回荡着优美的协奏曲，那着他重新焕发生命力的象征。
            </Text>
            <View className='tags'>
               <Text>#派对</Text> <Text>#PURELOOP</Text>
            </View>
            <Text className='post-time'>昨天 23:26 长春</Text>
         </View>

         <View className='divider' />

         {/* 3. 评论区 */}
         <View className='comment-section'>
            <Text className='comment-count'>共38条评论</Text>
            
            <View className='comment-input-fake'>
               <View className='avatar-mini' />
               <Text className='placeholder'>说些好听的，遇见有趣的</Text>
            </View>

            <View className='comment-list'>
               {comments.map(c => (
                  <View key={c.id} className='comment-item'>
                     <View className='c-avatar' />
                     <View className='c-content'>
                        <View className='c-header'>
                           <Text className='c-user'>{c.user}</Text>
                           {c.id === 1 && <Text className='author-tag'>作者</Text>}
                        </View>
                        <Text className='c-text'>{c.content}</Text>
                        <View className='c-footer'>
                           <Text className='c-time'>{c.time}</Text>
                        </View>
                     </View>
                     <View className='c-like'>
                        <AtIcon value='heart' size='14' color='#666' />
                        <Text>{c.likes}</Text>
                     </View>
                  </View>
               ))}
            </View>
         </View>
         
         <View style={{height: '100px'}} />
      </ScrollView>

      {/* 底部互动栏 */}
      <View className='bottom-bar'>
         <View className='input-box'>
            <Text>说些好听的，遇见有趣的</Text>
         </View>
         <View className='icons'>
            <View className='icon-item'><AtIcon value='heart' size='24' color='#fff' /><Text>16</Text></View>
            <View className='icon-item'><AtIcon value='message' size='24' color='#fff' /><Text>评论</Text></View>
            <View className='icon-item'><AtIcon value='star' size='24' color='#fff' /><Text>收藏</Text></View>
         </View>
      </View>
    </View>
  )
}