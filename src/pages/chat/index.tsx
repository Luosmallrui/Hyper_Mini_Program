import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import { request } from '../../utils/request'
import './index.scss'

interface MessageItem {
  id: string
  sender_id: number
  content: string
  msg_type: number
  time: number
  ext: any
  is_self: boolean
}

export default function ChatPage() {
  const router = useRouter()
  const { peer_id, title, type } = router.params

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

  const [scrollId, setScrollId] = useState('')

  const [firstLoaded, setFirstLoaded] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const [isFollowed, setIsFollowed] = useState(false)
  const [unreadCount] = useState(20)

  useEffect(() => { msgListRef.current = msgList }, [msgList])
  useEffect(() => { nextCursorRef.current = nextCursor }, [nextCursor])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])

  const mergeMessages = (oldItems: MessageItem[], newItems: MessageItem[]) => {
    const resultList = [...oldItems]

    newItems.forEach(newMsg => {
      if (newMsg.is_self) {
        const tempIndex = resultList.findIndex(local =>
          local.id.toString().startsWith('temp_') &&
          local.content === newMsg.content
        )
        if (tempIndex !== -1) {
          resultList.splice(tempIndex, 1)
        }
      }

      const exists = resultList.some(local => String(local.id) === String(newMsg.id))
      if (!exists) {
        resultList.push(newMsg)
      }
    })

    return resultList.sort((a, b) => a.time - b.time)
  }

  useEffect(() => {
    try {
      const userInfo = Taro.getStorageSync('userInfo')
      if (userInfo && userInfo.user_id) {
        setMyUserId(Number(userInfo.user_id))
      }
    } catch (e) {}

    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightMargin = sysInfo.screenWidth - menuInfo.right
    setMenuButtonWidth(menuInfo.width + (rightMargin * 2))

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
      const msgTargetId = String(newMsg.target_id)
      const currentPeerId = String(peer_id)
      const currentMyId = String(myUserId || Taro.getStorageSync('userInfo')?.user_id || 0)

      let isCurrentChat = false
      let isSelfMsg = (msgSenderId === currentMyId)

      if (Number(type) === 2) {
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
        const incomingMsg: MessageItem = {
          id: newMsg.msg_id || `ws_${Date.now()}_${Math.random()}`,
          sender_id: Number(newMsg.sender_id),
          content: newMsg.content,
          msg_type: newMsg.msg_type,
          time: newMsg.timestamp ? Math.floor(newMsg.timestamp / 1000) : (newMsg.time || Math.floor(Date.now() / 1000)),
          ext: newMsg.ext || {},
          is_self: isSelfMsg
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
      console.log('[ChatPage] IM已连接，执行消息补洞...')
      reconnectFetch()
    }
    Taro.eventCenter.on('IM_CONNECTED', onImConnected)

    const onTokenRefreshed = () => {
      console.log('[ChatPage] Token刷新')
    }
    Taro.eventCenter.on('TOKEN_REFRESHED', onTokenRefreshed)

    fetchMessages(true)
    clearUnread()

    return () => {
      Taro.offKeyboardHeightChange(onKeyboardChange)
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
      Taro.eventCenter.off('IM_CONNECTED', onImConnected)
      Taro.eventCenter.off('TOKEN_REFRESHED', onTokenRefreshed)
    }
  }, [peer_id, type, myUserId])

  const clearUnread = async () => {
    try {
      await request({
        url: '/api/v1/message/clear-unread',
        method: 'POST',
        data: { session_type: Number(type), peer_id: Number(peer_id) }
      })
    } catch (e) {}
  }

  const reconnectFetch = async () => {
    try {
      const validMsgs = msgListRef.current.filter(m => !String(m.id).startsWith('temp_'))
      const lastLocalMsg = validMsgs.length > 0 ? validMsgs[validMsgs.length - 1] : null
      const sinceTime = lastLocalMsg ? lastLocalMsg.time : 0

      console.log('[ChatPage] 开始补洞，本地最新时间:', sinceTime)

      const params: any = {
        peer_id: Number(peer_id),
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
        const newMsgs: MessageItem[] = resBody.data.list || []

        if (newMsgs.length > 0) {
          console.log(`[ChatPage] 补洞拉取到 ${newMsgs.length} 条消息`)

          setMsgList(prev => {
            const merged = mergeMessages(prev, newMsgs)
            if (merged.length > prev.length ||
              (merged.length > 0 && prev.length > 0 && merged[merged.length - 1].id !== prev[prev.length - 1].id)) {
              scrollToBottom(merged)
            }
            return merged
          })

          clearUnread()
        } else {
          console.log('[ChatPage] 补洞完成，无新消息')
        }
      }
    } catch (e) {
      console.error('[ChatPage] 消息补洞失败', e)
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
        const newMsgs: MessageItem[] = data.list || []
        const cursor = data.next_cursor

        if (isRefresh) {
          if (data.avatar) setPeerAvatar(data.avatar)
          if (data.self_avatar) setSelfAvatar(data.self_avatar)
        }

        const sortedMsgs = newMsgs.sort((a, b) => a.time - b.time)

        if (isRefresh) {
          setMsgList(sortedMsgs)
          scrollToBottom(sortedMsgs)
          setTimeout(() => setFirstLoaded(true), 200)
        } else {
          if (sortedMsgs.length > 0) {
            setMsgList(prev => [...sortedMsgs, ...prev])

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

    const tempId = `temp_${Date.now()}`
    const tempMsg: MessageItem = {
      id: tempId,
      sender_id: myUserId,
      content: contentToSend,
      msg_type: 1,
      time: Math.floor(Date.now() / 1000),
      ext: {},
      is_self: true
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
        data: { target_id: String(peer_id), session_type: Number(type), msg_type: 1, content: contentToSend, ext: {} }
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
              time: serverMsg.time || m.time || m.time
            }
          }
          return m
        }))
      }
    } catch (err) {
      console.error('[ChatPage] 发送失败', err)
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
    const date = new Date(ts * 1000)
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

  const handleToggleFollow = () => {
    setIsFollowed(prev => !prev)
    Taro.showToast({ title: isFollowed ? '已取消关注' : '已关注', icon: 'none' })
  }

  const safeDecode = (value?: string) => {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  }

  const safeTitle = safeDecode(title || '聊天')

  return (
    <View className='chat-page'>
      <View className='custom-navbar' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
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
          <View className={`follow-btn ${isFollowed ? 'followed' : ''}`} onClick={handleToggleFollow}>
            <Text className='follow-text'>{isFollowed ? '已关注' : '关注'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        scrollY
        className='chat-scroll'
        style={{ top: `${statusBarHeight + navBarHeight}px`, bottom: `${keyboardHeight > 0 ? keyboardHeight + 60 : 80}px`, opacity: firstLoaded ? 1 : 0 }}
        scrollIntoView={scrollId}
        upperThreshold={80}
        onScrollToUpper={() => { fetchMessages(false) }}
      >
        <View className='msg-container'>
          <View className='system-tip'>
            <Text className='tip-text'>
              一切以<Text className='tip-link'>投资</Text>、<Text className='tip-link'>理财</Text>、<Text className='tip-link'>炒币</Text>、<Text className='tip-link'>炒股</Text>等赚钱理由，要求加微信或下载其他软件均为诈骗，<Text className='tip-link'>请立即举报</Text>
            </Text>
          </View>
          <View className='time-stamp'>06-06 17:36</View>
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
            return (
              <View key={msg.id} id={`msg-${msg.id}`} className={`msg-row ${isSelf ? 'msg-right' : 'msg-left'}`}>
                {(index === 0 || index % 10 === 0) && (<View className='time-stamp'>{formatTime(msg.time)}</View>)}
                <View className='msg-body'>
                  {!isSelf && (
                    <View className='avatar'>
                      {peerAvatar ? (
                        <Image src={peerAvatar} className='avatar-img' mode='aspectFill' />
                      ) : (
                        <View className='avatar-placeholder'>{safeTitle ? safeTitle[0] : 'U'}</View>
                      )}
                    </View>
                  )}
                  <View className='bubble'><Text className='text'>{msg.content}</Text></View>
                  {isSelf && (
                    <View className='avatar my-avatar'>
                      {selfAvatar ? (
                        <Image src={selfAvatar} className='avatar-img' mode='aspectFill' />
                      ) : (
                        <View className='avatar-placeholder'>我</View>
                      )}
                    </View>
                  )}
                </View>
                {index === 2 && (
                  <View className='system-tip secondary'>
                    <Text className='tip-text'>
                      温馨提示：凡涉及<Text className='tip-link'>转账</Text>均为诈骗，切勿相信。若对方要求转账，<Text className='tip-link'>请立即举报</Text>
                    </Text>
                  </View>
                )}
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
