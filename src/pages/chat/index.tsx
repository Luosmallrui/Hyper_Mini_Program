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

  // Ref 同步
  useEffect(() => { msgListRef.current = msgList }, [msgList])
  useEffect(() => { nextCursorRef.current = nextCursor }, [nextCursor])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])

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

    // 监听 IM 消息
    const onNewMessage = (res: any) => {
        const newMsg = res.payload || res
        if (res.event && res.event !== 'chat') return

        const msgSenderId = String(newMsg.sender_id)
        const msgTargetId = String(newMsg.target_id)
        const currentPeerId = String(peer_id)
        const currentMyId = String(myUserId || Taro.getStorageSync('userInfo')?.user_id || 0)

        let isCurrentChat = false
        // 判断是否是自己发的 (多端同步的关键)
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
                // 1. 绝对去重：如果ID完全一致，直接跳过
                if (prev.some(m => m.id === incomingMsg.id)) return prev

                // 2. 乐观更新去重 (核心修复)
                // 如果是自己发的消息，检查列表里是否有内容相同的临时消息
                if (isSelfMsg) {
                    const tempIndex = prev.findIndex(m => 
                        m.id.toString().startsWith('temp_') && // 是本地临时ID
                        m.content === incomingMsg.content      // 内容一致
                        // 严谨的话还可以判断发送时间差在几秒内
                    )
                    
                    if (tempIndex !== -1) {
                        // 找到了临时消息，直接替换成真实消息，避免重复
                        const newList = [...prev]
                        newList[tempIndex] = incomingMsg
                        return newList
                    }
                    // 没找到（说明是其他设备发的），走下面正常追加流程
                }

                // 3. 正常追加
                const newList = [...prev, incomingMsg]
                scrollToBottom(newList)
                return newList
            })
            
            // 只有对方发的消息才清未读
            if (!isSelfMsg) {
                clearUnread()
            }
        }
    }
    Taro.eventCenter.on('IM_NEW_MESSAGE', onNewMessage)

    fetchMessages(true)
    clearUnread()
    // 获取最新用户信息
    try {
        const u = Taro.getStorageSync('userInfo')
        if (u) {
            if (u.user_id) setMyUserId(Number(u.user_id))
            if (u.avatar_url) setSelfAvatar(u.avatar_url)
        }
    } catch(e) {}

    return () => {
      Taro.offKeyboardHeightChange(onKeyboardChange)
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
    }
  }, [peer_id, type, myUserId])

  const clearUnread = async () => {
      try {
        await request({
            url: '/api/v1/message/clear-unread',
            method: 'POST',
            data: { session_type: Number(type), peer_id: Number(peer_id) }
        })
      } catch(e) {}
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
          await new Promise(resolve => setTimeout(resolve, 500))
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

      if (resBody && resBody.code === 200 && resBody.data) {
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
      
      // 乐观更新：插入临时消息，ID以 temp_ 开头
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
        await request({
            url: '/api/v1/message/send',
            method: 'POST',
            data: { target_id: String(peer_id), session_type: Number(type), msg_type: 1, content: contentToSend, ext: {} }
        })
      } catch (err) {}
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

  // 格式化时间 (优化版)
  const formatTime = (ts: number) => {
    if (!ts) return ''
    const date = new Date(ts * 1000)
    const now = new Date()
    
    const z = (n: number) => (n < 10 ? `0${n}` : n)
    const timeStr = `${z(date.getHours())}:${z(date.getMinutes())}`
    
    // 判断是否是今天
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear()
    
    // 判断是否是今年
    const isThisYear = date.getFullYear() === now.getFullYear()

    if (isToday) {
      return timeStr
    } else if (isThisYear) {
      return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`
    } else {
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${timeStr}`
    }
  }

  return (
    <View className='chat-page'>
      <View className='custom-navbar' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
        <View className='nav-left' onClick={() => Taro.navigateBack()}><AtIcon value='chevron-left' size='24' color='#fff' /></View>
        <View className='nav-center'><Text className='nav-title'>{decodeURIComponent(title || '聊天')}</Text></View>
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
          <View className='history-loader' style={{ minHeight: isHistoryLoading ? '60px' : '0' }}>
             {isHistoryLoading && (<View className='custom-loading'><AtIcon value='loading-3' size='18' color='#666' className='spin-icon' /><Text className='loading-text'>加载历史消息...</Text></View>)}
             {!hasMore && msgList.length > 0 && <Text className='no-more-text'>没有更多消息了</Text>}
          </View>
          
          {msgList.map((msg, index) => {
            const isSelf = msg.is_self
            return (
              <View key={msg.id} id={`msg-${msg.id}`} className={`msg-row ${isSelf ? 'msg-right' : 'msg-left'}`}>
                {(index === 0 || index % 10 === 0) && (<View className='time-stamp'>{formatTime(msg.time)}</View>)}
                <View className='msg-body'>
                  {!isSelf && (<View className='avatar'>{peerAvatar ? (<Image src={peerAvatar} className='avatar-img' mode='aspectFill' />) : (<View className='avatar-placeholder'>{title ? title[0] : 'U'}</View>)}</View>)} 
                  <View className='bubble'><Text className='text'>{msg.content}</Text></View>
                  {isSelf && (<View className='avatar my-avatar'>{selfAvatar ? (<Image src={selfAvatar} className='avatar-img' mode='aspectFill' />) : (<View className='avatar-placeholder'>我</View>)}</View>)} 
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