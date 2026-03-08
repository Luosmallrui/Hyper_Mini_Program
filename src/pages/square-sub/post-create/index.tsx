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

  // ========== 位置相关 ==========
  const [nearbyPois, setNearbyPois] = useState<POIItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState<POIItem | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [locationSearchKey, setLocationSearchKey] = useState('')
  const [searchResults, setSearchResults] = useState<POIItem[]>([])
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // 保存用户坐标供后续搜索使用
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

  // 页面加载 → 获取定位 → 逆地址解析拿附近 POI
  useEffect(() => {
    fetchNearbyPois()
  }, [])

  useEffect(() => {
    if (activeIndex >= mediaList.length) {
      setActiveIndex(Math.max(mediaList.length - 1, 0))
    }
  }, [mediaList, activeIndex])

  // ========== 核心：获取附近地点 ==========
  const fetchNearbyPois = async () => {
    setIsLoadingLocation(true)
    try {
      // 第一步：获取用户当前位置
      const locRes = await Taro.getLocation({
        type: 'gcj02',   // 腾讯地图使用 gcj02 坐标系
        isHighAccuracy: false,
      })

      userLatRef.current = locRes.latitude
      userLngRef.current = locRes.longitude

      // 第二步：逆地址解析 → 拿到附近 POI 列表
      // 这个接口不需要传关键词，会自动返回附近的地标/商铺/景点等
      const result = await reverseGeocode(locRes.latitude, locRes.longitude)

      setNearbyPois(result.pois)
    } catch (err: any) {
      console.warn('获取附近地点失败:', err)

      // 用户拒绝定位授权时，引导开启
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
    if (selectedLocation?.id === poi.id) {
      setSelectedLocation(null) // 取消选中
    } else {
      setSelectedLocation(poi)
    }
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

  // 备选：用微信原生地图选点
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

  // ========== 以下为原有逻辑（图片/上传/发布等，保持不变） ==========

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
        setMediaList(prev => prev.map((item) =>
          item.tempPath === filePath
            ? { ...item, serverUrl: url, isUploading: false, width: width || item.width, height: height || item.height }
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
    const newList = [...mediaList]
    newList.splice(index, 1)
    setMediaList(newList)
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
      Taro.showToast({ title: '图片上传中，请稍候...', icon: 'none' }); return
    }
    setStep('text')
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' }); return
    }
    if (mediaList.some(m => m.isUploading)) {
      Taro.showToast({ title: '图片上传中，请稍候...', icon: 'none' }); return
    }
    if (mediaList.length === 0) {
      Taro.showToast({ title: '请至少添加一张图片', icon: 'none' }); return
    }

    Taro.showLoading({ title: '发布中...' })
    try {
      const payload = {
        title,
        content,
        topic_ids: [],
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

  // 弹窗列表：有搜索词 → 搜索结果；无搜索词 → 附近列表
  const pickerDisplayList = locationSearchKey.trim() ? searchResults : nearbyPois

  // 主页面默认展示前 3 个附近地点
  const defaultPois = nearbyPois.slice(0, 3)

  return (
    <View className='post-create-page'>
      {/* 自定义导航栏 */}
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

            <ScrollView scrollX className='thumb-scroll' enableFlex>
              {mediaList.map((item, idx) => (
                <View
                  key={item.tempPath}
                  className={`thumb-item ${activeIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveIndex(idx)}
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
            <ScrollView scrollX className='mini-thumb-scroll' enableFlex>
              {mediaList.map((item, idx) => (
                <View key={item.tempPath} className='mini-thumb-item'>
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

            {/* 话题 */}
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

            {/* ===== 位置（动态获取） ===== */}
            <View className='meta-section'>
              <View className='section-header'>
                <Text className='section-title'>位置</Text>
                <Text className='section-sub'>添加位置让更多人看到你</Text>
                <Text className='section-action' onClick={handleOpenLocationPicker}>
                  {selectedLocation ? '更换' : '添加'}
                </Text>
              </View>

              {/* 已选中：高亮展示，点击可取消 */}
              {selectedLocation && (
                <View className='tag-list'>
                  <View className='tag-item active' onClick={() => setSelectedLocation(null)}>
                    <Text>{selectedLocation.name}</Text>
                    <AtIcon value='close' size='10' color='#fff' className='tag-close-icon' />
                  </View>
                </View>
              )}

              {/* 未选中：展示前 3 个附近地点，快速选择 */}
              {!selectedLocation && (
                <View className='tag-list'>
                  {isLoadingLocation ? (
                    <Text className='location-hint-text'>定位中...</Text>
                  ) : defaultPois.length > 0 ? (
                    defaultPois.map((poi) => (
                      <View
                        key={poi.id}
                        className='tag-item'
                        onClick={() => handleSelectLocation(poi)}
                      >
                        {poi.name}
                      </View>
                    ))
                  ) : (
                    <Text className='location-hint-text'>暂无附近地点，点击添加</Text>
                  )}
                </View>
              )}
            </View>

            {/* 活动 */}
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

      {/* ===== 位置选择弹窗（半屏 bottom sheet） ===== */}
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
                      {poi.distance ? `${poi.distance}m · ` : ''}{poi.address}
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
    </View>
  )
}
