import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

// 定义消息类型接口
interface MessageItem {
  id: number
  type: 'system' | 'user' | 'group' // 区分系统图标还是用户头像
  title: string
  content: string
  time: string
  unread: boolean // 是否有红点
  icon?: string // 如果是系统消息，可以指定 icon 类型
}

export default function MessagePage() {
  
  // 每次进入页面，确保 TabBar 选中“消息” (假设索引是 2)
  Taro.useDidShow(() => {
    setTabBarIndex(3)
  })

  // 模拟数据 - 完全复刻截图内容
  const [messageList, setMessageList] = useState<MessageItem[]>([
    {
      id: 1,
      type: 'system',
      title: '互动消息',
      content: '草木 关注了你',
      time: '12/1',
      unread: false
    },
    {
      id: 2,
      type: 'system',
      title: '订单动态',
      content: '您的退票申请已提交',
      time: '12:03',
      unread: false
    },
    {
      id: 3,
      type: 'system',
      title: '支付消息',
      content: '已支付¥400.00',
      time: '12:03',
      unread: false
    },
    {
      id: 4,
      type: 'system',
      title: '积分账户',
      content: '已支付300积分',
      time: '12:03',
      unread: false
    },
    {
      id: 5,
      type: 'user',
      title: '面包',
      content: '啥时候啊，见一面',
      time: '12:03',
      unread: true // 红点
    },
    {
      id: 6,
      type: 'user',
      title: 'DJ 顺',
      content: '送你一张门票',
      time: '12:03',
      unread: true // 红点
    },
    {
      id: 7,
      type: 'group',
      title: '武侯区 改装车俱乐部',
      content: '(32条) 细小: 你在干啥',
      time: '12:03',
      unread: true // 红点
    },
    {
      id: 8,
      type: 'group',
      title: '成都Techno俱乐部',
      content: '孙孙: 走起有活动了预约',
      time: '12:03',
      unread: false
    }
  ])

  // 处理点击事件
  const handleItemClick = (item: MessageItem) => {
    console.log('点击了消息:', item.title)
    // 这里可以跳转到聊天详情页
    // Taro.navigateTo({ url: `/pages/chat/index?id=${item.id}` })
  }

  return (
    <View className='message-page'>
      {/* 顶部标题区 */}
      <View className='page-header'>
        <Text className='header-title'>消息</Text>
        <Text className='header-count'>({messageList.length})</Text>
      </View>

      {/* 消息列表 */}
      <View className='message-list'>
        {messageList.map((item) => (
          <View 
            key={item.id} 
            className='message-item'
            onClick={() => handleItemClick(item)}
          >
            {/* 左侧：头像区域 */}
            <View className='avatar-wrapper'>
              {/* 这里模拟截图中的灰色圆形头像，实际项目中可以用 Image src={...} */}
              <View className='avatar-placeholder'>
                {/* 仅作装饰，如果是真实头像可以用 <Image /> */}
              </View>
            </View>

            {/* 中间：内容区域 */}
            <View className='content-wrapper'>
              <View className='title-row'>
                <Text className='item-title'>{item.title}</Text>
              </View>
              <View className='subtitle-row'>
                <Text className='item-subtitle'>{item.content}</Text>
              </View>
            </View>

            {/* 右侧：时间与红点 */}
            <View className='info-wrapper'>
              <Text className='item-time'>{item.time}</Text>
              {item.unread && (
                <View className='unread-dot' />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}