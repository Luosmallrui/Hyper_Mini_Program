import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'
import { setTabBarIndex } from '../../store/tabbar'
// 引入封装好的请求工具
import { request } from '../../utils/request'

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
  const [scrollHeight, setScrollHeight] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  Taro.useDidShow(() => {
    setTabBarIndex(3)
    fetchSessionList()
  })

  // 1. 布局初始化
  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    const windowHeight = sysInfo.windowHeight || sysInfo.screenHeight || 0

    setNavBarPaddingTop(sbHeight)
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const contentHeight = windowHeight - sbHeight - (nbHeight > 0 ? nbHeight : 44)
    setScrollHeight(contentHeight > 0 ? contentHeight : windowHeight)
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
      const isGroup = newMsg.session_type === 2
      const targetPeerId = isGroup ? newMsg.group_id : newMsg.sender_id

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

  // --- 核心修改：获取会话列表 ---
  const fetchSessionList = async () => {
    try {
      // 1. 检查 access_token (适配双token改动)
      const token = Taro.getStorageSync('access_token')

      if (!token) {
        console.warn('[MessagePage] 未登录(无access_token)，跳过请求')
        return
      }

      console.log('[MessagePage] 开始请求会话列表...')

      // 2. 使用 request 工具
      // 不需要手动写 header: Authorization，工具会自动加
      const res = await request({
        url: '/api/v1/session/',
        method: 'GET'
      })

      // 3. 打印原始返回，方便定位
      console.log('[MessagePage] 接口原始返回 res:', res)

      // 4. 获取业务数据 (res.data)
      // request 返回的是 { statusCode: 200, header: {...}, data: {code: 200, ...} }
      // 所以我们要取 res.data
      let resBody: any = res.data

      console.log('[MessagePage] 业务数据 resBody:', resBody)

      // 5. 防御性解析 (防止 request 工具解析遗漏或后端返回特殊格式)
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {
            console.error('[MessagePage] JSON解析失败', e)
        }
      }

      // 6. 适配接口结构 { code: 200, data: { list: [] } }
      if (resBody && resBody.code === 200 && resBody.data) {
        const dataList = resBody.data.list || []
        if (Array.isArray(dataList)) {
            setSessionList(dataList)
            console.log('[MessagePage] 列表更新成功，长度:', dataList.length)
        }
      } else {
        // 如果 code 不是 200 (例如 401)，request 工具可能已经拦截并处理了刷新/登出
        // 这里只需要记录一下日志
        console.warn('[MessagePage] 获取会话列表失败或非200:', resBody)
      }
    } catch (err) {
      console.error('[MessagePage] 网络异常', err)
    }
  }

  const handlePullDownRefresh = async () => {
    setIsRefreshing(true)
    await fetchSessionList()
    setTimeout(() => {
      setIsRefreshing(false)
      Taro.showToast({ title: '刷新成功', icon: 'success' })
    }, 1200)
  }

  const handleChat = (item: SessionItem) => {
    if (!item.peer_id) {
      Taro.showToast({ title: '会话信息缺失', icon: 'none' })
      return
    }

    // Clear unread locally for better UX.
    setSessionList(prev => prev.map(s => {
      if (s.peer_id === item.peer_id) {
        return { ...s, unread: 0 }
      }
      return s
    }))

    Taro.navigateTo({
      url: `/pages/chat/index?peer_id=${item.peer_id}&title=${encodeURIComponent(item.peer_name || '')}&type=${item.session_type}`,
      fail: (err) => {
        console.error('[MessagePage] 进入聊天失败:', err)
      }
    })
  }

  const formatTime = (timestamp: number) => {
    if (!timestamp) return ''
    // 兼容 10 位和 13 位时间戳
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
    { id: 'sys_1', title: '系统消息', desc: '你的身份认证审核已通过', time: '14:32', iconColor: '#8B7CFF', icon: 'bell', unread: 1 },
    { id: 'sys_2', title: '互动通知', desc: '刚刚有人关注了你，快去看看吧！', time: '13:22', iconColor: '#FF6B6B', icon: 'heart', unread: 0 },
    { id: 'sys_3', title: 'HYPER小助手', desc: '今日三倍积分返利快来参加心仪的活动吧！', time: '昨天', iconColor: '#FFB74D', icon: 'star', unread: 0 },
    { id: 'sys_4', title: '积分账户', desc: '已支付 300 积分', time: '昨天', iconColor: '#4ECDC4', icon: 'file-text', unread: 0 },
    { id: 'sys_5', title: '支付消息', desc: '成功支付¥300元', time: '06-17', iconColor: '#34C759', icon: 'credit-card', unread: 0 },
    { id: 'sys_6', title: '客服消息', desc: '客服月月：亲让您久等了，问题已经帮您反…', time: '06-17', iconColor: '#5AC8FA', icon: 'message', unread: 0 },
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
          paddingTop: `${navBarPaddingTop + navBarHeight}px`,
          paddingBottom: '120px',
          height: scrollHeight ? `${scrollHeight}px` : '100vh'
        }}
        refresherEnabled
        refresherTriggered={isRefreshing}
        onRefresherRefresh={handlePullDownRefresh}
        refresherBackground="#000000"
        refresherDefaultStyle="white"
      >
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

      </ScrollView>
    </View>
  )
}
