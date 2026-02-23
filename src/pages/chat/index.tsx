import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import { request } from '../../utils/request'
import './index.scss'

interface NoteCardExt {
  card_type: 'note_forward'
  note_id: string
  note: {
    author_avatar: string
    author_id: number
    author_nickname: string
    cover: string
    id: number
    title: string
  }
}

interface ActivityCardExt {
  card_type: 'activity_forward'
  activity_id: string
  activity?: {
    id?: string | number
    name?: string
    title?: string
    cover?: string
    cover_image?: string
    location_name?: string
  }
}

interface MessageItem {
  id: string
  sender_id: number
  content: string
  msg_type: number
  time: number
  ext: NoteCardExt | ActivityCardExt | any
  is_self: boolean
  nickname?: string
  avatar?: string
  client_msg_id?: string
}

export default function ChatPage() {
  const router = useRouter()
  const { peer_id, title, type } = router.params
  const sessionType = Number(type) === 2 ? 2 : 1
  const isGroupChat = sessionType === 2
  const NAV_BOTTOM_EXTEND = 8

  const [msgList, setMsgList] = useState<MessageItem[]>([])
  const msgListRef = useRef<MessageItem[]>([])

  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const nextCursorRef = useRef<number | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const hasMoreRef = useRef(true)

  const [peerAvatar, setPeerAvatar] = useState('')
  const [selfAvatar, setSelfAvatar] = useState('')
  const [myUserId, setMyUserId] = useState<number>(0)
  const [myNickname, setMyNickname] = useState('')

  const [scrollId, setScrollId] = useState('')

  const [firstLoaded, setFirstLoaded] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const [isFollowed, setIsFollowed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => { msgListRef.current = msgList }, [msgList])
  useEffect(() => { nextCursorRef.current = nextCursor }, [nextCursor])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])

  const mergeMessages = (oldItems: MessageItem[], newItems: MessageItem[]) => {
    const resultList = [...oldItems]

    newItems.forEach(newMsg => {
      const normalizedTime = normalizeTimestamp(newMsg.time)
      const normalizedTimeMs = normalizeTimestampMs(newMsg.time)

      if (newMsg.client_msg_id) {
        const clientIndex = resultList.findIndex(local => local.client_msg_id === newMsg.client_msg_id)
        if (clientIndex !== -1) {
          const existing = resultList[clientIndex]
          resultList[clientIndex] = {
            ...existing,
            ...newMsg,
            id: newMsg.id || existing.id,
            time: normalizedTime
          }
          return
        }
      }

      if (newMsg.is_self) {
        const tempIndex = resultList.findIndex(local =>
          local.id.toString().startsWith('temp_') &&
          local.content === newMsg.content
        )
        if (tempIndex !== -1) {
          const existing = resultList[tempIndex]
          resultList[tempIndex] = {
            ...existing,
            ...newMsg,
            id: newMsg.id || existing.id,
            time: normalizedTime
          }
          return
        }

        const similarIndex = resultList.findIndex(local =>
          local.is_self &&
          local.content === newMsg.content &&
          local.msg_type === newMsg.msg_type &&
          Math.abs(normalizeTimestampMs(local.time) - normalizedTimeMs) <= 2000
        )
        if (similarIndex !== -1) {
          const existing = resultList[similarIndex]
          resultList[similarIndex] = {
            ...existing,
            ...newMsg,
            id: newMsg.id || existing.id,
            time: normalizedTime
          }
          return
        }
      }

      const exists = resultList.some(local => String(local.id) === String(newMsg.id))
      if (!exists) {
        const similarAnyIndex = resultList.findIndex(local =>
          local.sender_id === newMsg.sender_id &&
          local.content === newMsg.content &&
          local.msg_type === newMsg.msg_type &&
          Math.abs(normalizeTimestampMs(local.time) - normalizedTimeMs) <= 2000
        )
        if (similarAnyIndex !== -1) {
          const existing = resultList[similarAnyIndex]
          resultList[similarAnyIndex] = {
            ...existing,
            ...newMsg,
            id: newMsg.id || existing.id,
            time: normalizedTime
          }
        } else {
          resultList.push({
            ...newMsg,
            time: normalizedTime
          })
        }
      }
    })

    return resultList.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time
      return compareMessageId(a.id, b.id)
    })
  }

  const normalizeTimestamp = (value?: number) => {
    if (!value) return Math.floor(Date.now() / 1000)
    const num = Number(value)
    if (!Number.isFinite(num)) return Math.floor(Date.now() / 1000)
    if (num > 1e11) return Math.floor(num / 1000)
    return Math.floor(num)
  }

  const normalizeTimestampMs = (value?: number) => {
    if (!value) return Date.now()
    const num = Number(value)
    if (!Number.isFinite(num)) return Date.now()
    if (num > 1e11) return Math.floor(num)
    if (num > 1e9) return Math.floor(num * 1000)
    return Date.now()
  }

  const compareMessageId = (aId: MessageItem['id'], bId: MessageItem['id']) => {
    const aStr = String(aId)
    const bStr = String(bId)
    const aNum = /^\d+$/.test(aStr)
    const bNum = /^\d+$/.test(bStr)
    if (aNum && bNum) {
      if (aStr.length !== bStr.length) return aStr.length - bStr.length
      if (aStr === bStr) return 0
      return aStr < bStr ? -1 : 1
    }
    return aStr.localeCompare(bStr)
  }

  const resolveIsSelf = (msg: Partial<MessageItem> & { sender_id?: number | string; is_self?: boolean | number | string }) => {
    const currentUserId = Number(myUserId || Taro.getStorageSync('userInfo')?.user_id || 0)
    const senderId = Number(msg.sender_id || 0)
    if (currentUserId > 0 && senderId > 0) {
      return senderId === currentUserId
    }
    const raw = msg.is_self
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw === 1
    if (typeof raw === 'string') {
      const lower = String(raw).toLowerCase()
      return lower === '1' || lower === 'true'
    }
    return false
  }

  useEffect(() => {
    try {
      const userInfo = Taro.getStorageSync('userInfo')
      if (userInfo && userInfo.user_id) {
        setMyUserId(Number(userInfo.user_id))
        if (userInfo.nickname) {
          setMyNickname(String(userInfo.nickname))
        } else if (userInfo.nickName) {
          setMyNickname(String(userInfo.nickName))
        }
      }
    } catch (e) {}

    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const baseHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(baseHeight > 0 ? baseHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)

    const onKeyboardChange = (res) => {
      setKeyboardHeight(res.height)
      if (res.height > 0) {
        const currentList = msgListRef.current
        scrollToBottom(currentList)
      }
    }
    Taro.onKeyboardHeightChange(onKeyboardChange)

    const onNewMessage = (res: any) => {
      const newMsg = res.payload || res
      if (res.event && res.event !== 'chat') return

      const msgSenderId = String(newMsg.sender_id)
      const msgTargetId = String(newMsg.target_id || newMsg.group_id || '')
      const currentPeerId = String(peer_id)
      const currentMyId = String(myUserId || Taro.getStorageSync('userInfo')?.user_id || 0)
      const payloadIsSelf = typeof res.is_self === 'boolean' ? res.is_self : undefined
      const payloadNickname = newMsg.nickname || res.nickname
      const payloadAvatar = newMsg.avatar || res.avatar

      let isCurrentChat = false
      const computedSelf = msgSenderId === currentMyId
      let isSelfMsg = typeof newMsg.is_self === 'boolean'
        ? newMsg.is_self
        : (typeof payloadIsSelf === 'boolean' ? payloadIsSelf : computedSelf)

      if (sessionType === 2) {
        if (Number(newMsg.session_type) !== 2) return
        isCurrentChat = msgTargetId === currentPeerId
      } else {
        if (msgSenderId === currentPeerId) {
          isCurrentChat = true
          isSelfMsg = false
        } else if (msgTargetId === currentPeerId) {
          isCurrentChat = true
          isSelfMsg = true
        }
      }

      if (isCurrentChat) {
        if (sessionType === 2 && computedSelf) {
          isSelfMsg = true
        }
        const incomingMsg: MessageItem = {
          id: newMsg.msg_id || newMsg.id || newMsg.message_id || `ws_${Date.now()}_${Math.random()}`,
          sender_id: Number(newMsg.sender_id),
          content: newMsg.content,
          msg_type: newMsg.msg_type,
          time: normalizeTimestamp(newMsg.timestamp || newMsg.time || Date.now()),
          ext: newMsg.ext || {},
          is_self: isSelfMsg,
          nickname: payloadNickname,
          avatar: payloadAvatar,
          client_msg_id: newMsg.client_msg_id || newMsg.clientMsgId
        }

        setMsgList(prev => {
          const merged = mergeMessages(prev, [incomingMsg])
          scrollToBottom(merged)
          return merged
        })

        if (!isSelfMsg) {
          clearUnread()
        }
      }
    }
    Taro.eventCenter.on('IM_NEW_MESSAGE', onNewMessage)

    const onImConnected = () => {
      console.log('[ChatPage] IM 已连接，执行消息补拉...')
      reconnectFetch()
    }
    Taro.eventCenter.on('IM_CONNECTED', onImConnected)

    const onTokenRefreshed = () => {
      console.log('[ChatPage] token refreshed')
    }
    Taro.eventCenter.on('TOKEN_REFRESHED', onTokenRefreshed)

    const onFollowStatusUpdated = (payload) => {
      if (!payload || String(payload.userId) !== String(peer_id)) return
      fetchFollowStatus()
    }
    Taro.eventCenter.on('FOLLOW_STATUS_UPDATED', onFollowStatusUpdated)

    fetchMessages(true)
    if (!isGroupChat) {
      fetchFollowStatus()
    }
    clearUnread()

    return () => {
      Taro.offKeyboardHeightChange(onKeyboardChange)
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
      Taro.eventCenter.off('IM_CONNECTED', onImConnected)
      Taro.eventCenter.off('TOKEN_REFRESHED', onTokenRefreshed)
      Taro.eventCenter.off('FOLLOW_STATUS_UPDATED', onFollowStatusUpdated)
    }
  }, [peer_id, sessionType, myUserId])

  useDidShow(() => {
    if (peer_id && !isGroupChat) {
      fetchFollowStatus()
    }
  })

  const fetchFollowStatus = async () => {
    if (isGroupChat) return
    try {
      const res = await request({
        url: `/api/v1/follow/${peer_id}`,
        method: 'GET'
      })
      let resData: any = res.data
      if (typeof resData === 'string') {
        try { resData = JSON.parse(resData) } catch (e) {}
      }
      if (resData && resData.code === 200 && typeof resData.data?.is_followed === 'boolean') {
        setIsFollowed(resData.data.is_followed)
      }
    } catch (e) {}
  }

  const clearUnread = async () => {
    try {
      await request({
        url: '/api/v1/session/clear-unread',
        method: 'POST',
        data: { session_type: sessionType, peer_id: Number(peer_id) }
      })
    } catch (e) {}
  }

  const reconnectFetch = async () => {
    try {
      const validMsgs = msgListRef.current.filter(m => !String(m.id).startsWith('temp_'))
      const lastLocalMsg = validMsgs.length > 0 ? validMsgs[validMsgs.length - 1] : null
      const sinceTime = lastLocalMsg ? lastLocalMsg.time : 0

      console.log('[ChatPage] 开始补拉，本地最新时间:', sinceTime)

      const params: any = {
        peer_id: Number(peer_id),
        session_type: sessionType,
        limit: 50,
        since: sinceTime
      }

      const res = await request({
        url: '/api/v1/message/list',
        method: 'GET',
        data: params
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') try { resBody = JSON.parse(resBody) } catch (e) {}

      if (resBody.code === 200 && resBody.data) {
        const newMsgs: MessageItem[] = (resBody.data.list || []).map((item: MessageItem) => ({
          ...item,
          time: normalizeTimestamp(item.time),
          is_self: resolveIsSelf(item)
        }))

        if (newMsgs.length > 0) {
          console.log(`[ChatPage] reconnect fetched ${newMsgs.length} messages`)

          setMsgList(prev => {
            const merged = mergeMessages(prev, newMsgs)
            if (
              merged.length > prev.length ||
              (merged.length > 0 && prev.length > 0 && merged[merged.length - 1].id !== prev[prev.length - 1].id)
            ) {
              scrollToBottom(merged)
            }
            return merged
          })

          clearUnread()
        } else {
          console.log('[ChatPage] reconnect done, no new messages')
        }
      }
    } catch (e) {
      console.error('[ChatPage] reconnect fetch failed', e)
    }
  }

  const fetchMessages = async (isRefresh = false) => {
    if (loading) return
    if (!isRefresh && !hasMoreRef.current) return

    setLoading(true)
    if (!isRefresh) setIsHistoryLoading(true)

    try {
      const params: any = {
        peer_id: Number(peer_id),
        session_type: sessionType,
        limit: 20
      }

      if (!isRefresh && nextCursorRef.current) {
        params.cursor = nextCursorRef.current
      }

      let anchorMsgId = ''
      if (!isRefresh && msgListRef.current.length > 0) {
        anchorMsgId = `msg-${msgListRef.current[0].id}`
      }

      if (!isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      const res = await request({
        url: '/api/v1/message/list',
        method: 'GET',
        data: params
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {}
      }

      if (resBody.code === 200 && resBody.data) {
        const data = resBody.data
        const newMsgs: MessageItem[] = (data.list || []).map((item: MessageItem) => ({
          ...item,
          time: normalizeTimestamp(item.time),
          is_self: resolveIsSelf(item)
        }))
        const cursor = data.next_cursor

        if (isRefresh) {
          if (data.avatar) setPeerAvatar(data.avatar)
          if (data.self_avatar) setSelfAvatar(data.self_avatar)
          if (typeof data.is_followed === 'boolean') setIsFollowed(data.is_followed)
          if (typeof data.unread_total === 'number') setUnreadCount(data.unread_total)
        }

        const sortedMsgs = newMsgs.sort((a, b) => a.time - b.time)

        if (isRefresh) {
          setMsgList(sortedMsgs)
          scrollToBottom(sortedMsgs)
          setTimeout(() => setFirstLoaded(true), 200)
        } else {
          if (sortedMsgs.length > 0) {
            setMsgList(prev => mergeMessages(prev, sortedMsgs))

            if (anchorMsgId) {
              setScrollId('')
              setTimeout(() => {
                setScrollId(anchorMsgId)
              }, 50)
            }
          }
        }

        setNextCursor(cursor)
        setHasMore(newMsgs.length >= 20 && cursor !== 0 && cursor !== null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setIsHistoryLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim()) return
    const contentToSend = inputText
    setInputText('')
    const currentUserId = Number(myUserId || Taro.getStorageSync('userInfo')?.user_id || 0)
    if (!myUserId && currentUserId) {
      setMyUserId(currentUserId)
    }
    const clientMsgId = `${currentUserId || '0'}_${Date.now()}_${Math.random().toString(16).slice(2)}`

    const tempId = `temp_${Date.now()}`
    const tempMsg: MessageItem = {
      id: tempId,
      sender_id: currentUserId,
      content: contentToSend,
      msg_type: 1,
      time: Math.floor(Date.now() / 1000),
      ext: {},
      is_self: true,
      nickname: myNickname,
      avatar: selfAvatar,
      client_msg_id: clientMsgId
    }

    setMsgList(prev => {
      const newList = [...prev, tempMsg]
      scrollToBottom(newList)
      return newList
    })

    try {
      const res = await request({
        url: '/api/v1/message/send',
        method: 'POST',
        data: {
          target_id: String(peer_id),
          session_type: sessionType,
          msg_type: 1,
          content: contentToSend,
          client_msg_id: clientMsgId,
          ext: {}
        }
      })

      let resData: any = res.data
      if (typeof resData === 'string') try { resData = JSON.parse(resData) } catch (e) {}

      if (resData && resData.code === 200 && resData.data) {
        const serverMsg = resData.data
        setMsgList(prev => prev.map(m => {
          if (m.id === tempId) {
            return {
              ...m,
              id: serverMsg.msg_id || serverMsg.id || m.id,
              time: serverMsg.time || m.time || m.time,
              nickname: serverMsg.nickname || m.nickname,
              avatar: serverMsg.avatar || m.avatar,
              client_msg_id: serverMsg.client_msg_id || m.client_msg_id
            }
          }
          return m
        }))
      }
    } catch (err) {
      console.error('[ChatPage] send failed', err)
    }
  }

  const scrollToBottom = (list: MessageItem[]) => {
    if (list && list.length > 0) {
      setScrollId('')
      setTimeout(() => {
        const lastId = list[list.length - 1].id
        setScrollId(`msg-${lastId}`)
      }, 100)
    }
  }

  const formatTime = (ts: number) => {
    if (!ts) return ''
    const normalized = normalizeTimestamp(ts)
    const date = new Date(normalized * 1000)
    const now = new Date()
    const z = (n: number) => (n < 10 ? `0${n}` : n)
    const timeStr = `${z(date.getHours())}:${z(date.getMinutes())}`

    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    const isThisYear = date.getFullYear() === now.getFullYear()

    if (isToday) {
      return timeStr
    } else if (isThisYear) {
      return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`
    } else {
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${timeStr}`
    }
  }

  const handleToggleFollow = async () => {
    const nextFollowed = !isFollowed
    setIsFollowed(nextFollowed)

    try {
      const action = nextFollowed ? 'follow' : 'unfollow'
      const res = await request({
        url: `/api/v1/follow/${action}`,
        method: 'POST',
        data: { user_id: String(peer_id) }
      })
      const resData: any = res.data
      if (!resData || resData.code !== 200) throw new Error(resData?.msg || '操作失败')
      Taro.showToast({ title: nextFollowed ? '已关注' : '已取消关注', icon: 'none' })
    } catch (e) {
      setIsFollowed(!nextFollowed)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleOpenPeerProfile = () => {
    if (!peer_id || isGroupChat) return
    Taro.navigateTo({ url: `/pages/user-sub/profile/index?userId=${peer_id}` })
  }

  const handleOpenGroupMembers = () => {
    if (!peer_id || !isGroupChat) return
    Taro.navigateTo({
      url: `/pages/chat/group-members/index?group_id=${peer_id}&group_name=${encodeURIComponent(safeTitle)}`
    })
  }
  // 处理卡片消息点击
  const handleCardClick = (msg: MessageItem) => {
    if (msg.msg_type === 8 && msg.ext?.card_type === 'note_forward') {
      const noteId = String(msg.ext.note_id || msg.ext.note?.id)
      if (noteId) {
        Taro.navigateTo({ url: `/pages/square-sub/post-detail/index?id=${noteId}` })
      }
      return
    }
    if (msg.msg_type === 9 && msg.ext?.card_type === 'activity_forward') {
      const activityId = String(msg.ext.activity_id || msg.ext.activity?.id || '')
      if (activityId) {
        Taro.navigateTo({ url: `/pages/activity/index?id=${activityId}` })
      }
    }
  }
  // 渲染消息内容
  const renderMessageContent = (msg: MessageItem) => {
    if (msg.msg_type === 8) {
      if (msg.ext?.card_type === 'note_forward' && msg.ext.note) {
        const note = msg.ext.note
        return (
          <View className='card-bubble' onClick={() => handleCardClick(msg)}>
            <View className='card-header'>
              <Image src={note.author_avatar} className='card-author-avatar' mode='aspectFill' />
              <Text className='card-author-name'>{note.author_nickname}</Text>
            </View>
            <View className='card-body'>
              <View className='card-content'>
                <Text className='card-title'>{note.title}</Text>
                {msg.content && <Text className='card-desc'>{msg.content}</Text>}
              </View>
              {note.cover && (
                <Image src={note.cover} className='card-cover' mode='aspectFill' />
              )}
            </View>
            <View className='card-footer'>
              <Text className='card-tag'>帖子</Text>
            </View>
          </View>
        )
      }
      return (
        <View className='bubble'>
          <Text className='text'>[卡片消息]</Text>
        </View>
      )
    }

    if (msg.msg_type === 9 && msg.ext?.card_type === 'activity_forward') {
      const activityTitle = msg.ext?.activity?.name || msg.ext?.activity?.title || '活动转发'
      const activityLocation = msg.ext?.activity?.location_name || ''
      const activityCover = msg.ext?.activity?.cover || msg.ext?.activity?.cover_image || ''
      return (
        <View className='card-bubble' onClick={() => handleCardClick(msg)}>
          <View className='card-header'>
            <Text className='card-author-name'>分享了一个活动</Text>
          </View>
          <View className='card-body'>
            <View className='card-content'>
              <Text className='card-title'>{activityTitle}</Text>
              {msg.content && <Text className='card-desc'>{msg.content}</Text>}
              {!msg.content && activityLocation && <Text className='card-desc'>{activityLocation}</Text>}
            </View>
            {activityCover && (
              <Image src={activityCover} className='card-cover' mode='aspectFill' />
            )}
          </View>
          <View className='card-footer'>
            <Text className='card-tag card-tag-activity'>活动</Text>
          </View>
        </View>
      )
    }

    return (
      <View className='bubble'>
        <Text className='text'>{msg.content}</Text>
      </View>
    )
  }

  const safeDecode = (value?: string) => {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  }

  const safeTitle = safeDecode(title || '\u804a\u5929')

  return (
    <View className='chat-page'>
      <View className='custom-navbar' style={{ height: `${statusBarHeight + navBarHeight + NAV_BOTTOM_EXTEND}px` }}>
        <View className='nav-main' style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
          <View className='nav-left-group'>
            <View className='nav-left' onClick={() => Taro.navigateBack()}><AtIcon value='chevron-left' size='24' color='#fff' /></View>
            {unreadCount > 0 && (
              <View className='nav-badge'>
                <Text className='nav-badge-text'>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View className='nav-center'>
            <Text className='nav-title'>{safeTitle}</Text>
            {!isGroupChat && !isFollowed && (
              <View className='follow-btn' onClick={handleToggleFollow}>
                <Text className='follow-text'>{'\u5173\u6ce8'}</Text>
              </View>
            )}
          </View>
          {isGroupChat && (
            <View className='nav-right' onClick={handleOpenGroupMembers}>
              <View className='nav-right-btn'>
                <AtIcon value='list' size='18' color='#fff' />
              </View>
            </View>
          )}
        </View>
      </View>

        <ScrollView
          scrollY
          className='chat-scroll'
          style={{ top: `${statusBarHeight + navBarHeight + NAV_BOTTOM_EXTEND}px`, bottom: `${keyboardHeight > 0 ? keyboardHeight + 60 : 80}px`, opacity: firstLoaded ? 1 : 0 }}
          scrollIntoView={scrollId}
          upperThreshold={80}
          onScrollToUpper={() => { fetchMessages(false) }}
        >
        <View className='msg-container'>
          <View className='history-loader' style={{ minHeight: isHistoryLoading ? '60px' : '0' }}>
            {isHistoryLoading && (
              <View className='custom-loading'>
                <AtIcon value='loading-3' size='18' color='#666' className='spin-icon' />
                <Text className='loading-text'>加载历史消息...</Text>
              </View>
            )}
            {!hasMore && msgList.length > 0 && <Text className='no-more-text'>没有更多消息了</Text>}
          </View>

          {msgList.map((msg, index) => {
            const isSelf = msg.is_self
            const showName = isGroupChat && !isSelf && msg.nickname
            const leftAvatar = isGroupChat ? (msg.avatar || peerAvatar) : peerAvatar
            const rightAvatar = msg.avatar || selfAvatar
            const leftPlaceholder = msg.nickname ? msg.nickname[0] : (safeTitle ? safeTitle[0] : 'U')
            return (
              <View key={msg.id} id={`msg-${msg.id}`} className={`msg-row ${isSelf ? 'msg-right' : 'msg-left'}`}>
                {(index === 0 || index % 10 === 0) && (<View className='time-stamp'>{formatTime(msg.time)}</View>)}
                <View className='msg-body'>
                  {!isSelf && (
                    <View className='avatar' onClick={handleOpenPeerProfile}>
                      {leftAvatar ? (
                        <Image src={leftAvatar} className='avatar-img' mode='aspectFill' />
                      ) : (
                        <View className='avatar-placeholder'>{leftPlaceholder}</View>
                      )}
                    </View>
                  )}
                  <View className='bubble-group'>
                    {showName && <Text className='msg-name'>{msg.nickname}</Text>}
                    {renderMessageContent(msg)}
                  </View>
                  {isSelf && (
                    <View className='avatar my-avatar'>
                      {rightAvatar ? (
                        <Image src={rightAvatar} className='avatar-img' mode='aspectFill' />
                      ) : (
                        <View className='avatar-placeholder'>我</View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <View className='input-bar' style={{ bottom: `${keyboardHeight}px`, paddingBottom: keyboardHeight > 0 ? '10px' : 'calc(10px + env(safe-area-inset-bottom))' }}>
        <View className='input-wrapper'>
          <Input className='chat-input' value={inputText} onInput={e => setInputText(e.detail.value)} confirmType='send' onConfirm={handleSend} cursorSpacing={0} adjustPosition={false} holdKeyboard />
        </View>
        <View className={`send-btn ${inputText ? 'active' : ''}`} onClick={handleSend}><AtIcon value='chevron-right' size='20' color='#fff' /></View>
      </View>
    </View>
  )
}

