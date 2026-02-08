import { View, Text, Image, Swiper, SwiperItem, ScrollView, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon, AtActivityIndicator } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import 'taro-ui/dist/style/components/float-layout.scss'
import { request } from '../../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface NoteMedia { url: string; thumbnail_url: string; width: number; height: number; type?: number }
interface NoteLocation { lat: number; lng: number; name: string }
interface UserInfo { user_id: string; nickname: string; avatar: string }

interface NoteDetail {
  id: string; user_id: string; title: string; content: string;
  location: NoteLocation; media_data: NoteMedia[]; type: number; topic_ids: number[];
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
  id: string; note_id: string; user_id: string; content: string;
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

  const [inputText, setInputText] = useState('')
  const [inputFocus, setInputFocus] = useState(false)
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)



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
    }
  }, [id])

  // Parse string response and keep 16+ digit IDs as strings.
  const parseJSONWithBigInt = (jsonStr: string) => {
    if (typeof jsonStr !== 'string') return jsonStr
    try {
      let fixedStr = jsonStr.replace(/"(id|user_id|note_id|root_id|parent_id|next_cursor|reply_to_user_id)":\s*(\d{16,})/g, '"$1": "$2"')
      return JSON.parse(fixedStr)
    } catch (e) { return {} }
  }

  const fetchNoteDetail = async (noteId: string) => {
    try {
      const token = Taro.getStorageSync('access_token')
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/${noteId}`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${token}` },
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
        setNote({ ...data, id: String(data.id), media_data: mediaList, topic_ids: data.topic_ids || [] })
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
         header: { 'Authorization': `Bearer ${token}` },
         dataType: 'string', responseType: 'text'
      })
      const resBody = parseJSONWithBigInt(res.data as string)
      if (resBody.code === 200 && resBody.data) {
          const { comments, next_cursor, has_more } = resBody.data
          const newComments = (comments || []).map((item: CommentItem) => ({
              ...item,
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

    // Set local loading
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
         header: { 'Authorization': `Bearer ${token}` },
         dataType: 'string', responseType: 'text'
      })
      const resBody = parseJSONWithBigInt(res.data as string)
      if (resBody.code === 200 && resBody.data) {
          const { replies, next_cursor, has_more } = resBody.data
          const newReplies = replies || []
          setCommentList(prev => {
              const newList = [...prev]
              const target = newList[commentIndex]
              // De-duplicate replies by id.
              const existingIds = new Set(target.latest_replies.map(r => r.id))
              const uniqueNewReplies = newReplies.filter((r: ReplyItem) => !existingIds.has(r.id))

              newList[commentIndex] = {
                  ...target,
                  latest_replies: isRefresh ? newReplies : [...target.latest_replies, ...uniqueNewReplies],
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

  const handleSend = async () => {
      if (!inputText.trim()) { Taro.showToast({ title: '说点什么吧', icon: 'none' }); return }
      if (!note) return
      Taro.showLoading({ title: '发送中' })
      try {
          const target = replyTarget || { type: 'note', id: note.id, root_id: '0', parent_id: '0', user: null }
          const payload = {
              note_id: note.id, content: inputText, root_id: target.root_id, parent_id: target.parent_id,
              reply_to_user_id: target.user ? target.user.user_id : '0'
          }
          const res = await request({ url: '/api/v1/comments/create', method: 'POST', data: payload })
          Taro.hideLoading()
          const resData: any = res.data
          if (resData && resData.code === 200) {
              Taro.showToast({ title: '评论成功', icon: 'success' })
              setInputText('')
              setInputFocus(false)
              setReplyTarget(null)
              if (target.root_id === '0') fetchComments(note.id, true)
              else fetchReplies(target.root_id, true)
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
                latest_replies: c.latest_replies.map(r =>
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
    if (!note) return
    const oldIsLiked = note.is_liked
    const oldLikeCount = note.like_count
    const newIsLiked = !oldIsLiked
    const newLikeCount = oldIsLiked ? oldLikeCount - 1 : oldLikeCount + 1

    setNote(prev => prev ? ({ ...prev, is_liked: newIsLiked, like_count: newLikeCount }) : null)

    try {
        const method = newIsLiked ? 'POST' : 'DELETE'
        await request({ url: `/api/v1/note/${note.id}/like`, method: method })
    } catch (e) {
        setNote(prev => prev ? ({ ...prev, is_liked: oldIsLiked, like_count: oldLikeCount }) : null)
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

  const handleToggleFollow = async (e) => {
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

  if (loading) return <View className='post-detail-page loading-center'><AtActivityIndicator content='加载中...' color='#999' mode='center'/></View>
  if (!note) return <View className='post-detail-page loading-center'><Text style={{color: '#999'}}>内容不存在</Text></View>

  return (
    <View className='post-detail-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${navBarPaddingRight}px` }}>
         <View className='left-area'>
            <View className='back-btn' onClick={() => Taro.navigateBack()}>
               <AtIcon value='chevron-left' size='24' color='#fff' />
            </View>
            <View className='user-mini' onClick={handleOpenUserProfile}>
               <Image src={note.avatar} className='avatar' mode='aspectFill'/>
               <Text className='name'>{note.nickname}</Text>
            </View>
         </View>
         <View className='right-area'>
            <View className={`follow-btn ${note.is_followed ? 'followed' : ''}`} onClick={handleToggleFollow}>
              {note.is_followed ? '已关注' : '关注'}
            </View>
            <AtIcon value='share' size='20' color='#fff' style={{marginLeft: '15px'}} />
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
            {note.topic_ids && note.topic_ids.length > 0 && (<View className='tags'>{note.topic_ids.map(tid => <Text key={tid} className='tag'>#话题{tid}</Text>)}</View>)}
            <View className='post-meta'>
                <Text className='time'>{formatTime(note.created_at)}</Text>
                {note.location && note.location.name && <Text className='loc'>{note.location.name}</Text>}
            </View>
         </View>

         <View className='divider' />

         {/* 评论区 */}
         <View className='comment-section'>
            <Text className='comment-count'>共{note.comment_count} 条评论</Text>

            {commentList.map(comment => (
                <View key={comment.id} className='comment-item'>
                    <Image src={comment.user.avatar} className='c-avatar' mode='aspectFill' />
                    <View className='c-content'>

                        {/* Header: user + like */}
                        <View className='c-header-row'>
                            <Text className='c-user'>{comment.user.nickname}</Text>
                            {String(comment.user_id) === String(note.user_id) && <Text className='author-tag'>作者</Text>}

                            <View
                              className='c-like-wrap'
                              onClick={(e) => { e.stopPropagation(); handleLikeItem('comment', comment.id, comment.is_liked); }}
                            >
                                <AtIcon
                                  value={comment.is_liked ? 'heart-2' : 'heart'}
                                  size='12'
                                  color={comment.is_liked ? '#FF2E4D' : '#666'}
                                  className={comment.is_liked ? 'liked-anim' : ''}
                                />
                                {comment.like_count > 0 && <Text className='num'>{comment.like_count}</Text>}
                            </View>
                        </View>

                        <Text className='c-text' onClick={() => onClickReply('comment', comment, comment.id)}>{comment.content}</Text>
                        <View className='c-footer'>
                            <Text className='c-time'>{formatTime(comment.created_at)} {comment.ip_location}</Text>
                            <View className='c-action' onClick={(e) => { e.stopPropagation(); onClickReply('comment', comment, comment.id) }}><Text>回复</Text></View>
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
                                                    // Pass parentCommentId to update state.
                                                    handleLikeItem('reply', reply.id, reply.is_liked, comment.id);
                                                }}
                                            >
                                                <AtIcon
                                                  value={reply.is_liked?'heart-2':'heart'}
                                                  size='10'
                                                  color={reply.is_liked?'#FF2E4D':'#666'}
                                                  className={reply.is_liked ? 'liked-anim' : ''}
                                                />
                                                {reply.like_count > 0 && <Text className='num'>{reply.like_count}</Text>}
                                            </View>
                                        </View>

                                        <Text className='sub-text'>{reply.content}</Text>
                                        <View className='sub-footer-row'>
                                            <Text className='sub-time'>{formatTime(reply.created_at)} {reply.ip_location}</Text>
                                            <Text className='sub-reply-btn'>回复</Text>
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
                <AtIcon value={note.is_liked ? 'heart-2' : 'heart'} size='24' color={note.is_liked ? '#FF2E4D' : '#fff'} className={note.is_liked ? 'liked-anim' : ''} />
                <Text className='num'>{note.like_count}</Text>
            </View>
            <View className='icon-item'>
                <AtIcon value={note.is_collected ? 'star-2' : 'star'} size='24' color={note.is_collected ? '#FFCC00' : '#fff'} className={note.is_collected ? 'liked-anim' : ''}/>
                <Text className='num'>{note.coll_count}</Text>
            </View>
         </View>
      </View>

         {/* 评论区 */}
      {inputFocus && (
          <View className='comment-input-mask' onClick={() => setInputFocus(false)}>
              <View className='real-input-bar' onClick={e => e.stopPropagation()}>
                  <Input
                    className='real-input'
                    placeholder={replyTarget ? `回复 ${replyTarget.user.nickname}` : '说点什么...'}
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
    </View>
  )
}


