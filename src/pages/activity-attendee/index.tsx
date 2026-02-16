import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

interface ViewerItem {
  id: number
  user_id: number
  real_name: string
  id_card: string
  phone: string
  type: number
  created_at: string
  updated_at: string
}

type PageMode = 'list' | 'create'

export default function ActivityAttendeePage() {
  const router = useRouter()
  const initialMode: PageMode = router.params?.mode === 'create' ? 'create' : 'list'
  const initialSelectedViewerId = Number(router.params?.selectedViewerId || 0) || null
  const eventChannelRef = useRef<Taro.EventChannel | null>(null)
  const hasChangedRef = useRef(false)

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [mode, setMode] = useState<PageMode>(initialMode)

  const [name, setName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [viewers, setViewers] = useState<ViewerItem[]>([])
  const [selectedViewerId, setSelectedViewerId] = useState<number | null>(initialSelectedViewerId)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
  }, [])

  useEffect(() => {
    const channel = Taro.getCurrentInstance().page?.getOpenerEventChannel?.()
    eventChannelRef.current = (channel as Taro.EventChannel) || null
  }, [])

  useEffect(() => {
    if (initialMode !== 'list') return
    void fetchViewerList(initialSelectedViewerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitAndBack = () => {
    eventChannelRef.current?.emit('VIEWER_CHANGED', {
      selectedViewerId,
      changed: hasChangedRef.current,
    })
    Taro.navigateBack()
  }

  const markChanged = () => {
    hasChangedRef.current = true
  }

  const fetchViewerList = async (preferredViewerId?: number | null) => {
    try {
      setLoading(true)
      const res = await request({
        url: '/api/v1/order/list-viewer',
        method: 'GET',
      })
      const list: ViewerItem[] = Array.isArray(res?.data?.data?.viewers) ? res.data.data.viewers : []
      setViewers(list)
      if (list.length === 0) {
        setSelectedViewerId(null)
        return
      }
      const candidate = preferredViewerId ?? selectedViewerId
      const matched = typeof candidate === 'number' && list.some((item) => item.id === candidate)
      setSelectedViewerId(matched ? candidate! : list[0].id)
    } catch (error) {
      console.error('viewer list load failed:', error)
      Taro.showToast({ title: '加载观演人失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteViewer = async (id: number) => {
    if (deletingId !== null) return
    try {
      setDeletingId(id)
      const res = await request({
        url: '/api/v1/order/delete-viewer',
        method: 'POST',
        data: { id },
      })
      const payload = res?.data
      if (payload?.code !== 200) {
        throw new Error(payload?.msg || '删除观演人失败')
      }
      const nextList = viewers.filter((item) => item.id !== id)
      setViewers(nextList)
      if (selectedViewerId === id) {
        setSelectedViewerId(nextList.length > 0 ? nextList[0].id : null)
      }
      markChanged()
      Taro.showToast({ title: '删除成功', icon: 'none' })
    } catch (error: any) {
      console.error('delete viewer failed:', error)
      Taro.showToast({ title: error?.message || '删除失败', icon: 'none' })
    } finally {
      setDeletingId(null)
    }
  }

  const validateForm = () => {
    const trimmedName = name.trim()
    const trimmedIdCard = idCard.trim().toUpperCase()
    const trimmedPhone = phone.trim()
    if (!trimmedName) {
      Taro.showToast({ title: '请输入真实姓名', icon: 'none' })
      return null
    }
    if (!/^\d{17}(\d|X)$/.test(trimmedIdCard)) {
      Taro.showToast({ title: '请输入正确身份证号', icon: 'none' })
      return null
    }
    if (!/^1\d{10}$/.test(trimmedPhone)) {
      Taro.showToast({ title: '请输入正确手机号', icon: 'none' })
      return null
    }
    if (!agreed) {
      Taro.showToast({ title: '请先同意实名须知', icon: 'none' })
      return null
    }
    return {
      real_name: trimmedName,
      id_card: trimmedIdCard,
      phone: trimmedPhone,
    }
  }

  const handleCreateViewer = async () => {
    if (saving) return
    const payload = validateForm()
    if (!payload) return
    try {
      setSaving(true)
      const res = await request({
        url: '/api/v1/order/create-viewer',
        method: 'POST',
        data: payload,
      })
      const body = res?.data
      if (body?.code !== 200) {
        throw new Error(body?.msg || '创建观演人失败')
      }
      const createdId = Number(body?.data?.id || body?.data?.viewer?.id || 0) || null
      markChanged()
      setName('')
      setIdCard('')
      setPhone('')
      setAgreed(false)
      setMode('list')
      await fetchViewerList(createdId ?? -1)
      Taro.showToast({ title: '创建成功', icon: 'none' })
    } catch (error: any) {
      console.error('create viewer failed:', error)
      Taro.showToast({ title: error?.message || '创建失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (mode === 'create') {
      if (initialMode === 'create') {
        emitAndBack()
        return
      }
      setMode('list')
      return
    }
    emitAndBack()
  }

  const handleSelectViewer = (id: number) => {
    if (selectedViewerId !== id) {
      setSelectedViewerId(id)
      markChanged()
    }
  }

  return (
    <View className='attendee-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px` }}>
        <View className='nav-left' onClick={handleBack}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        <View className='nav-title'>{mode === 'list' ? '观演人管理' : '新增观演人'}</View>
      </View>

      <View className='form-body' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>
        {mode === 'list' ? (
          <ScrollView scrollY className='viewer-list-body'>
            {loading ? (
              <Text className='list-empty'>加载中...</Text>
            ) : viewers.length === 0 ? (
              <Text className='list-empty'>暂无观演人，请先新增</Text>
            ) : (
              viewers.map((item) => (
                <View key={item.id} className='viewer-card' onClick={() => handleSelectViewer(item.id)}>
                  <View className='viewer-content'>
                    <Text className='viewer-main'>{item.real_name}</Text>
                    <Text className='viewer-sub'>
                      {item.id_card} {item.phone}
                    </Text>
                  </View>
                  <View className='viewer-actions'>
                    <View className={`viewer-radio ${selectedViewerId === item.id ? 'active' : ''}`} />
                    <View
                      className={`viewer-delete ${deletingId === item.id ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDeleteViewer(item.id)
                      }}
                    >
                      删除
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <>
            <View className='field'>
              <Text className='label'>真实姓名</Text>
              <Input
                className='input'
                placeholder='请输入您的真实姓名'
                value={name}
                onInput={(e) => setName(e.detail.value)}
              />
            </View>

            <View className='field'>
              <Text className='label'>身份信息</Text>
              <Input
                className='input'
                placeholder='请输入您的身份证号'
                value={idCard}
                onInput={(e) => setIdCard(e.detail.value)}
              />
            </View>

            <View className='field'>
              <Text className='label'>手机号码</Text>
              <Input
                className='input'
                placeholder='请输入您的联系方式'
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
              />
            </View>

            <View className='agree-row' onClick={() => setAgreed(!agreed)}>
              <View className={`agree-dot ${agreed ? 'checked' : ''}`} />
              <Text className='agree-text'>请阅读并同意</Text>
              <Text className='agree-link'>《实名须知》</Text>
              <Text className='agree-text'>允许 HYPER 统一管理本人信息</Text>
            </View>
          </>
        )}
      </View>

      <View className='bottom-bar'>
        {mode === 'list' ? (
          <View className='action-row'>
            <View className='action-btn secondary' onClick={() => setMode('create')}>
              新增观演人
            </View>
            <View className='action-btn primary' onClick={emitAndBack}>
              完成
            </View>
          </View>
        ) : (
          <View className={`submit-btn ${saving ? 'disabled' : 'active'}`} onClick={handleCreateViewer}>
            {saving ? '保存中...' : '确认保存'}
          </View>
        )}
      </View>
    </View>
  )
}
