import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { isLoggedIn, requireLogin } from '@/utils/auth'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  resolveNotificationTargetUrl,
  type NotificationItem,
  type NotificationType,
} from '@/utils/notifications'
import './index.scss'

const TYPE_TITLES: Record<string, string> = {
  system: '系统消息',
  interaction: '互动通知',
  payment: '支付消息',
}

const formatTime = (value: string) => {
  if (!value) return ''
  const date = new Date(value.replace(/-/g, '/'))
  if (Number.isNaN(date.getTime())) return value
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const isToday = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  if (isToday) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function NotificationPage() {
  const router = useRouter()
  const type = String(router.params?.type || '') as NotificationType | ''
  const pageTitle = TYPE_TITLES[type] || '消息通知'

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [navBarPaddingRight, setNavBarPaddingRight] = useState(0)
  const [list, setList] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const loadList = async (nextPage: number) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetchNotifications(type || undefined, nextPage, 20)
      setList((prev) => (nextPage === 1 ? res.list : [...prev, ...res.list]))
      setTotal(res.total)
      setPage(nextPage)
    } finally {
      setLoading(false)
      setInitialLoaded(true)
    }
  }

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    setNavBarHeight((menuInfo.top - sbHeight) * 2 + menuInfo.height || 44)
    // 右侧给小程序胶囊让位，否则「全部已读」被胶囊挡住点不到
    setNavBarPaddingRight((sysInfo.screenWidth - menuInfo.left) + 8)

    if (!isLoggedIn()) {
      requireLogin()
      return
    }
    void loadList(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasMore = list.length < total
  const hasUnread = list.some((item) => !item.is_read)

  const handleMarkAllRead = async () => {
    if (markingAll || !hasUnread) return
    setMarkingAll(true)
    const previous = list
    setList((prev) => prev.map((item) => ({ ...item, is_read: true })))
    try {
      await markAllNotificationsRead(type || undefined)
      Taro.showToast({ title: '已全部已读', icon: 'success' })
    } catch (error) {
      setList(previous)
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setMarkingAll(false)
    }
  }

  const handleOpenItem = async (item: NotificationItem) => {
    if (!item.is_read) {
      setList((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_read: true } : it)))
      markNotificationsRead([item.id]).catch(() => {})
    }
    const url = resolveNotificationTargetUrl(item.payload)
    if (url) {
      Taro.navigateTo({ url })
    }
  }

  return (
    <View className='notification-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${navBarPaddingRight}px` }}>
        <View className='nav-back' onClick={() => Taro.navigateBack()}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        {/* 标题相对整条导航栏绝对居中，不受左右按钮宽度影响 */}
        <Text
          className='nav-title'
          style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px`, lineHeight: `${navBarHeight}px` }}
        >
          {pageTitle}
        </Text>
        <View className={`nav-action ${!hasUnread ? 'disabled' : ''}`} onClick={handleMarkAllRead}>
          <Text>{markingAll ? '处理中' : '全部已读'}</Text>
        </View>
      </View>

      <ScrollView
        scrollY
        className='notification-scroll'
        style={{ marginTop: `${statusBarHeight + navBarHeight}px` }}
        onScrollToLower={() => { if (hasMore && !loading) void loadList(page + 1) }}
      >
        {!initialLoaded && <Text className='state-text'>加载中...</Text>}
        {initialLoaded && list.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-title'>暂无通知</Text>
            <Text className='empty-sub'>有新的{pageTitle}会第一时间出现在这里</Text>
          </View>
        )}

        {list.map((item) => {
          const targetUrl = resolveNotificationTargetUrl(item.payload)
          return (
            <View key={item.id} className='notice-item' onClick={() => void handleOpenItem(item)}>
              <View className={`notice-dot ${item.is_read ? 'read' : ''}`} />
              <View className='notice-main'>
                <View className='notice-top'>
                  <Text className='notice-title'>{item.title || pageTitle}</Text>
                  <Text className='notice-time'>{formatTime(item.created_at)}</Text>
                </View>
                {!!item.content && <Text className='notice-content'>{item.content}</Text>}
              </View>
              {!!targetUrl && <AtIcon value='chevron-right' size='16' color='rgba(255,255,255,0.3)' />}
            </View>
          )
        })}

        {loading && initialLoaded && <Text className='state-text'>加载中...</Text>}
        {!hasMore && list.length > 0 && <Text className='state-text dim'>没有更多了</Text>}
        <View style={{ height: '40px' }} />
      </ScrollView>
    </View>
  )
}
