import { useEffect, useState } from 'react'
import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { activateVerifier, fetchVerifierActivationInfo } from '../organizer/adapter'
import iconBack from '../../../assets/organizer/icon-back.png'
import { getActivationVersion } from './scene'
import './index.scss'

const BINDING_TIPS = [
  '1. 绑定成功后，请使用当前绑定的微信号进入小程序并扫码核销。',
  '2. 核销前请与用户确认订单及活动信息，避免误操作。',
  '3. 如用户因网络故障无法展示核销码，可使用手动核销。',
]

type ActivationState = 'loading' | 'ready' | 'error'

export default function VerifierBindPage() {
  const router = useRouter()
  const params = router.params || {}
  const [organizerName, setOrganizerName] = useState('')
  const [verifierId, setVerifierId] = useState('')
  const [activationState, setActivationState] = useState<ActivationState>('loading')
  const [activationError, setActivationError] = useState('')
  const [statusBarHeight, setStatusBarHeight] = useState(44)
  const [verifierPhone, setVerifierPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const windowInfo = Taro.getWindowInfo()
      setStatusBarHeight(windowInfo.statusBarHeight || 44)
    } catch (_) {
      setStatusBarHeight(44)
    }
  }, [])

  const loadActivationInfo = async () => {
    const version = getActivationVersion(params.scene)
    if (!version) {
      setActivationState('error')
      setActivationError('绑定链接无效，请重新扫码')
      return
    }

    setActivationState('loading')
    setActivationError('')
    try {
      const info = await fetchVerifierActivationInfo(version)
      setOrganizerName(info.organizerName)
      setVerifierId(info.verifierId || '')
      setActivationState('ready')
    } catch (error: any) {
      setActivationState('error')
      setActivationError(error?.message || '主办方信息加载失败')
    }
  }

  useEffect(() => {
    void loadActivationInfo()
  }, [])

  const handleBack = () => {
    Taro.navigateBack({
      delta: 1,
      fail: () => {
        Taro.switchTab({ url: '/pages/user/index' })
      },
    })
  }

  const handleConfirm = async () => {
    if (activationState !== 'ready') return
    const phone = verifierPhone.trim()
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '请输入正确的核销人电话', icon: 'none' })
      return
    }
    if (submitting) return

    setSubmitting(true)
    Taro.showLoading({ title: '绑定中...', mask: true })
    try {
      await activateVerifier({ phone, verifierId: verifierId || undefined })
      Taro.hideLoading()
      Taro.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => {
        handleBack()
      }, 800)
    } catch (error: any) {
      Taro.hideLoading()
      Taro.showToast({ title: error?.message || '绑定失败，请重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="verifier-bind-page">
      <View className="verifier-bind-status" style={{ height: `${statusBarHeight}px` }} />
      <View className="verifier-bind-nav">
        <View className="verifier-bind-back" onClick={handleBack}>
          <Image className="verifier-bind-back-icon" src={iconBack} mode="aspectFit" />
        </View>
        <Text className="verifier-bind-title">核销员绑定</Text>
        <View className="verifier-bind-nav-placeholder" />
      </View>

      <ScrollView className="verifier-bind-content" scrollY enhanced showScrollbar={false}>
        <View className="verifier-bind-confirmation">
          {activationState === 'loading' && <Text className="verifier-bind-state-text">正在获取主办方信息...</Text>}
          {activationState === 'error' && (
            <>
              <Text className="verifier-bind-state-text error">{activationError}</Text>
              <View className="verifier-bind-retry" onClick={() => void loadActivationInfo()}>重新加载</View>
            </>
          )}
          {activationState === 'ready' && (
            <>
              <Text className="verifier-bind-question">是否绑定</Text>
              <Text className="verifier-bind-organizer-name">{organizerName}</Text>
            </>
          )}
        </View>

        {activationState === 'ready' && (
          <>
            <View className="verifier-bind-field phone">
              <Text className="verifier-bind-label">核销人电话</Text>
              <View className="verifier-bind-input-shell">
                <Input
                  className="verifier-bind-input"
                  type="number"
                  maxlength={11}
                  value={verifierPhone}
                  placeholder="输入相关负责人的联系方式"
                  placeholderClass="verifier-bind-placeholder"
                  onInput={(event) => setVerifierPhone(event.detail.value)}
                />
              </View>
            </View>

            <View className="verifier-bind-tips">
              <Text className="verifier-bind-tip-title">提示:</Text>
              {BINDING_TIPS.map((item) => (
                <Text key={item} className="verifier-bind-tip">{item}</Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {activationState === 'ready' && (
        <View className="verifier-bind-footer">
          <View className={`verifier-bind-confirm ${submitting ? 'loading' : ''}`} onClick={handleConfirm}>
            <Text className="verifier-bind-confirm-text">{submitting ? '绑定中...' : '确认绑定'}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
