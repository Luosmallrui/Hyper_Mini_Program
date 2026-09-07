import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { setTabBarIndex } from '@/store/tabbar'
import { request } from '@/utils/request'
import { isLoggedIn, requireLogin } from '@/utils/auth'
import { getCustomTabBarHeight } from '@/utils/layout'
import { getDirectMessageEnabledSync, getCustomerServiceUserIdSync, refreshDirectMessageEnabled } from '@/utils/system-config'
import {
  fetchNotificationUnreadCount,
  fetchNotifications,
  type NotificationUnreadCount,
  type NotificationType,
} from '@/utils/notifications'
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
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [isLogin, setIsLogin] = useState(false)
  const [directMessageEnabled, setDirectMessageEnabled] = useState(getDirectMessageEnabledSync)
  const [customerServiceUserId, setCustomerServiceUserId] = useState(getCustomerServiceUserIdSync)
  // 通知收件箱：系统/互动/支付三类未读数与最新一条摘要
  const [noticeUnread, setNoticeUnread] = useState<NotificationUnreadCount>({ total: 0, system: 0, interaction: 0, payment: 0 })
  const [noticeLatest, setNoticeLatest] = useState<Record<string, { title: string; time: string }>>({})
  // 积分账户入口：真实积分余额
  const [pointsBalance, setPointsBalance] = useState<number | null>(null)

  // 拉取通知未读数与各类型最新一条（入口卡片摘要）
  const fetchNotificationData = async () => {
    const unread = await fetchNotificationUnreadCount()
    setNoticeUnread(unread)
    const types: NotificationType[] = ['system', 'interaction', 'payment']
    const latestEntries = await Promise.all(types.map(async (t) => {
      const res = await fetchNotifications(t, 1, 1)
      const first = res.list[0]
      return [t, first ? { title: first.title, time: first.created_at.slice(0, 10) } : null] as const
    }))
    const latest: Record<string, { title: string; time: string }> = {}
    latestEntries.forEach(([t, value]) => { if (value) latest[t] = value })
    setNoticeLatest(latest)
  }

  // 积分账户入口的余额展示（失败保持 null，显示兜底文案）
  const fetchPointsBalance = async () => {
    try {
      const res = await request({ url: '/api/v1/points/balance', method: 'GET' })
      const data: any = res?.data?.data
      const balance = Number(data?.balance ?? data?.points ?? data?.available ?? data?.available_points ?? 0)
      if (Number.isFinite(balance)) setPointsBalance(balance)
    } catch (error) {
      console.warn('[MessagePage] points balance failed:', error)
    }
  }

  const [navBarPaddingTop, setNavBarPaddingTop] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [tabBarHeight, setTabBarHeight] = useState(0)
  const [scrollHeight, setScrollHeight] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  Taro.useDidShow(() => {
    setTabBarIndex(3)
    // 私信/建群开关游客也要刷新：过期缓存会让游客一直看到入口
    refreshDirectMessageEnabled().then((enabled) => {
      setDirectMessageEnabled(enabled)
      setCustomerServiceUserId(getCustomerServiceUserIdSync())
    })
    // 游客模式：未登录展示登录引导，不请求会话接口
    const loggedIn = isLoggedIn()
    setIsLogin(loggedIn)
    if (!loggedIn) {
      setSessionList([])
      setNoticeUnread({ total: 0, system: 0, interaction: 0, payment: 0 })
      setNoticeLatest({})
      return
    }
    fetchSessionList()
    void fetchNotificationData()
    void fetchPointsBalance()
  })

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    const windowHeight = sysInfo.windowHeight || sysInfo.screenHeight || 0

    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height

    setNavBarPaddingTop(sbHeight)
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    setMenuButtonWidth(sysInfo.screenWidth - menuInfo.left)
    setScrollHeight(windowHeight)
    setTabBarHeight(getCustomTabBarHeight())
  }, [])

  useEffect(() => {
    const total = sessionList.reduce((acc, curr) => acc + curr.unread, 0)
    const badgeTotal = total + noticeUnread.total
    setTotalUnread(badgeTotal)

    if (badgeTotal > 0) {
      Taro.setTabBarBadge({ index: 2, text: badgeTotal > 99 ? '99+' : String(badgeTotal) }).catch(() => {})
    } else {
      Taro.removeTabBarBadge({ index: 2 }).catch(() => {})
    }
  }, [sessionList, noticeUnread])

  useEffect(() => {
    const onNewMessage = (res: any) => {
      // 通知收件箱实时事件：刷新三类通知未读数与摘要
      if (res.event === 'notice.new') {
        void fetchNotificationData()
        return
      }
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

    const onChatMessageSent = () => {
      fetchSessionList()
    }

    Taro.eventCenter.on('IM_NEW_MESSAGE', onNewMessage)
    Taro.eventCenter.on('CHAT_MESSAGE_SENT', onChatMessageSent)
    return () => {
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
      Taro.eventCenter.off('CHAT_MESSAGE_SENT', onChatMessageSent)
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

  const handleMarkAllRead = async () => {
    if (markingAllRead || totalUnread <= 0) return
    const unreadSessions = sessionList.filter(item => Number(item.unread) > 0 && item.peer_id)
    if (unreadSessions.length === 0) return

    const previousList = sessionList
    setMarkingAllRead(true)
    setSessionList(prev => prev.map(item => ({ ...item, unread: 0 })))

    try {
      await Promise.all(unreadSessions.map(item => request({
        url: '/api/v1/session/clear-unread',
        method: 'POST',
        data: {
          session_type: item.session_type,
          peer_id: item.peer_id
        }
      })))
      Taro.showToast({ title: '已全部标记', icon: 'success' })
      await fetchSessionList()
    } catch (error) {
      setSessionList(previousList)
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleCreateGroup = () => {
    Taro.navigateTo({ url: '/pages/chat/group-select/index' })
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

  // 从消息列表移除会话（仅移除列表项，不删除聊天历史）
  const handleDeleteSession = (item: SessionItem) => {
    if (!item.peer_id) return
    Taro.showActionSheet({
      itemList: ['删除会话'],
      success: (res) => {
        if (res.tapIndex !== 0) return
        Taro.showModal({
          title: '删除会话',
          content: `确定从消息列表删除与「${item.peer_name || '该用户'}」的会话吗？聊天记录不会被删除。`,
          confirmColor: '#FF2E4D',
          success: async (modal) => {
            if (!modal.confirm) return
            try {
              const r = await request({
                url: '/api/v1/session',
                method: 'DELETE',
                data: { session_type: item.session_type, peer_id: Number(item.peer_id) }
              })
              let body: any = r.data
              if (typeof body === 'string') {
                try { body = JSON.parse(body) } catch (e) {}
              }
              if (body && body.code === 200) {
                setSessionList(prev => prev.filter(s =>
                  !(s.peer_id === item.peer_id && s.session_type === item.session_type)
                ))
                Taro.showToast({ title: '已删除会话', icon: 'none' })
              } else {
                Taro.showToast({ title: body?.msg || '删除失败', icon: 'none' })
              }
            } catch (e) {
              Taro.showToast({ title: '删除失败，请重试', icon: 'none' })
            }
          }
        })
      }
    }).catch(() => {})
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

  const systemNotices: (SystemNoticeItem & { noticeType?: NotificationType; noticeRoute?: string })[] = [
    {
      id: 'sys_1',
      title: '系统消息',
      desc: noticeLatest.system?.title || '暂无系统消息',
      time: noticeLatest.system?.time || '',
      iconSrc: systemMessageIcon,
      unread: noticeUnread.system,
      noticeType: 'system',
    },
    {
      id: 'sys_2',
      title: '互动通知',
      desc: noticeLatest.interaction?.title || '暂无互动',
      time: noticeLatest.interaction?.time || '',
      iconSrc: interactionNotificationIcon,
      unread: noticeUnread.interaction,
      noticeType: 'interaction',
    },
    { id: 'sys_3', title: 'HYPER小助手', desc: '欢迎来到 HyperFun', time: '', iconSrc: hyperAssistantIcon, unread: 0 },
    {
      id: 'sys_4',
      title: '积分账户',
      desc: `当前积分 ${pointsBalance === null ? 0 : pointsBalance.toFixed(1)}`,
      time: '',
      iconSrc: pointsAccountIcon,
      unread: 0,
      noticeRoute: '/pages/user-sub/points/index',
    },
    {
      id: 'sys_5',
      title: '支付消息',
      desc: noticeLatest.payment?.title || '暂无支付记录',
      time: noticeLatest.payment?.time || '',
      iconSrc: paymentNotificationIcon,
      unread: noticeUnread.payment,
      noticeType: 'payment',
    },
    {
      id: 'sys_6',
      title: '客服消息',
      desc: '遇到问题请联系客服',
      time: '',
      iconSrc: customerServiceIcon,
      unread: 0
    },
  ]

  const handleOpenNotice = (item: SystemNoticeItem & { noticeType?: NotificationType; noticeRoute?: string }) => {
    if (item.noticeRoute) {
      Taro.navigateTo({ url: item.noticeRoute })
      return
    }
    if (!item.noticeType) return
    Taro.navigateTo({ url: `/pages/message-sub/notification/index?type=${item.noticeType}` })
  }

  // 私信关闭时，消息列表只保留客服会话（单聊且 peer_id 为客服账号），隐藏普通用户会话与群聊
  const visibleSessionList = directMessageEnabled
    ? sessionList
    : sessionList.filter(s => s.session_type === 1 && Number(s.peer_id) === customerServiceUserId)

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
        <View
          className={`header-mark-all ${markingAllRead || totalUnread <= 0 ? 'disabled' : ''}`}
          onClick={handleMarkAllRead}
        >
          <Text>{markingAllRead ? '处理中' : totalUnread > 0 ? '一键已读' : '已全部读'}</Text>
        </View>
        {isLogin && directMessageEnabled && (
          <View
            className='header-create-group'
            style={{ right: `${menuButtonWidth + 8}px` }}
            onClick={handleCreateGroup}
          >
            <Text>发起群聊</Text>
          </View>
        )}
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

        {!isLogin && (
          <View className='guest-state'>
            <Text className='guest-state__text'>登录后查看消息</Text>
            <View className='guest-state__btn' onClick={() => requireLogin()}>
              <Text>去登录</Text>
            </View>
          </View>
        )}

        {isLogin && (
        <>
        <View className='system-list'>
          {systemNotices.map(item => {
            const content = (
              <>
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
                <View className={`right-meta${item.unread > 0 ? '' : ' right-meta--solo'}`}>
                  <Text className='time'>{item.time}</Text>
                  {item.unread > 0 && <View className='badge-dot' />}
                </View>
              </>
            )
            // 客服消息走微信原生客服（open-type=contact）
            if (item.id === 'sys_6') {
              return (
                <Button key={item.id} className='msg-item system-item btn-reset' openType='contact'>
                  {content}
                </Button>
              )
            }
            return (
              <View key={item.id} className='msg-item system-item' onClick={() => handleOpenNotice(item)}>
                {content}
              </View>
            )
          })}
        </View>

        <View className='chat-list'>
          {visibleSessionList.map(item => (
            <View key={item.peer_id} className='msg-item' onClick={() => handleChat(item)} onLongPress={() => handleDeleteSession(item)}>
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

          {visibleSessionList.length === 0 && (
            <View className='empty-state'>
              <Text>暂无消息</Text>
            </View>
          )}
        </View>
        </>
        )}
          <View style={{ height: `${tabBarHeight + 20}px` }} />
        </View>
      </ScrollView>
    </View>
  )
}
