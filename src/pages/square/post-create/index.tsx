import { View, Text, Input, Textarea, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '../../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

// 媒体接口
interface MediaItem {
  tempPath: string // 本地临时路径
  serverUrl?: string // 上传成功后的线上路径
  isUploading: boolean // 上传状态
  width: number  
  height: number 
}

export default function PostCreatePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
  }, [])

  // 1. 选择图片
  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseMedia({
        count: 9 - mediaList.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      
      const newFiles: MediaItem[] = res.tempFiles.map(file => ({
        tempPath: file.tempFilePath,
        isUploading: true,
        // 尝试获取本地宽高，如果获取不到暂设为0，后续靠上传接口修正
        width: file.width || 0, 
        height: file.height || 0
      }))

      setMediaList(prev => [...prev, ...newFiles])

      newFiles.forEach((file, index) => {
        uploadFile(file.tempPath, mediaList.length + index)
      })
    } catch (e) {
      console.log('取消选择')
    }
  }

  // 2. 预览图片
  const handlePreviewImage = (currentPath: string) => {
    const urls = mediaList.map(item => item.tempPath)
    Taro.previewImage({
      current: currentPath, 
      urls: urls 
    })
  }

  // 3. 上传单个文件 (核心修改：回填 width/height)
  const uploadFile = async (filePath: string, index: number) => {
    const token = Taro.getStorageSync('access_token') 
    try {
      const uploadRes = await Taro.uploadFile({
        url: `${BASE_URL}/api/v1/note/upload`,
        filePath: filePath,
        name: 'image', 
        header: { 'Authorization': `Bearer ${token}` }
      })

      let data: any = uploadRes.data
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) {}
      }

      if (data.code === 200 && data.data && data.data.url) {
         // 【修改点】上传成功后，使用后端返回的 width 和 height 更新状态
         const { url, width, height } = data.data
         
         setMediaList(prev => prev.map((item) => {
            if (item.tempPath === filePath) {
                return { 
                    ...item, 
                    serverUrl: url, 
                    isUploading: false,
                    // 如果后端返回了宽高，使用后端的；否则保留本地的
                    width: width || item.width,
                    height: height || item.height
                }
            }
            return item
         }))
      } else {
         Taro.showToast({ title: '图片上传失败', icon: 'none' })
         // 上传失败移除该项
         setMediaList(prev => prev.filter(item => item.tempPath !== filePath))
      }
    } catch (err) {
      console.error('上传异常', err)
      Taro.showToast({ title: '网络错误', icon: 'none' })
      setMediaList(prev => prev.filter(item => item.tempPath !== filePath))
    }
  }

  // 4. 删除图片
  const handleDeleteImage = (index: number) => {
    const newList = [...mediaList]
    newList.splice(index, 1)
    setMediaList(newList)
  }

  // 5. 发布笔记
  const handlePublish = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    
    if (mediaList.some(m => m.isUploading)) {
      Taro.showToast({ title: '图片上传中，请稍候...', icon: 'none' })
      return
    }

    if (mediaList.length === 0) {
      Taro.showToast({ title: '请至少添加一张图片', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '发布中...' })

    try {
      const payload = {
        title: title,
        content: content,
        topic_ids: [], 
        location: null, 
        // 构造 media_data，此时 width/height 应已被 updateFile 更新
        media_data: mediaList.map(m => ({
            url: m.serverUrl,
            thumbnail_url: m.serverUrl, 
            width: m.width, 
            height: m.height
        })),
        type: 1, 
        visible_conf: 1 
      }

      const res = await request({
        url: '/api/v1/note/create',
        method: 'POST',
        data: payload
      })
      
      Taro.hideLoading()
      
      const resData: any = res.data
      if (resData && resData.code === 200) {
         Taro.showToast({ title: '发布成功', icon: 'success' })
         setTimeout(() => {
             Taro.navigateBack()
         }, 1500)
      } else {
         Taro.showToast({ title: resData?.message || '发布失败', icon: 'none' })
      }

    } catch (err) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: '网络请求失败', icon: 'none' })
    }
  }

  const wordCount = content.length

  return (
    <View className='post-create-page'>
      <View 
        className='custom-nav' 
        style={{ 
            paddingTop: `${statusBarHeight}px`, 
            height: `${navBarHeight}px` 
        }}
      >
         <View 
           className='nav-left' 
           style={{ height: `${navBarHeight}px` }}
           onClick={() => Taro.navigateBack()}
         >
            <AtIcon value='chevron-left' size='24' color='#fff' />
         </View>

         <View 
           className='nav-title-container' 
           style={{ height: `${navBarHeight}px` }}
         >
            <Text className='nav-title'>发布笔记</Text>
         </View>
      </View>

      <ScrollView scrollY className='content-scroll' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>
         
         <ScrollView scrollX className='image-scroll' enableFlex>
            {mediaList.map((item, idx) => (
               <View key={idx} className='image-item'>
                  <Image 
                    src={item.tempPath} 
                    mode='aspectFill' 
                    className='img' 
                    onClick={() => handlePreviewImage(item.tempPath)} 
                  />
                  <View 
                    className='del-btn' 
                    onClick={(e) => {
                        e.stopPropagation() 
                        handleDeleteImage(idx)
                    }}
                  >
                     <AtIcon value='close' size='12' color='#fff' />
                  </View>
                  {item.isUploading && (
                     <View className='upload-mask'>
                       <AtIcon value='loading-3' size='20' color='#fff' className='spin-icon' />
                     </View>
                  )}
               </View>
            ))}
            {mediaList.length < 9 && (
               <View className='add-btn' onClick={handleChooseImage}>
                  <AtIcon value='add' size='36' color='#666' />
               </View>
            )}
            <View style={{width: '20px'}}></View>
         </ScrollView>

         <View className='form-area'>
            <Input 
              className='title-input' 
              placeholder='填写标题会让更多人看到～' 
              placeholderClass='ph-title'
              value={title}
              onInput={e => setTitle(e.detail.value)}
            />
            
            <View className='divider' />
            
            <View className='content-box'>
              <Textarea 
                className='content-input' 
                placeholder='添加正文（记录此时此地的美好生活...）' 
                placeholderClass='ph-content'
                maxlength={1000}
                value={content}
                onInput={e => setContent(e.detail.value)}
              />
              <View className='word-count'>
                <Text>{wordCount}/1000</Text>
              </View>
            </View>
         </View>
         
         <View style={{height: '150px'}} />
      </ScrollView>

      <View className='bottom-bar'>
         <View className={`publish-btn ${title && mediaList.length > 0 ? 'ready' : ''}`} onClick={handlePublish}>
            <Text className='btn-text'>发布笔记</Text>
         </View>
      </View>
    </View>
  )
}