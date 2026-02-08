import { View, Text, Input, Textarea, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '../../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface MediaItem {
  tempPath: string
  serverUrl?: string
  isUploading: boolean
  width: number
  height: number
}

type StepKey = 'photo' | 'text'

export default function PostCreatePage() {
  const [step, setStep] = useState<StepKey>('photo')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

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

  useEffect(() => {
    const stored = Taro.getStorageSync('post_create_media')
    if (Array.isArray(stored) && stored.length > 0) {
      const initialFiles: MediaItem[] = stored.map((path) => ({
        tempPath: path,
        isUploading: true,
        width: 0,
        height: 0,
      }))
      Taro.removeStorageSync('post_create_media')
      setMediaList(initialFiles)
      initialFiles.forEach((file) => {
        uploadFile(file.tempPath)
      })
    }
  }, [])

  useEffect(() => {
    if (activeIndex >= mediaList.length) {
      setActiveIndex(Math.max(mediaList.length - 1, 0))
    }
  }, [mediaList, activeIndex])

  const handleChooseImage = async () => {
    const remaining = 9 - mediaList.length
    if (remaining <= 0) return

    try {
      const res = await Taro.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })

      const newFiles: MediaItem[] = res.tempFiles.map(file => ({
        tempPath: file.tempFilePath,
        isUploading: true,
        width: file.width || 0,
        height: file.height || 0,
      }))

      if (newFiles.length === 0) return

      setMediaList(prev => [...prev, ...newFiles])
      newFiles.forEach((file) => {
        uploadFile(file.tempPath)
      })
    } catch (e) {
      console.log('cancel choose image')
    }
  }

  const handlePreviewImage = (currentPath: string) => {
    const urls = mediaList.map(item => item.tempPath)
    Taro.previewImage({
      current: currentPath,
      urls: urls,
    })
  }

  const uploadFile = async (filePath: string) => {
    const token = Taro.getStorageSync('access_token')
    try {
      const uploadRes = await Taro.uploadFile({
        url: `${BASE_URL}/api/v1/note/upload`,
        filePath: filePath,
        name: 'image',
        header: { 'Authorization': `Bearer ${token}` },
      })

      let data: any = uploadRes.data
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) {}
      }

      if (data.code === 200 && data.data && data.data.url) {
        const { url, width, height } = data.data
        setMediaList(prev => prev.map((item) => {
          if (item.tempPath === filePath) {
            return {
              ...item,
              serverUrl: url,
              isUploading: false,
              width: width || item.width,
              height: height || item.height,
            }
          }
          return item
        }))
      } else {
        Taro.showToast({ title: '图片上传失败', icon: 'none' })
        setMediaList(prev => prev.filter(item => item.tempPath !== filePath))
      }
    } catch (err) {
      console.error('upload error', err)
      Taro.showToast({ title: '网络错误', icon: 'none' })
      setMediaList(prev => prev.filter(item => item.tempPath !== filePath))
    }
  }

  const handleDeleteImage = (index: number) => {
    const newList = [...mediaList]
    newList.splice(index, 1)
    setMediaList(newList)
  }

  const handleBack = () => {
    if (step === 'text') {
      setStep('photo')
      return
    }
    Taro.navigateBack()
  }

  const handleNextStep = () => {
    if (mediaList.length === 0) {
      Taro.showToast({ title: '请先选择照片', icon: 'none' })
      return
    }
    if (mediaList.some(m => m.isUploading)) {
      Taro.showToast({ title: '图片上传中，请稍候...', icon: 'none' })
      return
    }
    setStep('text')
  }

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
        media_data: mediaList.map(m => ({
          url: m.serverUrl,
          thumbnail_url: m.serverUrl,
          width: m.width,
          height: m.height,
        })),
        type: 1,
        visible_conf: 1,
      }

      const res = await request({
        url: '/api/v1/note/create',
        method: 'POST',
        data: payload,
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
  const activeMedia = mediaList[activeIndex]
  const canProceed = mediaList.length > 0 && !mediaList.some(m => m.isUploading)
  const canPublish = canProceed && title.trim().length > 0

  return (
    <View className='post-create-page'>
      <View
        className='custom-nav'
        style={{
          paddingTop: `${statusBarHeight}px`,
          height: `${navBarHeight}px`,
        }}
      >
        <View
          className='nav-left'
          style={{ height: `${navBarHeight}px` }}
          onClick={handleBack}
        >
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
      </View>

      <ScrollView scrollY className='content-scroll' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>
        {step === 'photo' ? (
          <View className='photo-step'>
            <View className='preview-area'>
              {activeMedia ? (
                <Image
                  src={activeMedia.tempPath}
                  mode='aspectFit'
                  className='preview-image'
                  onClick={() => handlePreviewImage(activeMedia.tempPath)}
                />
              ) : (
                <View className='preview-empty'>
                  <Text className='preview-empty-text'>点击下方 + 添加照片</Text>
                </View>
              )}
            </View>

            <ScrollView scrollX className='thumb-scroll' enableFlex>
              {mediaList.map((item, idx) => (
                <View
                  key={item.tempPath}
                  className={`thumb-item ${activeIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveIndex(idx)}
                >
                  <Image src={item.tempPath} mode='aspectFill' className='thumb-image' />
                  <View
                    className='thumb-close'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteImage(idx)
                    }}
                  >
                    <AtIcon value='close' size='12' color='#fff' />
                  </View>
                  {item.isUploading && (
                    <View className='thumb-mask'>
                      <AtIcon value='loading-3' size='18' color='#fff' className='spin-icon' />
                    </View>
                  )}
                </View>
              ))}
              {mediaList.length < 9 && (
                <View className='thumb-add' onClick={handleChooseImage}>
                  <AtIcon value='add' size='28' color='#666' />
                </View>
              )}
              <View style={{ width: '16px' }} />
            </ScrollView>
          </View>
        ) : (
          <View className='text-step'>
            <ScrollView scrollX className='mini-thumb-scroll' enableFlex>
              {mediaList.map((item, idx) => (
                <View key={item.tempPath} className='mini-thumb-item'>
                  <Image src={item.tempPath} mode='aspectFill' className='mini-thumb-image' />
                  <View
                    className='mini-thumb-close'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteImage(idx)
                    }}
                  >
                    <AtIcon value='close' size='12' color='#fff' />
                  </View>
                </View>
              ))}
              {mediaList.length < 9 && (
                <View className='mini-thumb-add' onClick={handleChooseImage}>
                  <AtIcon value='add' size='28' color='#666' />
                </View>
              )}
              <View style={{ width: '16px' }} />
            </ScrollView>

            <View className='form-area'>
              <Input
                className='title-input'
                placeholder='写下标题，让更多人看到'
                placeholderClass='ph-title'
                value={title}
                onInput={e => setTitle(e.detail.value)}
              />

              <View className='divider' />

              <View className='content-box'>
                <Textarea
                  className='content-input'
                  placeholder='添加正文（记录此时此地的美好）'
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

            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>#话题</Text>
                <Text className='section-sub'>可多选</Text>
                <Text className='section-action'>添加</Text>
              </View>
              <View className='tag-list'>
                <View className='tag-item active'>骑行</View>
                <View className='tag-item'>周末去哪玩</View>
              </View>
            </View>

            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>位置</Text>
                <Text className='section-sub'>添加位置让更多人看到你</Text>
                <Text className='section-action'>添加</Text>
              </View>
              <View className='tag-list'>
                <View className='tag-item'>南溪湿地公园</View>
                <View className='tag-item'>生态广场</View>
                <View className='tag-item'>乌鸡米线</View>
              </View>
            </View>

            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>活动</Text>
                <Text className='section-sub'>关联已订阅活动</Text>
              </View>
              <View className='tag-list'>
                <View className='tag-item ghost'>PURE LOOP</View>
                <View className='tag-item ghost'>嘻哈盛典</View>
                <View className='tag-item ghost'>HYPER新年典礼</View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: '160px' }} />
      </ScrollView>

      <View className='bottom-bar'>
        {step === 'photo' ? (
          <View className={`primary-btn ${canProceed ? 'ready' : ''}`} onClick={handleNextStep}>
            <Text className='btn-text'>下一步</Text>
          </View>
        ) : (
          <View className={`primary-btn ${canPublish ? 'ready' : ''}`} onClick={handlePublish}>
            <Text className='btn-text'>发布</Text>
          </View>
        )}
      </View>
    </View>
  )
}
