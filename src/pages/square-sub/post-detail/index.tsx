import { View, Text, Image, Swiper, SwiperItem, ScrollView, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon, AtActivityIndicator, AtFloatLayout } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import 'taro-ui/dist/style/components/float-layout.scss'
import lightningFilledIcon from '@/assets/icons/lightning.svg'
import lightningOutlineIcon from '@/assets/icons/lightning-outline.svg'
import { request } from '../../../utils/request'
import { requireLogin } from '../../../utils/auth'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface NoteMedia { url: string; thumbnail_url: string; width: number; height: number; type?: number }
interface NoteLocation { lat: number; lng: number; name: string }
interface UserInfo { user_id: string; user_hash_id?: string; nickname: string; avatar: string }
interface NoteTopic { id: number; name: string }
interface NoteActivity {
  id: string
  name: string
  location_name?: string
  images?: string[]
  business_hours?: string
  detail_url?: string
  is_subscribe?: boolean
  organizer_id?: string
  organizer_name?: string
  organizer_logo?: string
}

interface NoteDetail {
  id: string; user_id: string; title: string; content: string;
  location: NoteLocation; media_data: NoteMedia[]; type: number; topic_ids: number[];
  topic?: NoteTopic[]; activity?: NoteActivity | null;
  status: number; visible_conf: number; created_at: string;
  nickname: string; avatar: string;
  like_count: number; coll_count: number; comment_count: number;
  is_liked: boolean; is_collected: boolean; is_followed: boolean;
}

interface ReplyItem {
  id: string; root_id: string; parent_id: string; content: string;
  like_count: number; is_liked: boolean; ip_location: string; created_at: string;
  user: UserInfo; reply_to_user: UserInfo;
}

interface CommentItem {
  id: string; note_id: string; user_id: string | number; user_hash_id?: string; content: string;
  like_count: number; reply_count: number; ip_location: string; is_liked: boolean; created_at: string;
  user: UserInfo;
  latest_replies: ReplyItem[];
  reply_cursor?: string;
  reply_has_more?: boolean;
  reply_loading?: boolean;
}

interface ReplyTarget {
  type: 'note' | 'comment' | 'reply';
  id: string; root_id: string; parent_id: string; user: UserInfo;
}

interface SessionItem {
  session_type: number;
  peer_id: number;
  last_msg: string;
  last_msg_time: number;
  unread: number;
  is_top: number;
  is_mute: number;
  peer_avatar: string;
  peer_name: string;
}

const readText = (value: unknown) => String(value ?? '').trim()

const readImageSource = (value: any): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap(readImageSource)
  if (typeof value === 'object') return [value.url, value.thumbnail_url, value.poster_url].map(readText).filter(Boolean)

  const text = readText(value)
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      return readImageSource(JSON.parse(text))
    } catch (_e) {}
  }
  return text.split(',').map(item => item.trim()).filter(Boolean)
}

const normalizeActivityImages = (activity: any): string[] => Array.from(new Set([
  ...readImageSource(activity?.poster_list),
  ...readImageSource(activity?.poster_detail),
  ...readImageSource(activity?.images),
]))

const formatActivityTimeRange = (startTime: unknown, endTime: unknown) => {
  const fmt = (value: unknown) => {
    const text = String(value ?? '').trim()
    if (!text) return ''
    return text.replace(
      /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?/g,
      '$1-$2-$3 $4:$5',
    )
  }
  const start = fmt(startTime)
  const end = fmt(endTime)
  if (start && end) return `${start} - ${end}`
  return start || end
}

