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

  // --- 状态管理 ---
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

  // --- 关键辅助函数：智能合并消息 ---
  // 功能：将 newItems (来自服务器) 合并入 oldItems (本地)
  // 1. 根据 ID 绝对去重
  // 2. 如果 newItems 包含 "我自己发的消息"，尝试消除本地的 "temp_" 消息
  const mergeMessages = (oldItems: MessageItem[], newItems: MessageItem[]) => {
      // 1. 先把 oldItems 里的 temp 消息提取出来待检查
      let resultList = [...oldItems]

      newItems.forEach(newMsg => {
          // 如果新消息是自己发的，检查 oldItems 里有没有对应的 temp 消息
          if (newMsg.is_self) {
              const tempIndex = resultList.findIndex(local => 
                  local.id.toString().startsWith('temp_') && 
                  local.content === newMsg.content
              )
              // 如果找到了匹配的 temp 消息，直接移除它（因为我们要插入 real 消息了）
              if (tempIndex !== -1) {
                  resultList.splice(tempIndex, 1)
              }
          }

          // 检查 ID 是否已存在（防止重复添加）
          const exists = resultList.some(local => String(local.id) === String(newMsg.id))
          if (!exists) {
              resultList.push(newMsg)
          }
      })
      
      // 再次按时间排序
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

    // 监听 IM 实时消息 (处理在线时的推送)
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

            // 使用 mergeMessages 逻辑处理单条推送
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

    // 监听 IM 连接成功事件 (处理断线重连后的补洞)
    const onImConnected = () => {
        console.log('[ChatPage] IM已连接，执行消息补洞...')
        reconnectFetch()
    }
    Taro.eventCenter.on('IM_CONNECTED', onImConnected)

    // 监听 Token 刷新 (双重保险)
    const onTokenRefreshed = () => {
        // Token 刷新通常会触发 IM 重连，从而触发 onImConnected
        // 这里可以保留作为兜底，或者直接去掉交给 IM_CONNECTED 处理
        // 为了稳健，我们保留，但加个防抖标记也可以
        console.log('[ChatPage] Token刷新')
    }
    Taro.eventCenter.on('TOKEN_REFRESHED', onTokenRefreshed)

    // 初始加载
    fetchMessages(true)
    clearUnread()

    return () => {
      Taro.offKeyboardHeightChange(onKeyboardChange)
      Taro.eventCenter.off('IM_NEW_MESSAGE', onNewMessage)
      Taro.eventCenter.off('IM_CONNECTED', onImConnected) // 记得清理
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
      } catch(e) {}
  }

  // --- 补洞逻辑 ---
  const reconnectFetch = async () => {
    try {
      // 1. 获取本地最新一条消息的时间戳
      // 过滤掉 temp_ 消息，确保以服务端确认的时间为准
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
          
          // 过滤掉自己刚刚发的可能已经存在于本地的消息 (通过ID去重由 mergeMessages 完成)
          // 主要是为了打印日志看看补到了几条
          if (newMsgs.length > 0) {
              console.log(`[ChatPage] 补洞拉取到 ${newMsgs.length} 条消息`)
              
              setMsgList(prev => {
                  const merged = mergeMessages(prev, newMsgs)
                  // 如果列表变长了，或者是最新的一条消息变了，就滚动到底部
                  if (merged.length > prev.length || 
                     (merged.length > 0 && prev.length > 0 && merged[merged.length-1].id !== prev[prev.length-1].id)) {
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

  // 常规获取消息
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

        // 接口数据倒序 -> 正序
        const sortedMsgs = newMsgs.sort((a, b) => a.time - b.time)

        if (isRefresh) {
          setMsgList(sortedMsgs)
          scrollToBottom(sortedMsgs)
          setTimeout(() => setFirstLoaded(true), 200)
        } else {
          // 加载历史
          if (sortedMsgs.length > 0) {
             // 历史消息可以直接拼在前面，因为 mergeMessages 比较耗时且这里一般不涉及去重 temp
             // 但为了保险，也可以用 mergeMessages
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
      
      // 乐观更新
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
        if (typeof resData === 'string') try { resData = JSON.parse(resData) } catch(e){}
        
        // 发送成功，收到后端真实ID，更新本地
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