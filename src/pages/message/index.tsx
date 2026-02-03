import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import { setTabBarIndex } from '@/store/tabbar'
import { request } from '@/utils/request'
import { getCustomTabBarHeight } from '@/utils/layout'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

// 1. 接口数据类型定义
interface SessionItem {
  session_type: number
  peer_id: number
  last_msg: string
  last_msg_time: number
  unread: number
  is_top: number
  is_mute: number
  peer_avatar: string
  peer_name: string
}

export default function MessagePage() {
  const [sessionList, setSessionList] = useState<SessionItem[]>([])
  const [totalUnread, setTotalUnread] = useState(0)

  // 布局适配状态
  const [navBarPaddingTop, setNavBarPaddingTop] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [tabBarHeight, setTabBarHeight] = useState(0)
  const [scrollHeight, setScrollHeight] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  Taro.useDidShow(() => {
    setTabBarIndex(3)
    Taro.eventCenter.trigger('TAB_SWITCH_LOADING', false) // 确保 TabBar 索引正确 (消息页通常是 index 2 或 3，请根据你的配置调整)
    fetchSessionList()
  })

  // 1. 布局初始化
  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    const windowHeight = sysInfo.windowHeight || sysInfo.screenHeight || 0
    
    // 计算导航栏高度 (胶囊高度 + 上下间距)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    
    setNavBarPaddingTop(sbHeight)
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    setScrollHeight(windowHeight)
    setTabBarHeight(getCustomTabBarHeight())
  }, [])

  // 2. 监听 sessionList 变化，自动计算未读数和红点
  useEffect(() => {
    const total = sessionList.reduce((acc, curr) => acc + curr.unread, 0)
    setTotalUnread(total)
    
    if (total > 0) {
      Taro.setTabBarBadge({ index: 2, text: total > 99 ? '99+' : String(total) }).catch(() => {})
    } else {
      Taro.removeTabBarBadge({ index: 2 }).catch(() => {})
    }
  }, [sessionList])

  // 3. 监听 IM 消息，进行本地更新
  useEffect(() => {
    const onNewMessage = (res: any) => {
      // 解包 payload
      const newMsg = res.payload || res
      console.log('[MessagePage] 收到新消息', newMsg)

      if (res.event && res.event !== 'chat') return

      // 确定会话 ID
      const isGroup = Number(newMsg.session_type) === 2
      const targetPeerId = isGroup ? (newMsg.target_id || newMsg.group_id) : newMsg.sender_id

      setSessionList(prevList => {
        const index = prevList.findIndex(item => item.peer_id === Number(targetPeerId))

        if (index > -1) {
          // --- 场景 A：会话已存在，执行本地更新 ---
          const updatedItem = { ...prevList[index] }
          updatedItem.last_msg = newMsg.msg_type === 1 ? newMsg.content : '[非文本消息]'
          // 兼容 timestamp (13位) 和 time (10位)
          updatedItem.last_msg_time = newMsg.timestamp ? Number(newMsg.timestamp) : (newMsg.time ? newMsg.time * 1000 : Date.now())
          updatedItem.unread += 1

          const newList = [...prevList]
          newList.splice(index, 1) // 删除旧位置
          newList.unshift(updatedItem) // 置顶
          
          return newList
        } else {
          // --- 场景 B：新会话，重新拉取 ---
          console.log('[MessagePage] 新会话，重新拉取列表')
          fetchSessionList()
          return prevList
        }
      })
    }

    Taro.eventCenter.on('IM_NEW_MESSAGE', onNewMessage)

    return () => {
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
    }
  }, [])

  // 获取会话列表
  const fetchSessionList = async () => {
    try {
      const res = await request({
        url: '/api/v1/session/',
        method: 'GET'
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {}
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        const dataList = resBody.data.list || []
        if (Array.isArray(dataList)) {
            setSessionList(dataList)
        }
      } else {
        console.warn('[MessagePage] 获取会话列表失败或非200:', resBody)
      }
    } catch (err) {
      console.error('[MessagePage] 网络异常', err)
    }
  }

  const handlePullDownRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await fetchSessionList()
      Taro.showToast({ title: '刷新成功', icon: 'success' })
    } finally {
      setTimeout(() => setIsRefreshing(false), 300)
    }
  }

  const handleChat = (item: SessionItem) => {
    if (!item.peer_id) {
      Taro.showToast({ title: '会话信息缺失', icon: 'none' })
      return
    }

    // 本地清零未读数
    setSessionList(prev => prev.map(s => {
      if (s.peer_id === item.peer_id) {
        return { ...s, unread: 0 }
      }
      return s
    }))

    Taro.navigateTo({
      url: `/pages/chat/index?peer_id=${item.peer_id}&title=${encodeURIComponent(item.peer_name || '')}&type=${item.session_type}`
    })
  }

  const formatTime = (timestamp: number) => {
    if (!timestamp) return ''
    const timeMs = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp
    const date = new Date(timeMs)
    const now = new Date()
    
    const z = (n: number) => (n < 10 ? `0${n}` : n)
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear()

    if (isToday) {
      return `${z(date.getHours())}:${z(date.getMinutes())}`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  }

  const systemNotices = [
    { id: 'sys_1', title: '系统消息', desc: '暂无系统消息', time: '', iconColor: '#8B7CFF', icon: 'bell', unread: 0 },
    { id: 'sys_2', title: '互动通知', desc: '暂无互动', time: '', iconColor: '#FF6B6B', icon: 'heart', unread: 0 },
    { id: 'sys_3', title: 'HYPER小助手', desc: '欢迎来到 HyperFun', time: '', iconColor: '#FFB74D', icon: 'star', unread: 0 },
    { id: 'sys_4', title: '积分账户', desc: '当前积分 0', time: '', iconColor: '#4ECDC4', icon: 'file-text', unread: 0 },
    { id: 'sys_5', title: '支付消息', desc: '暂无支付记录', time: '', iconColor: '#34C759', icon: 'credit-card', unread: 0 },
    { id: 'sys_6', title: '客服消息', desc: '遇到问题请联系客服', time: '', iconColor: '#5AC8FA', icon: 'message', unread: 0 },
  ]

  return (
    <View className='message-page'>
      {/* 顶部 Header (Fixed) */}
      <View 
        className='page-header'
        style={{
          paddingTop: `${navBarPaddingTop}px`,
          height: `${navBarHeight}px`
        }}
      >
        <View className='header-center'>
          <Text className='header-title'>消息</Text>
          {totalUnread > 0 && <Text className='header-count'>({totalUnread})</Text>}
        </View>
      </View>

      {/* 滚动区域 */}
      <ScrollView 
        scrollY 
        className='message-scroll'
        style={{
            height: scrollHeight ? `${scrollHeight}px` : '100vh'
        }}
        refresherEnabled
        refresherTriggered={isRefreshing}
        onRefresherRefresh={handlePullDownRefresh}
        onRefresherRestore={() => setIsRefreshing(false)}
        onRefresherAbort={() => setIsRefreshing(false)}
        refresherBackground="#000000"
        refresherDefaultStyle="white"
      >
        <View style={{ height: `${navBarPaddingTop + navBarHeight}px` }} />
        {/* ?????? */}
        
        {/* 系统通知 */}
        <View className='system-list'>
          {systemNotices.map(item => (
            <View key={item.id} className='msg-item system-item'>
              <View className='avatar-box' style={{ backgroundColor: item.iconColor }}>
                 <AtIcon value={item.icon} size='24' color='#fff' />
              </View>
              <View className='content-box'>
                <View className='top-row'>
                  <Text className='title'>{item.title}</Text>
                </View>
                <View className='bottom-row'>
                  <Text className='desc'>{item.desc}</Text>
                </View>
              </View>
              <View className='right-meta'>
                <Text className='time'>{item.time}</Text>
                {item.unread > 0 && <View className='badge-dot' />}
              </View>
            </View>
          ))}
        </View>

        {/* 聊天列表 */}
        <View className='chat-list'>
          {sessionList.map(item => (
            <View key={item.peer_id} className='msg-item' onClick={() => handleChat(item)}>
              <View className='avatar-box'>
                {item.peer_avatar ? (
                  <Image src={item.peer_avatar} className='avatar-img' mode='aspectFill' />
                ) : (
                  <View className='avatar-placeholder'>
                    <Text>{item.peer_name ? item.peer_name[0] : 'U'}</Text>
                  </View>
                )}
              </View>
              
              <View className='content-box'>
                <View className='top-row'>
                  <Text className='title'>{item.peer_name}</Text>
                  <Text className='time'>{formatTime(item.last_msg_time)}</Text>
                </View>
                <View className='bottom-row'>
                  <Text className='desc' numberOfLines={1}>{item.last_msg}</Text>
                  {item.unread > 0 && (
                    <View className='badge-num'>
                      <Text>{item.unread > 99 ? '99+' : item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
          
          {sessionList.length === 0 && (
             <View className='empty-state'>
                <Text>暂无聊天消息</Text>
             </View>
          )}
        </View>
        <View style={{ height: `${tabBarHeight + 20}px` }} />
      </ScrollView>
    </View>
  )
}