export default function PostDetailPage() {
  const router = useRouter()
  const { id } = router.params

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [navBarPaddingRight, setNavBarPaddingRight] = useState(0)

  const [, setCurrentMedia] = useState(0)
  const [note, setNote] = useState<NoteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [commentList, setCommentList] = useState<CommentItem[]>([])
  const [commentCursor, setCommentCursor] = useState<string>('0')
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [isCommentLoading, setIsCommentLoading] = useState(false)
  const [collectPending, setCollectPending] = useState(false)

  const [inputText, setInputText] = useState('')
  const [inputFocus, setInputFocus] = useState(false)
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)

  const [showShareModal, setShowShareModal] = useState(false)
  const [sessionList, setSessionList] = useState<SessionItem[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [selectedShareSession, setSelectedShareSession] = useState<SessionItem | null>(null)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    setNavBarPaddingRight((sysInfo.screenWidth - menuInfo.left) + 8)

    if (id) {
      fetchNoteDetail(id)
      fetchComments(id, true)
    } else {
      setLoading(false)
    }
  }, [id])

  // Parse string response and keep 16+ digit IDs as strings.
  const parseJSONWithBigInt = (jsonStr: string) => {
    if (typeof jsonStr !== 'string') return jsonStr
    try {
      let fixedStr = jsonStr.replace(/"(id|user_id|note_id|root_id|parent_id|next_cursor|reply_to_user_id|peer_id)":\s*(\d{16,})/g, '"$1": "$2"')
      return JSON.parse(fixedStr)
    } catch (e) { return {} }
  }

  const fetchNoteDetail = async (noteId: string) => {
    try {
      const token = Taro.getStorageSync('access_token')
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/${noteId}`,
        method: 'GET',
        header: token ? { 'Authorization': `Bearer ${token}` } : {},
        dataType: 'string', responseType: 'text'
      })
      const resBody = parseJSONWithBigInt(res.data as string)
      if (resBody && resBody.code === 200 && resBody.data) {
        const data = resBody.data
        let mediaList: NoteMedia[] = []
        if (data.media_data) {
          if (Array.isArray(data.media_data)) mediaList = data.media_data
          else if (typeof data.media_data === 'object') mediaList = [data.media_data]
        }
        const topicList: NoteTopic[] = Array.isArray(data.topic)
          ? data.topic
            .map((item: any) => ({
              id: Number(item?.id) || 0,
              name: String(item?.name || '').trim()
            }))
            .filter((item: NoteTopic) => item.id > 0 && item.name)
          : []
        const activity = data.activity && typeof data.activity === 'object'
          ? {
            id: String(data.activity.id || ''),
            name: String(data.activity.name || '').trim(),
            location_name: String(data.activity.address || data.activity.location_name || '').trim(),
            images: normalizeActivityImages(data.activity),
            business_hours: formatActivityTimeRange(data.activity.start_time, data.activity.end_time) || String(data.activity.business_hours || '').trim(),
            detail_url: String(data.activity.detail_url || '').trim(),
            is_subscribe: Boolean(data.activity.is_subscribe),
            organizer_id: String(data.activity.organizer_id || '').trim(),
            organizer_name: String(data.activity.organizer_name || '').trim(),
            organizer_logo: String(data.activity.organizer_logo || '').trim()
          }
          : null
        setNote({
          ...data,
          id: String(data.id),
          media_data: mediaList,
          topic: topicList,
          activity: activity?.id && activity.name ? activity : null,
          topic_ids: Array.isArray(data.topic_ids) ? data.topic_ids : []
        })
      }
    } catch (e) {
      console.error('获取详情失败', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (noteId: string, isRefresh = false) => {
    if (isCommentLoading || (!isRefresh && !hasMoreComments)) return
    setIsCommentLoading(true)
    try {
      const cursor = isRefresh ? '0' : commentCursor
      const token = Taro.getStorageSync('access_token')
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/comments/list/${noteId}`,
        method: 'GET',
        data: { cursor, page_size: 20 },
        header: token ? { 'Authorization': `Bearer ${token}` } : {},
        dataType: 'string', responseType: 'text'
      })
      const resBody = parseJSONWithBigInt(res.data as string)
      if (resBody.code === 200 && resBody.data) {
        const { comments, next_cursor, has_more } = resBody.data
        const newComments = (comments || []).map((item: CommentItem) => ({
          ...item,
          latest_replies: Array.isArray(item.latest_replies) ? item.latest_replies : [],
          reply_has_more: item.reply_count > (item.latest_replies?.length || 0),
          reply_cursor: '0',
          reply_loading: false
        }))
        if (isRefresh) setCommentList(newComments)
        else setCommentList(prev => [...prev, ...newComments])
        setCommentCursor(String(next_cursor))
        setHasMoreComments(has_more)
      }
    } catch (e) {
      console.error('获取评论失败', e)
    } finally {
      setIsCommentLoading(false)
    }
  }

  const fetchReplies = async (rootId: string, isRefresh = false) => {
    const commentIndex = commentList.findIndex(c => c.id === rootId)
    if (commentIndex === -1) return
    const comment = commentList[commentIndex]
    if (!isRefresh && !comment.reply_has_more) return

    setCommentList(prev => {
      const newList = [...prev]
      newList[commentIndex] = { ...newList[commentIndex], reply_loading: true }
      return newList
    })

    try {
      const cursor = isRefresh ? '0' : comment.reply_cursor || '0'
      const token = Taro.getStorageSync('access_token')
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/comments/replies/${rootId}`,
        method: 'GET',
        data: { cursor, page_size: 10 },
        header: token ? { 'Authorization': `Bearer ${token}` } : {},
        dataType: 'string', responseType: 'text'
      })
      const resBody = parseJSONWithBigInt(res.data as string)
      if (resBody.code === 200 && resBody.data) {
        const { replies, next_cursor, has_more } = resBody.data
        const newReplies = replies || []
        setCommentList(prev => {
          const newList = [...prev]
          const target = newList[commentIndex]
          if (!target) return prev
          const currentReplies = Array.isArray(target.latest_replies) ? target.latest_replies : []
          const existingIds = new Set(currentReplies.map(r => r.id))
          const uniqueNewReplies = newReplies.filter((r: ReplyItem) => !existingIds.has(r.id))

          newList[commentIndex] = {
            ...target,
            latest_replies: isRefresh ? newReplies : [...currentReplies, ...uniqueNewReplies],
            reply_cursor: String(next_cursor),
            reply_has_more: has_more,
            reply_loading: false
          }
          return newList
        })
      } else {
        setCommentList(prev => {
          const newList = [...prev]
          newList[commentIndex] = { ...newList[commentIndex], reply_loading: false }
          return newList
        })
      }
    } catch(e) {
      setCommentList(prev => {
        const newList = [...prev]
        newList[commentIndex] = { ...newList[commentIndex], reply_loading: false }
        return newList
      })
    }
  }

  const onClickReply = (type: 'note'|'comment'|'reply', item: any, rootId: string = '0') => {
    setReplyTarget({
      type,
      id: item.id,
      root_id: rootId,
      parent_id: type === 'note' ? '0' : item.id,
      user: type === 'note' ? { nickname: note?.nickname || '' } as any : item.user
    })
    setInputFocus(true)
  }

  const getCurrentCommentUser = (): UserInfo => {
    const userInfo = Taro.getStorageSync('userInfo') || {}
    const uid = userInfo.user_id ?? userInfo.id ?? userInfo.uid ?? ''
    return {
      user_id: String(uid),
      user_hash_id: String(userInfo.user_hash_id || userInfo.user_id || ''),
      nickname: String(userInfo.nickname || userInfo.nickName || '我'),
      avatar: String(userInfo.avatar_url || userInfo.avatar || '')
    }
  }

  const appendSentComment = (target: ReplyTarget | { type: string; id: string; root_id: string; parent_id: string; user: null }, responseData: any, content: string) => {
    const currentUser = getCurrentCommentUser()
    const createdAt = responseData?.created_at || new Date().toISOString()
    const newId = String(responseData?.id || responseData?.comment_id || responseData?.reply_id || `local_${Date.now()}`)

    if (target.root_id === '0') {
      const nextComment: CommentItem = {
        id: newId,
        note_id: String(note?.id || ''),
        user_id: currentUser.user_id,
        content,
        like_count: 0,
        reply_count: 0,
        ip_location: '',
        is_liked: false,
        created_at: createdAt,
        user: currentUser,
        latest_replies: [],
        reply_cursor: '0',
        reply_has_more: false,
        reply_loading: false
      }
      setCommentList(prev => [nextComment, ...prev.filter(item => String(item.id) !== newId)])
      setNote(prev => prev ? ({ ...prev, comment_count: prev.comment_count + 1 }) : prev)
      return
    }

    const nextReply: ReplyItem = {
      id: newId,
      root_id: target.root_id,
      parent_id: target.parent_id,
      content,
      like_count: 0,
      is_liked: false,
      ip_location: '',
      created_at: createdAt,
      user: currentUser,
      reply_to_user: target.user || currentUser
    }

    setCommentList(prev => prev.map(comment => {
      if (String(comment.id) !== String(target.root_id)) return comment
      const currentReplies = Array.isArray(comment.latest_replies) ? comment.latest_replies : []
      const exists = currentReplies.some(reply => String(reply.id) === newId)
      return {
        ...comment,
        reply_count: comment.reply_count + (exists ? 0 : 1),
        latest_replies: exists ? currentReplies : [...currentReplies, nextReply]
      }
    }))
    setNote(prev => prev ? ({ ...prev, comment_count: prev.comment_count + 1 }) : prev)
  }

  const handleSend = async () => {
    if (!requireLogin()) return
    const contentToSend = inputText.trim()
    if (!contentToSend) { Taro.showToast({ title: '说点什么吧', icon: 'none' }); return }
    if (!note) return
    Taro.showLoading({ title: '发送中' })
    try {
      const target = replyTarget || { type: 'note', id: note.id, root_id: '0', parent_id: '0', user: null }
      const payload = {
        note_id: note.id, content: contentToSend, root_id: target.root_id, parent_id: target.parent_id,
        reply_to_user_id: target.user ? target.user.user_id : '0'
      }
      const res = await request({ url: '/api/v1/comments/create', method: 'POST', data: payload })
      Taro.hideLoading()
      const resData: any = res.data
      if (resData && resData.code === 200) {
        Taro.showToast({ title: '评论成功', icon: 'success' })
        appendSentComment(target, resData.data, contentToSend)
        setInputText('')
        setInputFocus(false)
        setReplyTarget(null)
        setTimeout(() => {
          if (target.root_id === '0') fetchComments(note.id, true)
          else fetchReplies(target.root_id, true)
        }, 600)
      } else {
        Taro.showToast({ title: resData?.msg || '失败', icon: 'none' })
      }
    } catch (e) {
      Taro.hideLoading()
      console.error('发送评论失败', e)
      Taro.showToast({ title: '失败', icon: 'none' })
    }
  }

  const handleLikeItem = async (
    type: 'comment' | 'reply',
    commentId: string,
    isLiked: boolean,
    parentCommentId?: string
  ) => {
    if (!requireLogin()) return
    const url = isLiked ? '/api/v1/comments/unlike' : '/api/v1/comments/like'

    if (type === 'comment') {
      setCommentList(prev =>
        prev.map(c =>
          c.id === commentId
            ? { ...c, is_liked: !isLiked, like_count: isLiked ? c.like_count - 1 : c.like_count + 1 }
            : c
        )
      )
    } else if (type === 'reply' && parentCommentId) {
      setCommentList(prev =>
        prev.map(c =>
            c.id === parentCommentId
              ? {
                ...c,
              latest_replies: (Array.isArray(c.latest_replies) ? c.latest_replies : []).map(r =>
                r.id === commentId
                  ? { ...r, is_liked: !isLiked, like_count: isLiked ? r.like_count - 1 : r.like_count + 1 }
                  : r
              )
            }
            : c
        )
      )
    }

    try {
      await request({ url, method: 'POST', data: { comment_id: commentId } })
    } catch (e) {
      console.error('点赞失败', e)
    }
  }

  const handleToggleLike = async () => {
    if (!requireLogin()) return
    if (!note) return
    const oldIsLiked = note.is_liked
    const oldLikeCount = note.like_count
    const newIsLiked = !oldIsLiked
    const newLikeCount = oldIsLiked ? oldLikeCount - 1 : oldLikeCount + 1

    setNote(prev => prev ? ({ ...prev, is_liked: newIsLiked, like_count: newLikeCount }) : null)

    try {
      const method = newIsLiked ? 'POST' : 'DELETE'
      const res = await request({ url: `/api/v1/note/${note.id}/like`, method: method })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) throw new Error((res as any)?.data?.msg || '操作失败')
    } catch (e) {
      setNote(prev => prev ? ({ ...prev, is_liked: oldIsLiked, like_count: oldLikeCount }) : null)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleToggleCollect = async () => {
    if (!requireLogin()) return
    if (!note || collectPending) return
    const oldIsCollected = note.is_collected
    const oldCollCount = note.coll_count
    const newIsCollected = !oldIsCollected
    const newCollCount = Math.max(0, oldIsCollected ? oldCollCount - 1 : oldCollCount + 1)

    setCollectPending(true)
    setNote(prev => prev ? ({ ...prev, is_collected: newIsCollected, coll_count: newCollCount }) : null)

    try {
      const method = newIsCollected ? 'POST' : 'DELETE'
      const res = await request({ url: `/api/v1/note/${note.id}/collect`, method })
      const code = Number((res as any)?.data?.code)
      if (code !== 200) throw new Error((res as any)?.data?.msg || '操作失败')
      // 收藏接口幂等（见 docs/note_collection_api_20260804.md），以服务端返回的最终状态为准
      const serverCollected = (res as any)?.data?.data?.collected
      if (typeof serverCollected === 'boolean' && serverCollected !== newIsCollected) {
        setNote(prev => prev ? ({ ...prev, is_collected: serverCollected }) : null)
      }
    } catch (e) {
      setNote(prev => prev ? ({ ...prev, is_collected: oldIsCollected, coll_count: oldCollCount }) : null)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setCollectPending(false)
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return `${date.getMonth()+1}-${date.getDate()}`
  }

  const handlePreviewImage = (url) => {
    Taro.previewImage({ current: url, urls: note?.media_data.map(m=>m.url)||[] })
  }

  const handleOpenUserProfile = (e) => {
    e?.stopPropagation?.()
    if (!note?.user_id) return
    Taro.navigateTo({ url: `/pages/user-sub/profile/index?userId=${note.user_id}` })
  }

  const handleOpenActivity = () => {
    if (!note?.activity?.id) return
    Taro.navigateTo({ url: `/pages/activity/index?id=${note.activity.id}` })
  }

  const handleBack = () => {
    const pages = Taro.getCurrentPages?.() || []
    if (pages.length > 1) {
      Taro.navigateBack()
      return
    }
    Taro.switchTab({ url: '/pages/square/index' }).catch(() => {
      Taro.reLaunch({ url: '/pages/square/index' })
    })
  }

  const handleToggleFollow = async (e) => {
    if (!requireLogin()) return
    e?.stopPropagation?.()
    if (!note) return

    const nextFollowed = !note.is_followed
    const action = nextFollowed ? 'follow' : 'unfollow'

    setNote(prev => prev ? ({ ...prev, is_followed: nextFollowed }) : prev)

    try {
      const res = await request({
        url: `/api/v1/follow/${action}`,
        method: 'POST',
        data: { user_id: String(note.user_id) }
      })
      const resData: any = res.data
      if (!resData || resData.code !== 200) throw new Error(resData?.msg || '操作失败')
      Taro.showToast({ title: nextFollowed ? '已关注' : '已取消关注', icon: 'success' })
    } catch (err) {
      setNote(prev => prev ? ({ ...prev, is_followed: !nextFollowed }) : prev)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  // 获取会话列表
  const fetchSessionList = async () => {
    setLoadingSession(true)
    try {
      const res = await request({
        url: '/api/v1/session/',
        method: 'GET'
      })

      let resData: any = res.data
      if (typeof resData === 'string') {
        try { resData = parseJSONWithBigInt(resData) } catch (e) {}
      }

      if (resData && resData.code === 200 && resData.data) {
        setSessionList(resData.data.list || [])
      }
    } catch (e) {
      console.error('获取会话列表失败', e)
      Taro.showToast({ title: '获取会话列表失败', icon: 'none' })
    } finally {
      setLoadingSession(false)
    }
  }

  // 打开分享弹窗
  const handleOpenShare = () => {
    if (!requireLogin()) return
    setShowShareModal(true)
    setShareMsg('')
    setSelectedShareSession(null)
    fetchSessionList()
  }

  // 分享到指定会话
  const handleShareToSession = async (session: SessionItem) => {
    if (!note) return

    Taro.showLoading({ title: '分享中...' })

    try {
      const res = await request({
        url: '/api/v1/message/send',
        method: 'POST',
        data: {
          target_id: String(session.peer_id),
          session_type: session.session_type,
          msg_type: 8,
          content: shareMsg || `分享帖子：${note.title}`,
          ext: {
            card_type: 'note_forward',
            note_id: note.id
          }
        }
      })

      Taro.hideLoading()

      let resData: any = res.data
      if (typeof resData === 'string') {
        try { resData = JSON.parse(resData) } catch (e) {}
      }

      if (resData && resData.code === 200) {
        Taro.showToast({ title: '分享成功', icon: 'success' })
        setShowShareModal(false)
        setShareMsg('')
        setSelectedShareSession(null)
      } else {
        Taro.showToast({ title: resData?.msg || '分享失败', icon: 'none' })
      }
    } catch (e) {
      Taro.hideLoading()
      console.error('分享失败', e)
      Taro.showToast({ title: '分享失败', icon: 'none' })
    }
  }

  const handleConfirmShare = () => {
    if (!selectedShareSession) {
      Taro.showToast({ title: '请选择会话', icon: 'none' })
      return
    }
    void handleShareToSession(selectedShareSession)
  }

  const handleDeleteNote = (e?: any) => {
    if (!requireLogin()) return
    e?.stopPropagation?.()
    if (!note) return
    Taro.showModal({
      title: '删除动态',
      content: '确认删除这条动态吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#FF2E4D',
      success: async (modalRes) => {
        if (!modalRes.confirm) return
        try {
          const res = await request({
            url: `/api/v1/note/${note.id}`,
            method: 'DELETE'
          })
          const body: any = res?.data
          if (body && body.code !== 200) throw new Error(body.msg || '删除失败')
          Taro.showToast({ title: body?.msg || '删除成功', icon: 'success' })
          handleBack()
        } catch (error: any) {
          Taro.showToast({ title: error?.message || '删除失败', icon: 'none' })
        }
      }
    })
  }

  const handleDeleteComment = (
    commentId: string,
    type: 'comment' | 'reply',
    parentCommentId?: string,
    e?: any
  ) => {
    if (!requireLogin()) return
    e?.stopPropagation?.()
    if (!commentId) return
    Taro.showModal({
      title: type === 'reply' ? '删除回复' : '删除评论',
      content: '确认删除这条内容吗？',
      confirmText: '删除',
      confirmColor: '#FF2E4D',
      success: async (modalRes) => {
        if (!modalRes.confirm) return
        try {
          const res = await request({
            url: '/api/v1/comments/delete',
            method: 'POST',
            data: { comment_id: commentId }
          })
          const body: any = res?.data
          if (body && body.code !== 200) throw new Error(body.msg || '删除失败')

          if (type === 'comment') {
            setCommentList(prev => prev.filter(comment => String(comment.id) !== String(commentId)))
          } else if (parentCommentId) {
            setCommentList(prev => prev.map(comment => {
              if (String(comment.id) !== String(parentCommentId)) return comment
              const currentReplies = Array.isArray(comment.latest_replies) ? comment.latest_replies : []
              return {
                ...comment,
                reply_count: Math.max(comment.reply_count - 1, 0),
                latest_replies: currentReplies.filter(reply => String(reply.id) !== String(commentId))
              }
            }))
          }
          setNote(prev => prev ? ({ ...prev, comment_count: Math.max(prev.comment_count - 1, 0) }) : prev)
          setReplyTarget(prev => prev && String(prev.id) === String(commentId) ? null : prev)
          Taro.showToast({ title: type === 'reply' ? '回复已删除' : '评论已删除', icon: 'success' })
        } catch (error: any) {
          Taro.showToast({ title: error?.message || '删除失败', icon: 'none' })
        }
      }
    })
  }

  if (loading) return <View className='post-detail-page loading-center'><AtActivityIndicator content='加载中...' color='#999' mode='center'/></View>
  if (!note) return <View className='post-detail-page loading-center'><Text style={{color: '#999'}}>内容不存在</Text></View>
  const currentUser = getCurrentCommentUser()
  const currentUserId = currentUser.user_id
  const isOwnNote = Boolean(currentUserId) && (
    String(note.user_id) === String(currentUserId) ||
    (note as any).user_hash_id === currentUser.user_hash_id
  )

  const isCommentOwner = (commentUserId: string | number, commentUser?: UserInfo) => {
    if (!currentUserId) return false
    // 优先用 user_hash_id 比对（后端统一的字符串 ID）
    if (commentUser?.user_hash_id && currentUser.user_hash_id && commentUser.user_hash_id === currentUser.user_hash_id) return true
    if (String(commentUserId) === String(currentUserId)) return true
    if (String(commentUserId) === String(currentUser.user_hash_id)) return true
    // 兜底：nickname
    if (commentUser?.nickname && currentUser.nickname && commentUser.nickname === currentUser.nickname) return true
    return false
  }

  return (
    <View className='post-detail-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${navBarPaddingRight}px` }}>
        <View className='left-area'>
          <View className='back-btn' onClick={handleBack}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
          <View className='user-mini' onClick={handleOpenUserProfile}>
            <Image src={note.avatar} className='avatar' mode='aspectFill'/>
            <Text className='name'>{note.nickname}</Text>
          </View>
        </View>
        <View className='right-area'>
          {isOwnNote ? (
            <View className='delete-note-btn' onClick={handleDeleteNote}>删除</View>
          ) : (
            <View className={`follow-btn ${note.is_followed ? 'followed' : ''}`} onClick={handleToggleFollow}>
              {note.is_followed ? '已关注' : '关注'}
            </View>
          )}
          <View onClick={handleOpenShare}>
            <AtIcon value='share' size='20' color='#fff' style={{marginLeft: '15px'}} />
          </View>
        </View>
      </View>

      <ScrollView scrollY className='detail-scroll'>
        <Swiper
          className='media-swiper'
          style={{ height: '500px' }}
          indicatorDots={note.media_data.length > 1}
          indicatorColor='rgba(255,255,255,0.3)'
          indicatorActiveColor='#FF2E4D'
          onChange={(e) => setCurrentMedia(e.detail.current)}
        >
          {note.media_data.map((item, idx) => (
            <SwiperItem key={idx}>
              <Image src={item.url} mode='aspectFill' className='media-img' onClick={() => handlePreviewImage(item.url)} />
            </SwiperItem>
          ))}
        </Swiper>

        <View className='content-body'>
          <Text className='post-title'>{note.title}</Text>
          <Text className='post-desc' selectable>{note.content}</Text>
          {!!note.topic?.length && (
            <View className='tags'>
              {note.topic.map((item) => (
                <Text key={item.id} className='tag'>#{item.name}</Text>
              ))}
            </View>
          )}
          <View className='post-meta'>
            <Text className='time'>{formatTime(note.created_at)}</Text>
            {note.location && note.location.name && <Text className='loc'>{note.location.name}</Text>}
          </View>
          {note.activity && (
            <View className='activity-preview-card' onClick={handleOpenActivity}>
              {!!note.activity.images?.[0] && (
                <Image
                  src={note.activity.images[0]}
                  mode='aspectFill'
                  className='activity-preview-cover'
                />
              )}
              <View className='activity-preview-body'>
                <Text className='activity-preview-title'>{note.activity.name}</Text>
                {!!note.activity.location_name && (
                  <Text className='activity-preview-location'>{note.activity.location_name}</Text>
                )}
                <View className='activity-preview-footer'>
                  <Text className='activity-preview-hours'>{note.activity.business_hours || '活动详情'}</Text>
                  <Text className='activity-preview-status'>{note.activity.is_subscribe ? '已订阅' : '查看活动'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View className='divider' />

        {/* 评论区 */}
        <View className='comment-section'>
          <Text className='comment-count'>共{note.comment_count}条评论</Text>

          {commentList.map(comment => (
            <View key={comment.id} className='comment-item'>
              <Image src={comment.user.avatar} className='c-avatar' mode='aspectFill' />
              <View className='c-content'>

                <View className='c-header-row'>
                  <Text className='c-user'>{comment.user.nickname}</Text>
                  {String(comment.user_id) === String(note.user_id) && <Text className='author-tag'>作者</Text>}

                  <View
                    className='c-like-wrap'
                    onClick={(e) => { e.stopPropagation(); handleLikeItem('comment', comment.id, comment.is_liked); }}
                  >
                    <Image
                      src={comment.is_liked ? lightningFilledIcon : lightningOutlineIcon}
                      className={`like-icon comment-like ${comment.is_liked ? 'liked-anim' : ''}`}
                      mode='aspectFit'
                    />
                    {comment.like_count > 0 && <Text className='num'>{comment.like_count}</Text>}
                  </View>
                </View>

                <Text className='c-text' onClick={() => onClickReply('comment', comment, comment.id)}>{comment.content}</Text>
                <View className='c-footer'>
                  <Text className='c-time'>{formatTime(comment.created_at)} {comment.ip_location}</Text>
                  <View className='c-action' onClick={(e) => { e.stopPropagation(); onClickReply('comment', comment, comment.id) }}><Text>回复</Text></View>
                  {isCommentOwner(comment.user_id, comment.user) && (
                    <View className='c-action delete' onClick={(e) => handleDeleteComment(comment.id, 'comment', undefined, e)}>
                      <Text>删除</Text>
                    </View>
                  )}
                </View>

                <View className='sub-reply-container'>
                  {comment.latest_replies && comment.latest_replies.map(reply => (
                    <View key={reply.id} className='sub-reply-item' onClick={(e) => { e.stopPropagation(); onClickReply('reply', reply, comment.id) }}>
                      <Image src={reply.user.avatar} className='sub-avatar' mode='aspectFill' />
                      <View className='sub-right'>

                        <View className='sub-header-row'>
                          <View className='sub-user-info'>
                            <Text className='sub-user'>{reply.user.nickname}</Text>
                            {String(reply.user.user_id) === String(note.user_id) && <Text className='author-tag mini'>作者</Text>}
                            {reply.reply_to_user && String(reply.reply_to_user.user_id) !== String(comment.user_id) && (
                              <>
                                <AtIcon value='chevron-right' size='10' color='#666' className='reply-arrow-icon'/>
                                <Text className='sub-target-user'>{reply.reply_to_user.nickname}</Text>
                              </>
                            )}
                          </View>

                          <View
                            className='sub-like-wrap'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeItem('reply', reply.id, reply.is_liked, comment.id);
                            }}
                          >
                            <Image
                              src={reply.is_liked ? lightningFilledIcon : lightningOutlineIcon}
                              className={`like-icon reply-like ${reply.is_liked ? 'liked-anim' : ''}`}
                              mode='aspectFit'
                            />
                            {reply.like_count > 0 && <Text className='num'>{reply.like_count}</Text>}
                          </View>
                        </View>

                        <Text className='sub-text'>{reply.content}</Text>
                        <View className='sub-footer-row'>
                          <Text className='sub-time'>{formatTime(reply.created_at)} {reply.ip_location}</Text>
                          <Text className='sub-reply-btn'>回复</Text>
                          {isCommentOwner(reply.user?.user_id ?? '', reply.user) && (
                            <Text
                              className='sub-delete-btn'
                              onClick={(e) => handleDeleteComment(reply.id, 'reply', comment.id, e)}
                            >
                              删除
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                  {comment.reply_has_more && (
                    <View className='expand-more-btn' onClick={(e) => { e.stopPropagation(); fetchReplies(comment.id) }}>
                      {comment.reply_loading ? (
                        <AtActivityIndicator content='加载中...' color='#666' />
                      ) : (
                        <>
                          <Text className='line-bar'></Text>
                          <Text className='expand-text'>展开更多回复</Text>
                          <AtIcon value='chevron-down' size='12' color='#666' />
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}

          {!isCommentLoading && hasMoreComments && (
            <View className='expand-more-btn' onClick={() => fetchComments(note.id)}>
              <Text className='line-bar'></Text>
              <Text className='expand-text'>展开更多评论</Text>
              <AtIcon value='chevron-down' size='12' color='#666' />
            </View>
          )}
          {isCommentLoading && <AtActivityIndicator content='加载中...' color='#666' />}
          {!hasMoreComments && commentList.length > 0 && <View className='no-more'>- 没有更多评论了 -</View>}
        </View>

        <View style={{height: '120px'}} />
      </ScrollView>

      {/* 底部 */}
      <View className='bottom-bar'>
        <View className='input-box' onClick={() => onClickReply('note', {id: note.id})}>
          <AtIcon value='edit' size='14' color='#999' style={{marginRight: '8px'}}/>
          <Text className='placeholder'>说点好听的...</Text>
        </View>
        <View className='icons'>
          <View className='icon-item' onClick={handleToggleLike}>
            <Image
              src={note.is_liked ? lightningFilledIcon : lightningOutlineIcon}
              className={`like-icon bottom-like ${note.is_liked ? 'liked-anim' : ''}`}
              mode='aspectFit'
            />
            <Text className='num'>{note.like_count}</Text>
          </View>
          <View className='icon-item' onClick={handleToggleCollect}>
            <AtIcon value={note.is_collected ? 'star-2' : 'star'} size='24' color={note.is_collected ? '#FFCC00' : '#fff'} className={note.is_collected ? 'liked-anim' : ''}/>
            <Text className='num'>{note.coll_count}</Text>
          </View>
        </View>
      </View>

      {/* 评论输入框 */}
      {inputFocus && (
        <View className='comment-input-mask' onClick={() => setInputFocus(false)}>
          <View className='real-input-bar' onClick={e => e.stopPropagation()}>
            <Input
              className='real-input'
              placeholder={replyTarget ? `回复 ${replyTarget.user.nickname}` : '说点什么吧...'}
              focus={inputFocus}
              value={inputText}
              onInput={e => setInputText(e.detail.value)}
              cursorSpacing={20}
              confirmType='send'
              onConfirm={handleSend}
              holdKeyboard
            />
            <View className='send-btn' onClick={handleSend}>发送</View>
          </View>
        </View>
      )}

      {/* 分享弹窗 */}
      <AtFloatLayout
        isOpened={showShareModal}
        title='分享到'
        onClose={() => {
          setShowShareModal(false)
          setSelectedShareSession(null)
        }}
      >
        <View className='share-modal'>
          <View className='share-input-box'>
            <Input
              className='share-input'
              placeholder='说点什么吧...（可选）'
              value={shareMsg}
              onInput={e => setShareMsg(e.detail.value)}
              maxlength={100}
            />
          </View>

          <ScrollView scrollY className='session-list'>
            {loadingSession && (
              <View className='loading-wrap'>
                <AtActivityIndicator content='加载中...' color='#999' />
              </View>
            )}

            {!loadingSession && sessionList.length === 0 && (
              <View className='empty-wrap'>
                <Text className='empty-text'>暂无会话</Text>
              </View>
            )}

            {!loadingSession && sessionList.map(session => (
              <View
                key={`${session.session_type}_${session.peer_id}`}
                className={`session-item ${selectedShareSession?.peer_id === session.peer_id && selectedShareSession?.session_type === session.session_type ? 'selected' : ''}`}
                onClick={() => setSelectedShareSession(session)}
              >
                <Image
                  src={session.peer_avatar ? decodeURIComponent(session.peer_avatar) : ''}
                  className='session-avatar'
                  mode='aspectFill'
                />
                <View className='session-info'>
                  <Text className='session-name'>{session.peer_name || '未命名会话'}</Text>
                  <Text className='session-type'>
                    {session.session_type === 2 ? '群聊' : '私聊'}
                  </Text>
                </View>
                <AtIcon value={selectedShareSession?.peer_id === session.peer_id && selectedShareSession?.session_type === session.session_type ? 'check' : 'chevron-right'} size='20' color='#999' />
              </View>
            ))}
          </ScrollView>
          <View className={`share-confirm-btn ${selectedShareSession ? 'enabled' : ''}`} onClick={handleConfirmShare}>
            确认分享
          </View>
        </View>
      </AtFloatLayout>
    </View>
  )
}
