import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { setTabBarIndex } from '@/store/tabbar'
import { request } from '@/utils/request'
import { getCustomTabBarHeight } from '@/utils/layout'
import './index.scss'
import customerServiceIcon from '../../assets/icons/customer-service.svg'
import hyperAssistantIcon from '../../assets/icons/hyper-assistant.svg'
import interactionNotificationIcon from '../../assets/icons/interaction-notification.svg'
import paymentNotificationIcon from '../../assets/icons/payment-notification.svg'
import pointsAccountIcon from '../../assets/icons/points-account.svg'
import systemMessageIcon from '../../assets/icons/system-message.svg'

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

interface SystemNoticeItem {
  id: string
  title: string
  desc: string
  time: string
  iconSrc: string
  unread: number
}

export default function MessagePage() {
  const [sessionList, setSessionList] = useState<SessionItem[]>([])
  const [totalUnread, setTotalUnread] = useState(0)

  const [navBarPaddingTop, setNavBarPaddingTop] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [tabBarHeight, setTabBarHeight] = useState(0)
  const [scrollHeight, setScrollHeight] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  Taro.useDidShow(() => {
    setTabBarIndex(3)
    Taro.eventCenter.trigger('TAB_SWITCH_LOADING', false)
    fetchSessionList()
  })

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    const windowHeight = sysInfo.windowHeight || sysInfo.screenHeight || 0

    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height

    setNavBarPaddingTop(sbHeight)
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    setScrollHeight(windowHeight)
    setTabBarHeight(getCustomTabBarHeight())
  }, [])

  useEffect(() => {
    const total = sessionList.reduce((acc, curr) => acc + curr.unread, 0)
    setTotalUnread(total)

    if (total > 0) {
      Taro.setTabBarBadge({ index: 2, text: total > 99 ? '99+' : String(total) }).catch(() => {})
    } else {
      Taro.removeTabBarBadge({ index: 2 }).catch(() => {})
    }
  }, [sessionList])

  useEffect(() => {
    const onNewMessage = (res: any) => {
      const newMsg = res.payload || res
      if (res.event && res.event !== 'chat') return

      const isGroup = Number(newMsg.session_type) === 2
      const targetPeerId = isGroup ? (newMsg.target_id || newMsg.group_id) : newMsg.sender_id

      setSessionList(prevList => {
        const index = prevList.findIndex(item => item.peer_id === Number(targetPeerId))

        if (index > -1) {
          const updatedItem = { ...prevList[index] }
          updatedItem.last_msg = newMsg.msg_type === 1 ? newMsg.content : '[非文本消息]'
          updatedItem.last_msg_time = newMsg.timestamp ? Number(newMsg.timestamp) : (newMsg.time ? newMsg.time * 1000 : Date.now())
          updatedItem.unread += 1

          const newList = [...prevList]
          newList.splice(index, 1)
          newList.unshift(updatedItem)
          return newList
        }

        fetchSessionList()
        return prevList
      })
    }

    Taro.eventCenter.on('IM_NEW_MESSAGE', onNewMessage)
    return () => {
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
    }
  }, [])

  const fetchSessionList = async () => {
    try {
      const res = await request({
        url: '/api/v1/session/',
        method: 'GET'
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody)
        } catch {
          return
        }
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        const dataList = resBody.data.list || []
        if (Array.isArray(dataList)) {
          setSessionList(dataList)
        }
      }
    } catch (err) {
      console.error('[MessagePage] fetchSessionList error', err)
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
    }
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const systemNotices: SystemNoticeItem[] = [
    { id: 'sys_1', title: '系统消息', desc: '暂无系统消息', time: '', iconSrc: systemMessageIcon, unread: 0 },
    { id: 'sys_2', title: '互动通知', desc: '暂无互动', time: '', iconSrc: interactionNotificationIcon, unread: 0 },
    { id: 'sys_3', title: 'HYPER小助手', desc: '欢迎来到 HyperFun', time: '', iconSrc: hyperAssistantIcon, unread: 0 },
    { id: 'sys_4', title: '积分账户', desc: '当前积分 0', time: '', iconSrc: pointsAccountIcon, unread: 0 },
    { id: 'sys_5', title: '支付消息', desc: '暂无支付记录', time: '', iconSrc: paymentNotificationIcon, unread: 0 },
    { id: 'sys_6', title: '客服消息', desc: '遇到问题请联系客服', time: '', iconSrc: customerServiceIcon, unread: 0 },
  ]

  return (
    <View className='message-page'>
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
        refresherBackground='#000000'
        refresherDefaultStyle='white'
      >
        <View className='message-scroll-content'>
          <View style={{ height: `${navBarPaddingTop + navBarHeight}px` }} />

        <View className='system-list'>
          {systemNotices.map(item => (
            <View key={item.id} className='msg-item system-item'>
              <View className='avatar-box system-avatar'>
                <Image src={item.iconSrc} className='system-icon' mode='aspectFit' />
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
        </View>
      </ScrollView>
    </View>
  )
}
