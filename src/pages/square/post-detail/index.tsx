import { View, Text, Image, Swiper, SwiperItem, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon, AtActivityIndicator } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
// 仅引入 request 用于非长ID接口 (如点赞)
import { request } from '../../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface NoteMedia {
  url: string
  thumbnail_url: string
  width: number
  height: number
  type?: number 
}

interface NoteLocation {
  lat: number
  lng: number
  name: string
}

interface NoteDetail {
  id: string       // 【修改】改为 string，防止精度丢失
  user_id: string  // 【修改】改为 string
  title: string
  content: string
  location: NoteLocation
  media_data: NoteMedia[]
  type: number
  topic_ids: number[] 
  status: number
  visible_conf: number
  created_at: string
  nickname: string
  avatar: string
  like_count: number
  coll_count: number
  comment_count: number
  is_liked: boolean
  is_collected: boolean
  is_followed: boolean
}

export default function PostDetailPage() {
  const router = useRouter()
  const { id } = router.params

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [navBarPaddingRight, setNavBarPaddingRight] = useState(0)
  
  const [currentMedia, setCurrentMedia] = useState(0)
  const [note, setNote] = useState<NoteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = (sysInfo.screenWidth - menuInfo.left) + 8
    setNavBarPaddingRight(rightPadding)

    if (id) {
      fetchNoteDetail(id)
    }
  }, [id])

  // --- 核心修复：获取详情 (处理精度丢失) ---
  const fetchNoteDetail = async (noteId: string) => {
    try {
      const token = Taro.getStorageSync('access_token')
      
      // 【关键】直接使用 Taro.request 获取字符串数据
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/${noteId}`,
        method: 'GET',
        header: {
            'Authorization': `Bearer ${token}`
        },
        dataType: 'string', // 强制返回字符串
        responseType: 'text'
      })
      
      // 【关键】正则替换长整数 ID 为字符串
      let jsonStr = res.data as unknown as string
      if (typeof jsonStr === 'string') {
          // 替换 id 和 user_id
          jsonStr = jsonStr.replace(/"id":\s*(\d{16,})/g, '"id": "$1"')
          jsonStr = jsonStr.replace(/"user_id":\s*(\d{16,})/g, '"user_id": "$1"')
      }
      
      let resBody: any = {}
      try { resBody = JSON.parse(jsonStr) } catch(e) { console.error('JSON Parse Error', e) }

      if (resBody && resBody.code === 200 && resBody.data) {
        const data = resBody.data
        let mediaList: NoteMedia[] = []
        if (data.media_data) {
             if (Array.isArray(data.media_data)) mediaList = data.media_data
             else if (typeof data.media_data === 'object') mediaList = [data.media_data]
        }
        
        setNote({
            ...data,
            // 确保 id 是字符串
            id: String(data.id),
            media_data: mediaList,
            topic_ids: data.topic_ids || [] 
        })
      } else {
        Taro.showToast({ title: '获取详情失败', icon: 'none' })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- 新增：图片大图预览 ---
  const handlePreviewImage = (currentUrl: string) => {
    if (!note || !note.media_data) return
    const urls = note.media_data.map(item => item.url)
    Taro.previewImage({
        current: currentUrl,
        urls: urls
    })
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
        // 这里 note.id 已经是正确的字符串了，拼接 URL 不会出错
        await request({ url: `/api/v1/note/${note.id}/like`, method: method })
    } catch (e) {
        setNote(prev => prev ? ({ ...prev, is_liked: oldIsLiked, like_count: oldLikeCount }) : null)
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  if (loading) return <View className='post-detail-page loading-center'><AtActivityIndicator content='加载中...' color='#999' mode='center'/></View>
  if (!note) return <View className='post-detail-page loading-center'><Text style={{color: '#999'}}>内容不存在或已删除</Text></View>

  return (
    <View className='post-detail-page'>
      <View 
        className='custom-nav' 
        style={{ 
            paddingTop: `${statusBarHeight}px`, 
            height: `${navBarHeight}px`,
            paddingRight: `${navBarPaddingRight}px` 
        }}
      >
         <View className='left-area' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
            <View className='user-mini'>
               <Image src={note.avatar} className='avatar' mode='aspectFill'/>
               <Text className='name'>{note.nickname}</Text>
            </View>
         </View>
         <View className='right-area'>
            <View className={`follow-btn ${note.is_followed ? 'followed' : ''}`}>
                {note.is_followed ? '已关注' : '关注'}
            </View>
            <AtIcon value='share' size='20' color='#fff' style={{marginLeft: '12px'}} />
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
                  {/* 修改点：添加 onClick 事件触发预览 */}
                  <Image 
                    src={item.url} 
                    mode='aspectFill' 
                    className='media-img' 
                    onClick={() => handlePreviewImage(item.url)}
                  />
               </SwiperItem>
            ))}
         </Swiper>

         <View className='content-body'>
            <Text className='post-title'>{note.title}</Text>
            <Text className='post-desc' selectable>{note.content}</Text>
            {note.topic_ids && note.topic_ids.length > 0 && (
                <View className='tags'>
                   {note.topic_ids.map(tid => <Text key={tid} className='tag'>#话题{tid}</Text>)}
                </View>
            )}
            <View className='post-meta'>
                <Text className='time'>{formatTime(note.created_at)}</Text>
                {note.location && note.location.name && (
                    <Text className='loc'>{note.location.name}</Text>
                )}
            </View>
         </View>

         <View className='divider' />

         <View className='comment-section'>
            <Text className='comment-count'>共 {note.comment_count} 条评论</Text>
            <View style={{padding: '20px 0', textAlign: 'center', color: '#666', fontSize: '12px'}}>
                暂无更多评论
            </View>
         </View>
         
         <View style={{height: '120px'}} />
      </ScrollView>

      <View className='bottom-bar'>
         <View className='input-box'>
            <AtIcon value='edit' size='14' color='#999' style={{marginRight: '8px'}}/>
            <Text className='placeholder'>说些好听的...</Text>
         </View>
         <View className='icons'>
            <View className='icon-item' onClick={handleToggleLike}>
                <AtIcon value={note.is_liked ? 'heart-2' : 'heart'} size='24' color={note.is_liked ? '#FF2E4D' : '#fff'} />
                <Text className='num'>{note.like_count}</Text>
            </View>
            <View className='icon-item'>
                <AtIcon value={note.is_collected ? 'star-2' : 'star'} size='24' color={note.is_collected ? '#FFCC00' : '#fff'} />
                <Text className='num'>{note.coll_count}</Text>
            </View>
            <View className='icon-item'>
                <AtIcon value='message' size='24' color='#fff' />
                <Text className='num'>{note.comment_count}</Text>
            </View>
         </View>
      </View>
    </View>
  )
}