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
  tempPath: string // 本地临时路径 (用于展示)
  serverUrl?: string // 上传成功后的线上路径
  isUploading: boolean // 上传状态
}

export default function PostCreatePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  
  // 标签选择
  const TAGS = ['派对', '音乐', '骑行', '滑板', '纹身', '汽车', '展']
  const [selectedTag, setSelectedTag] = useState('派对')

  // 布局适配
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)

  useEffect(() => {
    // 布局适配
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightMargin = sysInfo.screenWidth - menuInfo.right
    setMenuButtonWidth(menuInfo.width + rightMargin * 2)
  }, [])

  // 选择图片
  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseMedia({
        count: 9 - mediaList.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      
      const newFiles = res.tempFiles.map(file => ({
        tempPath: file.tempFilePath,
        isUploading: true
      }))

      // 先展示Loading状态
      setMediaList(prev => [...prev, ...newFiles])

      // 逐个上传
      newFiles.forEach((file, index) => {
        uploadFile(file.tempPath, mediaList.length + index)
      })
    } catch (e) {
      console.log('取消选择')
    }
  }

  // 上传单个文件
  const uploadFile = async (filePath: string, index: number) => {
    const token = Taro.getStorageSync('access_token') // 使用 access_token
    try {
      const uploadRes = await Taro.uploadFile({
        url: `${BASE_URL}/api/v1/note/upload`,
        filePath: filePath,
        name: 'image', // 接口要求参数名为 image
        header: { 'Authorization': `Bearer ${token}` }
      })

      let data: any = uploadRes.data
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) {}
      }

      if (data.code === 200 && data.data && data.data.url) {
         // 更新对应的 media item
         setMediaList(prev => prev.map((item, idx) => {
            if (item.tempPath === filePath) {
                return { ...item, serverUrl: data.data.url, isUploading: false }
            }
            return item
         }))
      } else {
         Taro.showToast({ title: '图片上传失败', icon: 'none' })
         // 可以在这里标记为上传失败，或者移除
      }
    } catch (err) {
      console.error('上传异常', err)
      Taro.showToast({ title: '网络错误', icon: 'none' })
    }
  }

  // 删除图片
  const handleDeleteImage = (index: number) => {
    const newList = [...mediaList]
    newList.splice(index, 1)
    setMediaList(newList)
  }

  // 发布笔记
  const handlePublish = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    
    // 检查是否有图片正在上传
    if (mediaList.some(m => m.isUploading)) {
      Taro.showToast({ title: '图片上传中，请稍候...', icon: 'none' })
      return
    }

    // 检查是否至少有一张图片 (假设图文笔记必须有图)
    if (mediaList.length === 0) {
      Taro.showToast({ title: '请添加图片', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '发布中...' })

    try {
      // 构造请求参数
      const payload = {
        title: title,
        content: content,
        // 这里只是简单的 demo，实际话题 ID 需要从后端获取列表或创建
        // topic_ids: [1001], 
        location: {
           // 模拟数据，实际可用 Taro.getLocation 获取
           lat: 30.657,
           lng: 104.066,
           name: "吉林省长春市南关区形式口路12号" // 截图中的地址
        },
        media_data: mediaList.map(m => ({
            url: m.serverUrl,
            // 简单处理，实际可从 upload 接口获取宽高
            thumbnail_url: m.serverUrl, 
            width: 1080, 
            height: 1920
        })),
        type: 1, // 图文
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

  return (
    <View className='post-create-page'>
      {/* 顶部导航 */}
      <View 
        className='custom-nav' 
        style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}
      >
         <View className='left' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
         </View>
      </View>

      <ScrollView scrollY className='content-scroll' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>
         {/* 图片选择网格 */}
         <ScrollView scrollX className='image-scroll' enableFlex>
            {mediaList.map((item, idx) => (
               <View key={idx} className='image-item'>
                  <Image src={item.tempPath} mode='aspectFill' className='img' />
                  <View className='del-btn' onClick={() => handleDeleteImage(idx)}>
                     <AtIcon value='trash' size='14' color='#fff' />
                  </View>
                  {item.isUploading && (
                     <View className='upload-mask'><Text>上传中</Text></View>
                  )}
               </View>
            ))}
            {/* 添加按钮 */}
            {mediaList.length < 9 && (
               <View className='add-btn' onClick={handleChooseImage}>
                  <Text>添加</Text>
               </View>
            )}
         </ScrollView>

         {/* 输入区域 */}
         <View className='form-area'>
            <Input 
              className='title-input' 
              placeholder='添加标题' 
              placeholderClass='ph-style'
              value={title}
              onInput={e => setTitle(e.detail.value)}
            />
            <View className='divider' />
            <Textarea 
              className='content-input' 
              placeholder='添加正文' 
              placeholderClass='ph-style'
              maxlength={1000}
              value={content}
              onInput={e => setContent(e.detail.value)}
            />
         </View>

         {/* 底部功能区 */}
         <View className='options-area'>
            <View className='tag-section'>
               <Text className='label'>#话题</Text>
               <ScrollView scrollX className='tag-scroll' enableFlex>
                  <View className='tag-pill active'><Text>{selectedTag}</Text></View>
                  {TAGS.map(t => t !== selectedTag && (
                     <View key={t} className='tag-text' onClick={() => setSelectedTag(t)}>{t}</View>
                  ))}
               </ScrollView>
            </View>

            <View className='link-group'>
               <Text className='group-label'>关联</Text>
               
               <View className='link-item'>
                  <Text className='txt'>吉林省长春市南关区形式口路12号</Text>
                  <AtIcon value='close' size='14' color='#999' />
               </View>

               <View className='link-item'>
                  <Text className='txt'>PURELOOP POWERFLOW</Text>
                  <AtIcon value='close' size='14' color='#999' />
               </View>
            </View>
         </View>
         
         <View style={{height: '150px'}} />
      </ScrollView>

      {/* 底部发布按钮 */}
      <View className='bottom-bar'>
         <View className='publish-btn' onClick={handlePublish}>
            <Text>发布</Text>
         </View>
      </View>
    </View>
  )
}