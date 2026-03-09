import { View, Text, Input, Textarea, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '../../../utils/request'
import { reverseGeocode, searchByKeyword, type POIItem } from '../../../utils/qqmap'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface MediaItem {
  tempPath: string
  serverUrl?: string
  isUploading: boolean
  width: number
  height: number
  tags?: TopicItem[]
}

interface TopicItem {
  id: number
  name: string
}

interface SubscribedActivityItem {
  id: number
  title: string
  type: string
}

type StepKey = 'photo' | 'text'

export default function PostCreatePage() {
  const [step, setStep] = useState<StepKey>('photo')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragScope, setDragScope] = useState<'thumb' | 'mini' | null>(null)
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null)
  const [dragPreviewPath, setDragPreviewPath] = useState('')
  const suppressClickRef = useRef(false)
  const dragRectsRef = useRef<Array<{ index: number; left: number; right: number; center: number }>>([])
  const dragAutoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  // ========== 位置相关 ==========
  const [nearbyPois, setNearbyPois] = useState<POIItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState<POIItem | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [locationSearchKey, setLocationSearchKey] = useState('')
  const [searchResults, setSearchResults] = useState<POIItem[]>([])
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [subscribedActivities, setSubscribedActivities] = useState<SubscribedActivityItem[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [topicCandidates, setTopicCandidates] = useState<TopicItem[]>([])
  const [selectedTopics, setSelectedTopics] = useState<number[]>([])

  const userLatRef = useRef(0)
  const userLngRef = useRef(0)

  // ========== 初始化 ==========
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
      initialFiles.forEach((file) => uploadFile(file.tempPath))
    }
  }, [])

  // 页面加载 -> 获取定位 -> 逆地址解析附近 POI
  useEffect(() => {
    fetchNearbyPois()
  }, [])

  useEffect(() => {
    fetchSubscribedActivities()
  }, [])

  useEffect(() => {
    if (activeIndex >= mediaList.length) {
      setActiveIndex(Math.max(mediaList.length - 1, 0))
    }
  }, [mediaList, activeIndex])

  useEffect(() => {
    const topicMap = new Map<number, TopicItem>()
    mediaList
      .flatMap(item => item.tags || [])
      .forEach((tag) => {
        if (!tag || tag.id <= 0 || !tag.name.trim()) return
        topicMap.set(tag.id, tag)
      })
    const nextTopics = Array.from(topicMap.values())
    setTopicCandidates(nextTopics)
    setSelectedTopics(prev => prev.filter(id => topicMap.has(id)))
  }, [mediaList])

  // ========== 核心：获取附近地点 ==========
  const fetchNearbyPois = async () => {
    setIsLoadingLocation(true)
    try {
      // 第一步：获取用户当前位置
      const locRes = await Taro.getLocation({
        type: 'gcj02',
        isHighAccuracy: false,
      })

      userLatRef.current = locRes.latitude
      userLngRef.current = locRes.longitude

      // 第二步：逆地址解析，拿到附近 POI 列表
      const result = await reverseGeocode(locRes.latitude, locRes.longitude)

      setNearbyPois(result.pois)
    } catch (err: any) {
      console.warn('获取附近地点失败:', err)

      if (err?.errMsg?.includes('deny') || err?.errMsg?.includes('auth')) {
        Taro.showModal({
          title: '需要位置权限',
          content: '请在设置中开启位置权限，以便获取附近地点',
          confirmText: '去设置',
          success: (modalRes) => {
            if (modalRes.confirm) {
              Taro.openSetting({})
            }
          },
        })
      }
    } finally {
      setIsLoadingLocation(false)
    }
  }

  // ========== 弹窗内搜索 ==========
  const handleSearchPoi = async () => {
    const keyword = locationSearchKey.trim()
    if (!keyword) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchByKeyword(
        keyword,
        userLatRef.current || 0,
        userLngRef.current || 0,
        20
      )
      setSearchResults(results)
    } catch (e) {
      console.warn('搜索地点失败:', e)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // ========== 位置选择操作 ==========
  const handleSelectLocation = (poi: POIItem) => {
    setSelectedLocation(poi)
    setShowLocationPicker(false)
  }

  const handleClearLocation = () => {
    setSelectedLocation(null)
    setShowLocationPicker(false)
  }

  const handleOpenLocationPicker = () => {
    setLocationSearchKey('')
    setSearchResults([])
    setShowLocationPicker(true)
  }

  // 备选：使用微信原生地图选点
  const handleChooseLocationNative = async () => {
    try {
      const res = await Taro.chooseLocation({})
      if (res.name) {
        const poi: POIItem = {
          id: `native_${Date.now()}`,
          name: res.name,
          address: res.address || '',
          latitude: res.latitude,
          longitude: res.longitude,
        }
        setSelectedLocation(poi)
        setShowLocationPicker(false)
      }
    } catch (_e) {
      console.log('用户取消地图选点')
    }
  }

  const fetchSubscribedActivities = async () => {
    setActivityLoading(true)
    setActivityError('')
    try {
      const res = await request({
        url: '/api/v1/subscribe/list',
        method: 'GET',
      })
      const body: any = res?.data
      const source = body?.code === 200 && Array.isArray(body?.data) ? body.data : null
      if (!source) {
        setSubscribedActivities([])
        setActivityError('加载失败，点击重试')
        return
      }

      const activityTypeSet = new Set(['活动', '派对', 'activity', 'event'])
      const mapped: SubscribedActivityItem[] = source
        .map((item: any) => ({
          id: Number(item?.id) || 0,
          title: String(item?.title || ''),
          type: String(item?.type || '').toLowerCase(),
        }))
        .filter((item: SubscribedActivityItem) => item.id > 0 && item.title)
        .filter((item: SubscribedActivityItem) => activityTypeSet.has(item.type) || activityTypeSet.has(item.type.toLowerCase()))

      setSubscribedActivities(mapped)
      if (mapped.length === 0) {
        setSelectedActivityId(null)
      } else if (selectedActivityId !== null && !mapped.some(item => item.id === selectedActivityId)) {
        setSelectedActivityId(null)
      }
    } catch (_error) {
      setSubscribedActivities([])
      setSelectedActivityId(null)
      setActivityError('加载失败，点击重试')
    } finally {
      setActivityLoading(false)
    }
  }

  const handleSelectActivity = (activityId: number) => {
    setSelectedActivityId(activityId)
  }

  const handleToggleTopic = (topicId: number) => {
    setSelectedTopics((prev) => (
      prev.includes(topicId) ? prev.filter(item => item !== topicId) : [...prev, topicId]
    ))
  }

  // ========== 以下为原有逻辑（图片/上传/发布等） ==========

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
      newFiles.forEach((file) => uploadFile(file.tempPath))
    } catch (e) {
      console.log('cancel choose image')
    }
  }

  const handlePreviewImage = (currentPath: string) => {
    Taro.previewImage({
      current: currentPath,
      urls: mediaList.map(item => item.tempPath),
    })
  }

  const uploadFile = async (filePath: string) => {
    const token = Taro.getStorageSync('access_token')
    try {
      const uploadRes = await Taro.uploadFile({
        url: `${BASE_URL}/api/v1/note/upload`,
        filePath,
        name: 'image',
        header: { 'Authorization': `Bearer ${token}` },
      })
      let data: any = uploadRes.data
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) {}
      }
      if (data.code === 200 && data.data?.url) {
        const { url, width, height } = data.data
        const normalizeTag = (raw: any): string => {
          const value = String(raw || '').trim()
          if (!value) return ''
          try {
            if (/[ÃÂåäöüç]/.test(value)) {
              return decodeURIComponent(escape(value))
            }
          } catch (_e) {}
          return value
        }
        const tags = Array.isArray(data.data?.tags)
          ? data.data.tags
            .map((tag: any) => {
              const id = Number(tag?.id || 0)
              const name = normalizeTag(tag?.name)
              if (!id || !name) return null
              return { id, name }
            })
            .filter(Boolean) as TopicItem[]
          : []
        setMediaList(prev => prev.map((item) =>
          item.tempPath === filePath
            ? {
              ...item,
              serverUrl: url,
              isUploading: false,
              width: width || item.width,
              height: height || item.height,
              tags,
            }
            : item
        ))
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
    if (mediaList.length <= 1) {
      Taro.showToast({ title: '至少保留一张图片', icon: 'none' })
      return
    }
    const newList = [...mediaList]
    newList.splice(index, 1)
    setMediaList(newList)
  }

  const moveMediaItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const source = mediaList[fromIndex]
    if (!source) return

    const activeMediaPath = mediaList[activeIndex]?.tempPath || ''
    const reordered = [...mediaList]
    const [movedItem] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, movedItem)
    setMediaList(reordered)

    const nextActiveIndex = reordered.findIndex(item => item.tempPath === activeMediaPath)
    if (nextActiveIndex >= 0) {
      setActiveIndex(nextActiveIndex)
    }
  }

  const measureDragRects = (scope: 'thumb' | 'mini') => {
    const selector = scope === 'thumb'
      ? '.thumb-scroll .thumb-item'
      : '.mini-thumb-scroll .mini-thumb-item'

    const query = Taro.createSelectorQuery()
    query.selectAll(selector).boundingClientRect()
    query.exec((res) => {
      const rects = (res?.[0] || []) as Array<{ left: number; width: number }>
      dragRectsRef.current = rects.map((rect, index) => {
        const left = rect.left || 0
        const right = left + (rect.width || 0)
        return {
          index,
          left,
          right,
          center: left + ((rect.width || 0) / 2)
        }
      })
    })
  }

  const startDrag = (e: any, index: number, scope: 'thumb' | 'mini') => {
    if (mediaList.length <= 1) return
    if (dragAutoResetTimerRef.current) {
      clearTimeout(dragAutoResetTimerRef.current)
      dragAutoResetTimerRef.current = null
    }
    const touch = e?.touches?.[0] || e?.changedTouches?.[0]
    setDragScope(scope)
    setDraggingIndex(index)
    setDragOverIndex(index)
    setDragPreviewPath(mediaList[index]?.tempPath || '')
    if (touch) {
      setDragPointer({ x: touch.clientX, y: touch.clientY })
    }
    measureDragRects(scope)
    dragAutoResetTimerRef.current = setTimeout(() => {
      endDrag()
    }, 4000)
  }

  const updateDragTarget = (touchX: number) => {
    if (draggingIndex === null) return
    const rects = dragRectsRef.current
    if (!rects.length) return
    let nextIndex = rects[0].index
    let minDistance = Math.abs(touchX - rects[0].center)
    for (let i = 1; i < rects.length; i += 1) {
      const distance = Math.abs(touchX - rects[i].center)
      if (distance < minDistance) {
        minDistance = distance
        nextIndex = rects[i].index
      }
    }
    if (dragOverIndex !== nextIndex) {
      setDragOverIndex(nextIndex)
    }
  }

  const handleDragMove = (e: any) => {
    if (draggingIndex === null) return
    const touch = e?.touches?.[0]
    if (!touch) return
    if (dragAutoResetTimerRef.current) {
      clearTimeout(dragAutoResetTimerRef.current)
      dragAutoResetTimerRef.current = null
    }
    dragAutoResetTimerRef.current = setTimeout(() => {
      endDrag()
    }, 4000)
    setDragPointer({ x: touch.clientX, y: touch.clientY })
    updateDragTarget(touch.clientX)
  }

  const endDrag = () => {
    if (dragAutoResetTimerRef.current) {
      clearTimeout(dragAutoResetTimerRef.current)
      dragAutoResetTimerRef.current = null
    }
    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      moveMediaItem(draggingIndex, dragOverIndex)
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 120)
    }
    setDraggingIndex(null)
    setDragOverIndex(null)
    setDragScope(null)
    setDragPointer(null)
    setDragPreviewPath('')
    dragRectsRef.current = []
  }

  const handleBack = () => {
    if (step === 'text') { setStep('photo'); return }
    Taro.navigateBack()
  }

  const handleNextStep = () => {
    if (mediaList.length === 0) {
      Taro.showToast({ title: '请先选择照片', icon: 'none' }); return
    }
    if (mediaList.some(m => m.isUploading)) {
      Taro.showToast({ title: '图片上传中，请稍候', icon: 'none' }); return
    }
    setStep('text')
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' }); return
    }
    if (mediaList.some(m => m.isUploading)) {
      Taro.showToast({ title: '图片上传中，请稍候', icon: 'none' }); return
    }
    if (mediaList.length === 0) {
      Taro.showToast({ title: '请至少添加一张图片', icon: 'none' }); return
    }

    Taro.showLoading({ title: '发布中...' })
    try {
      const payload = {
        title,
        content,
        activity_id: selectedActivityId ?? null,
        topic_ids: selectedTopics,
        location: selectedLocation
          ? {
            name: selectedLocation.name,
            address: selectedLocation.address,
            lat: selectedLocation.latitude,
            lng: selectedLocation.longitude,
          }
          : null,
        media_data: mediaList.map(m => ({
          url: m.serverUrl,
          thumbnail_url: m.serverUrl,
          width: m.width,
          height: m.height,
        })),
        type: 1,
        visible_conf: 1,
      }

      const res = await request({ url: '/api/v1/note/create', method: 'POST', data: payload })
      Taro.hideLoading()

      const resData: any = res.data
      if (resData?.code === 200) {
        Taro.showToast({ title: '发布成功', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 1500)
      } else {
        Taro.showToast({ title: resData?.message || '发布失败', icon: 'none' })
      }
    } catch (err) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: '网络请求失败', icon: 'none' })
    }
  }

  // ========== 渲染 ==========
  const wordCount = content.length
  const activeMedia = mediaList[activeIndex]
  const canProceed = mediaList.length > 0 && !mediaList.some(m => m.isUploading)
  const canPublish = canProceed && title.trim().length > 0

  // 弹窗列表：有搜索词显示搜索结果，否则显示附近列表
  const pickerDisplayList = locationSearchKey.trim() ? searchResults : nearbyPois

  const defaultPois = nearbyPois.slice(0, 3)
  const locationDisplayList = selectedLocation && !defaultPois.some(poi => poi.id === selectedLocation.id)
    ? [selectedLocation, ...defaultPois]
    : defaultPois

  return (
    <View
      className='post-create-page'
      onTouchMove={handleDragMove}
      onTouchEnd={endDrag}
      onTouchCancel={endDrag}
    >
      <View
        className='custom-nav'
        style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px` }}
      >
        <View className='nav-left' style={{ height: `${navBarHeight}px` }} onClick={handleBack}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
      </View>

      <ScrollView scrollY className='content-scroll' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>

        {/* ===== 图片步骤 ===== */}
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

            <ScrollView
              scrollX
              className='thumb-scroll'
              enableFlex
              onTouchMove={handleDragMove}
              onTouchEnd={endDrag}
              onTouchCancel={endDrag}
            >
              {mediaList.map((item, idx) => (
                <View
                  key={item.tempPath}
                  className={`thumb-item ${activeIndex === idx ? 'active' : ''} ${draggingIndex === idx ? 'is-dragging' : ''} ${dragOverIndex === idx && draggingIndex !== null && draggingIndex !== idx ? 'is-drop-target' : ''}`}
                  onClick={() => {
                    if (suppressClickRef.current) return
                    setActiveIndex(idx)
                  }}
                  onLongPress={(e) => startDrag(e, idx, 'thumb')}
                >
                  <Image src={item.tempPath} mode='aspectFill' className='thumb-image' />
                  <View className='thumb-close' onClick={(e) => { e.stopPropagation(); handleDeleteImage(idx) }}>
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

          /* ===== 文字步骤 ===== */
          <View className='text-step'>
            <ScrollView
              scrollX
              className='mini-thumb-scroll'
              enableFlex
              onTouchMove={handleDragMove}
              onTouchEnd={endDrag}
              onTouchCancel={endDrag}
            >
              {mediaList.map((item, idx) => (
                <View
                  key={item.tempPath}
                  className={`mini-thumb-item ${draggingIndex === idx ? 'is-dragging' : ''} ${dragOverIndex === idx && draggingIndex !== null && draggingIndex !== idx ? 'is-drop-target' : ''}`}
                  onLongPress={(e) => startDrag(e, idx, 'mini')}
                >
                  <Image src={item.tempPath} mode='aspectFill' className='mini-thumb-image' />
                  <View className='mini-thumb-close' onClick={(e) => { e.stopPropagation(); handleDeleteImage(idx) }}>
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
                  placeholder='添加正文，记录此时此地的美好'
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

            {/* 话题 */}
            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>#话题</Text>
                <Text className='section-sub'>可多选</Text>
                {selectedTopics.length > 0 && (
                  <Text className='section-action' onClick={() => setSelectedTopics([])}>清除</Text>
                )}
              </View>
              <View className='tag-list'>
                {topicCandidates.length > 0 ? (
                  topicCandidates.map((topic) => (
                    <View
                      key={`topic-${topic.id}`}
                      className={`tag-item ${selectedTopics.includes(topic.id) ? 'active' : ''}`}
                      onClick={() => handleToggleTopic(topic.id)}
                    >
                      {topic.name}
                    </View>
                  ))
                ) : (
                  <Text className='location-hint-text'>上传图片后自动识别话题</Text>
                )}
              </View>
            </View>

            {/* ===== 位置（动态获取） ===== */}
            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>位置</Text>
                <Text className='section-sub'>添加位置让更多人看到你</Text>
                <Text
                  className='section-action'
                  onClick={selectedLocation ? handleClearLocation : handleOpenLocationPicker}
                >
                  {selectedLocation ? '清除' : '添加'}
                </Text>
              </View>

              <View className='tag-list'>
                {isLoadingLocation ? (
                  <Text className='location-hint-text'>定位中...</Text>
                ) : locationDisplayList.length > 0 ? (
                  locationDisplayList.map((poi) => (
                    <View
                      key={poi.id}
                      className={`tag-item ghost ${selectedLocation?.id === poi.id ? 'active' : ''}`}
                      onClick={() => handleSelectLocation(poi)}
                    >
                      {poi.name}
                    </View>
                  ))
                ) : (
                  <Text className='location-hint-text'>暂无附近地点，点击添加</Text>
                )}
              </View>
            </View>

            {/* 活动 */}
            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>活动</Text>
                <Text className='section-sub'>关联已订阅活动</Text>
                {selectedActivityId !== null && (
                  <Text className='section-action' onClick={() => setSelectedActivityId(null)}>清除</Text>
                )}
              </View>
              <View className='tag-list'>
                {activityLoading && (
                  <Text className='location-hint-text'>加载中...</Text>
                )}
                {!activityLoading && activityError && (
                  <Text className='location-hint-text' onClick={fetchSubscribedActivities}>{activityError}</Text>
                )}
                {!activityLoading && !activityError && subscribedActivities.length === 0 && (
                  <Text className='location-hint-text'>暂无已订阅活动</Text>
                )}
                {!activityLoading && !activityError && subscribedActivities.map((item) => (
                  <View
                    key={`activity-${item.id}`}
                    className={`tag-item ghost ${selectedActivityId === item.id ? 'active' : ''}`}
                    onClick={() => handleSelectActivity(item.id)}
                  >
                    {item.title}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: '160px' }} />
      </ScrollView>

      {/* 底部按钮 */}
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

      {/* ===== 位置选择弹窗（半屏 Bottom Sheet） ===== */}
      {showLocationPicker && (
        <View className='location-picker-mask' onClick={() => setShowLocationPicker(false)}>
          <View className='location-picker-sheet' onClick={(e) => e.stopPropagation()}>

            {/* 顶部拖拽条 */}
            <View className='picker-drag-bar'>
              <View className='drag-indicator' />
            </View>

            {/* 标题 */}
            <View className='picker-header'>
              <Text className='picker-title'>选择位置</Text>
              <View className='picker-close' onClick={() => setShowLocationPicker(false)}>
                <AtIcon value='close' size='20' color='#999' />
              </View>
            </View>

            {/* 搜索框 */}
            <View className='picker-search'>
              <AtIcon value='search' size='16' color='#999' />
              <Input
                className='picker-search-input'
                placeholder='搜索地点'
                placeholderClass='ph-search'
                value={locationSearchKey}
                onInput={(e) => setLocationSearchKey(e.detail.value)}
                onConfirm={handleSearchPoi}
              />
              {locationSearchKey && (
                <View onClick={() => { setLocationSearchKey(''); setSearchResults([]) }}>
                  <AtIcon value='close-circle' size='14' color='#ccc' />
                </View>
              )}
            </View>

            {/* 快捷操作 */}
            <View className='picker-actions'>
              <View className='picker-action-item' onClick={handleClearLocation}>
                <AtIcon value='blocked' size='18' color='#999' />
                <Text className='picker-action-text'>不显示位置</Text>
              </View>
              <View className='picker-action-item' onClick={handleChooseLocationNative}>
                <AtIcon value='map-pin' size='18' color='#999' />
                <Text className='picker-action-text'>在地图上选择</Text>
              </View>
            </View>

            {/* 分隔线 */}
            <View className='picker-divider' />

            {/* 附近地点标题 */}
            <View className='picker-section-title'>
              <Text>{locationSearchKey.trim() ? '搜索结果' : '附近地点'}</Text>
            </View>

            {/* 地点列表 */}
            <ScrollView scrollY className='picker-list'>
              {isSearching && (
                <View className='picker-loading'>
                  <AtIcon value='loading-3' size='20' color='#999' className='spin-icon' />
                  <Text className='picker-loading-text'>搜索中...</Text>
                </View>
              )}

              {!isSearching && pickerDisplayList.map((poi) => (
                <View
                  key={poi.id}
                  className={`picker-list-item ${selectedLocation?.id === poi.id ? 'selected' : ''}`}
                  onClick={() => handleSelectLocation(poi)}
                >
                  <View className='picker-item-info'>
                    <Text className='picker-item-name'>{poi.name}</Text>
                    <Text className='picker-item-address'>
                      {poi.distance ? `${poi.distance}m 路 ` : ''}{poi.address}
                    </Text>
                  </View>
                  {selectedLocation?.id === poi.id && (
                    <AtIcon value='check' size='16' color='#ff2442' />
                  )}
                </View>
              ))}

              {!isSearching && pickerDisplayList.length === 0 && (
                <View className='picker-empty'>
                  <Text className='picker-empty-text'>
                    {locationSearchKey.trim() ? '未找到相关地点' : '暂无附近地点'}
                  </Text>
                </View>
              )}
            </ScrollView>

          </View>
        </View>
      )}

      {draggingIndex !== null && dragPointer && dragPreviewPath && (
        <View
          className='drag-follow-ghost'
          style={{
            left: `${dragPointer.x}px`,
            top: `${dragPointer.y}px`,
            width: dragScope === 'thumb' ? '120px' : '104px',
            height: dragScope === 'thumb' ? '120px' : '104px',
          }}
        >
          <Image src={dragPreviewPath} mode='aspectFill' className='drag-follow-image' />
        </View>
      )}
    </View>

  )
}
