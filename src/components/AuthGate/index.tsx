import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Image, Input, Text, Video, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { cacheUserInfo } from '@/utils/user-info'
import { request, saveTokens } from '@/utils/request'
import hyperIcon from '../../assets/images/hyper-icon.png'
import './index.less'

const VIDEO_SRC = 'https://cdn.hypercn.cn/video/video.mp4'
const VERIFY_CODE_LEN = 6

type AuthMode = 'quick' | 'code'
type CodeStep = 'phone' | 'verify'
type AgreementType = 'user' | 'privacy'

interface AuthGateProps {
  visible?: boolean
  mode?: AuthMode
  onBack?: () => void
  onGoCodeLogin?: () => void
}

interface NavMetrics {
  top: number
  height: number
  sidePadding: number
  menuWidth: number
}

const AGREEMENT_DETAIL_MAP: Record<AgreementType, { title: string; sections: string[] }> = {
  user: {
    title: '用户协议',
    sections: [
      '欢迎使用 HYPER。使用本服务前，请确认你已具备完全民事行为能力，并理解平台将按照活动报名、票务履约、社区互动和客服支持所需处理账号信息。',
      '你应保证提交的手机号、昵称、头像、观演人实名信息真实、合法、有效，不得发布违法违规内容，不得扰乱活动现场和社区秩序。',
      '平台会基于活动规则、订单状态、退款规则和社区规范提供服务，并在发现异常交易、违规内容或安全风险时采取必要处置。',
    ],
  },
  privacy: {
    title: '隐私协议',
    sections: [
      'HYPER 会在登录注册、活动报名、票务核验、消息通知和客户服务场景中收集必要信息，包括账号资料、手机号、定位授权结果、订单和实名观演人信息。',
      '平台仅在完成服务、保障交易安全、履行法定义务和获得你授权的范围内使用相关信息，并会采用访问控制、加密传输等方式保护数据安全。',
      '你可以在个人中心维护头像、昵称等资料，也可以通过客服渠道咨询个人信息查询、更正、删除和授权撤回事宜。',
    ],
  },
}

const normalizeResponse = (payload: any) => {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload)
    } catch (error) {
      return null
    }
  }
  return payload
}

const isApiSuccess = (res: any, body: any) => {
  const statusOk = typeof res?.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 300
  const code = body?.code
  const codeOk = code === 200 || code === 0
  const successFlag = body?.success === true
  const hasErrorText = typeof body?.msg === 'string' && /失败|错误|error|fail/i.test(body.msg)

  if (codeOk || successFlag) return true
  if (statusOk && (body == null || typeof body !== 'object' || (!hasErrorText && typeof code === 'undefined'))) {
    return true
  }
  return false
}

const maskPhone = (phone: string) => {
  if (phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

export default function AuthGate(props: AuthGateProps) {
  const {
    visible = true,
    mode = 'quick',
    onBack,
    onGoCodeLogin,
  } = props

  const [agreeProtocol, setAgreeProtocol] = useState(false)
  const [phone, setPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [codeStep, setCodeStep] = useState<CodeStep>('phone')
  const [countdown, setCountdown] = useState(0)
  const [showAgreementSheet, setShowAgreementSheet] = useState(false)
  const [agreementDetailType, setAgreementDetailType] = useState<AgreementType | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  const [codeInputFocus, setCodeInputFocus] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [navMetrics, setNavMetrics] = useState<NavMetrics>({
    top: 44,
    height: 32,
    sidePadding: 24,
    menuWidth: 88,
  })
  const pendingActionRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    // 游客模式下登录页由 navigateTo 打开，允许用户放弃返回
    setCanGoBack(Taro.getCurrentPages().length > 1)
  }, [])

  useEffect(() => {
    const winInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const statusBarHeight = winInfo.statusBarHeight || 20
    const windowWidth = winInfo.windowWidth || 375

    const top = menuInfo.top > 0 ? menuInfo.top : statusBarHeight
    const height = menuInfo.height > 0 ? menuInfo.height : 32
    const menuWidth = menuInfo.width > 0 ? menuInfo.width : 88
    const sidePadding = menuInfo.right > 0 ? Math.max(windowWidth - menuInfo.right, 16) : 24

    setNavMetrics({ top, height, sidePadding, menuWidth })
  }, [])

  useEffect(() => {
    if (!countdown) return
    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (mode !== 'code') {
      setCodeStep('phone')
      setVerifyCode('')
      return
    }
    setCodeStep('phone')
    setVerifyCode('')
  }, [mode])

  useEffect(() => {
    if (!visible) {
      setShowAgreementSheet(false)
      setAgreementDetailType(null)
      pendingActionRef.current = null
      setCodeInputFocus(false)
    }
  }, [visible])

  const isPhoneValid = useMemo(() => /^1\d{10}$/.test(phone), [phone])
  const canSendCode = useMemo(() => isPhoneValid && countdown === 0 && !sendingCode, [isPhoneValid, countdown, sendingCode])

  const topBarStyle: CSSProperties = useMemo(
    () => ({
      top: `${navMetrics.top}px`,
      height: `${navMetrics.height}px`,
      left: `${navMetrics.sidePadding}px`,
      right: `${navMetrics.sidePadding}px`,
    }),
    [navMetrics],
  )

  const backButtonStyle: CSSProperties = useMemo(
    () => ({
      width: `${navMetrics.height}px`,
      height: `${navMetrics.height}px`,
    }),
    [navMetrics.height],
  )

  const rightPlaceholderStyle: CSSProperties = useMemo(
    () => ({
      width: `${navMetrics.menuWidth}px`,
      height: `${navMetrics.height}px`,
    }),
    [navMetrics.menuWidth, navMetrics.height],
  )

  const codeContentStyle: CSSProperties = useMemo(
    () => ({
      top: `${navMetrics.top + navMetrics.height + 64}px`,
    }),
    [navMetrics.top, navMetrics.height],
  )

  const runWithAgreement = (action: () => void) => {
    if (agreeProtocol) {
      action()
      return
    }
    pendingActionRef.current = action
    setShowAgreementSheet(true)
  }

  const fetchLatestUser = async () => {
    const userRes = await request({
      url: '/api/v1/user/info',
      method: 'GET',
    })
    const userBody = normalizeResponse(userRes?.data)
    if (userBody?.code === 200 && userBody?.data?.user) {
      const normalized = cacheUserInfo(userBody.data)
      Taro.eventCenter.trigger('USER_INFO_UPDATED', normalized)
    }
  }

  const handleLoginSuccess = async (authData: any) => {
    const accessToken = authData?.access_token
    const refreshToken = authData?.refresh_token
    const accessExpire = authData?.access_expire

    if (!accessToken) {
      throw new Error('登录返回缺少 access_token')
    }

    saveTokens(accessToken, refreshToken, accessExpire)
    Taro.eventCenter.trigger('TOKEN_REFRESHED', accessToken)

    try {
      await fetchLatestUser()
    } catch (error) {}

    // Defer route changes so the current login flow can finish cleanly first.
    setTimeout(() => {
      Taro.eventCenter.trigger('AUTH_LOGIN_SUCCESS')
    }, 0)
  }

  const doQuickLogin = async () => {
    if (loggingIn) return

    setLoggingIn(true)
    Taro.showLoading({ title: '登录中...', mask: true })

    try {
      const loginRes = await Taro.login()
      if (!loginRes?.code) {
        throw new Error('获取登录凭证失败')
      }

      const res = await request({
        url: '/api/v1/auth/wx-login',
        method: 'POST',
        data: { code: loginRes.code },
      })
      const body = normalizeResponse(res?.data)
      if (body?.code !== 200 || !body?.data) {
        throw new Error(body?.msg || '登录失败')
      }

      await handleLoginSuccess(body.data)
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '登录失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
      setLoggingIn(false)
    }
  }

  const doSendCode = async () => {
    if (!isPhoneValid) {
      Taro.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (!canSendCode) return

    setSendingCode(true)
    try {
      const res = await request({
        url: '/api/v1/auth/send-code',
        method: 'POST',
        data: { phone },
      })
      const body = normalizeResponse(res?.data)
      if (!isApiSuccess(res, body)) {
        throw new Error(body?.msg || '发送失败')
      }
      setCodeStep('verify')
      setVerifyCode('')
      setCountdown(60)
      setCodeInputFocus(true)
      Taro.showToast({ title: '验证码已发送', icon: 'none' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '发送失败', icon: 'none' })
    } finally {
      setSendingCode(false)
    }
  }

  const doCodeLogin = async (nextCode?: string) => {
    const codeToSubmit = nextCode ?? verifyCode
    if (!isPhoneValid) {
      Taro.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (codeToSubmit.length !== VERIFY_CODE_LEN) {
      Taro.showToast({ title: '请输入完整验证码', icon: 'none' })
      return
    }
    if (loggingIn) return

    setLoggingIn(true)
    Taro.showLoading({ title: '登录中...', mask: true })

    try {
      const res = await request({
        url: '/api/v1/auth/login',
        method: 'POST',
        data: { phone, code: codeToSubmit },
      })
      const body = normalizeResponse(res?.data)
      if (body?.code !== 200 || !body?.data) {
        throw new Error(body?.msg || '登录失败')
      }

      await handleLoginSuccess(body.data)
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '登录失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
      setLoggingIn(false)
    }
  }

  const handleCodeInput = (value: string) => {
    const next = (value || '').replace(/\D/g, '').slice(0, VERIFY_CODE_LEN)
    setVerifyCode(next)
    if (next.length === VERIFY_CODE_LEN) {
      runWithAgreement(() => {
        void doCodeLogin(next)
      })
    }
  }

  const handleBack = () => {
    if (mode === 'code' && codeStep === 'verify') {
      setCodeStep('phone')
      setVerifyCode('')
      setCodeInputFocus(false)
      return
    }
    if (onBack) {
      onBack()
      return
    }
    Taro.navigateBack({ delta: 1 })
  }

  const handlePrimaryClick = () => {
    if (mode === 'quick') {
      runWithAgreement(() => {
        void doQuickLogin()
      })
      return
    }

    if (codeStep === 'phone') {
      runWithAgreement(() => {
        void doSendCode()
      })
      return
    }

    runWithAgreement(() => {
      void doCodeLogin()
    })
  }

  const handleAgreeAndContinue = () => {
    setAgreeProtocol(true)
    setShowAgreementSheet(false)
    setAgreementDetailType(null)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action) {
      action()
    }
  }

  const handleOpenAgreementDetail = (type: AgreementType, event?: any) => {
    event?.stopPropagation?.()
    setAgreementDetailType(type)
  }

  if (!visible) return null

  return (
    <View className={`auth-gate ${mode === 'code' ? 'auth-gate--code' : ''}`}>
      {mode === 'quick' && !videoError && (
        <Video
          className='auth-gate__video'
          src={VIDEO_SRC}
          autoplay
          loop
          muted
          controls={false}
          showCenterPlayBtn={false}
          showFullscreenBtn={false}
          enableProgressGesture={false}
          objectFit='cover'
          onLoadedMetaData={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
        />
      )}

      <View className={`auth-gate__fallback ${videoReady ? 'ready' : ''} ${videoError ? 'error' : ''}`} />
      <View className='auth-gate__mask' />

      <View className='auth-gate__top' style={topBarStyle}>
        <View className='auth-gate__top-left'>
          {mode === 'code' || canGoBack || onBack ? (
            <View className='auth-gate__back' style={backButtonStyle} onClick={handleBack}>
              <Text className='auth-gate__back-arrow'>‹</Text>
            </View>
          ) : (
            <View className='auth-gate__back auth-gate__back--placeholder' style={backButtonStyle} />
          )}
        </View>

        <View className='auth-gate__top-center'>
          {!logoLoadFailed ? (
            <Image className='auth-gate__top-logo' src={hyperIcon} mode='aspectFit' onError={() => setLogoLoadFailed(true)} />
          ) : (
            <Text className='auth-gate__top-logo-fallback'>HYPER</Text>
          )}
        </View>

        <View className='auth-gate__top-right' style={rightPlaceholderStyle} />
      </View>

      {mode === 'quick' ? (
        <View className='auth-gate__quick-content'>
          <View className='auth-gate__bottom-logo-wrap'>
            {!logoLoadFailed ? (
              <Image className='auth-gate__bottom-logo' src={hyperIcon} mode='aspectFit' onError={() => setLogoLoadFailed(true)} />
            ) : (
              <Text className='auth-gate__top-logo-fallback'>HYPER</Text>
            )}
          </View>
          <Button className='auth-gate__quick-btn' loading={loggingIn} disabled={loggingIn} onClick={handlePrimaryClick}>
            一键快速登录
          </Button>

          <View className='auth-gate__quick-switch' onClick={onGoCodeLogin}>
            使用验证码登录
          </View>

          <View className='auth-gate__agreement-row' onClick={() => setAgreeProtocol((prev) => !prev)}>
            <View className='auth-gate__checkbox'>
              <View className={`auth-gate__checkbox-circle ${agreeProtocol ? 'checked' : ''}`}>
                {agreeProtocol && <View className='auth-gate__checkbox-dot' />}
              </View>
            </View>
            <Text className='auth-gate__agreement-text'>
              我已阅读并同意
              <Text className='auth-gate__agreement-link' onClick={(event) => handleOpenAgreementDetail('user', event)}>《用户协议》</Text>
              和
              <Text className='auth-gate__agreement-link' onClick={(event) => handleOpenAgreementDetail('privacy', event)}>《隐私协议》</Text>
              ，允许HYPER统一管理本人账号信息
            </Text>
          </View>
        </View>
      ) : (
        <View className='auth-gate__code-content' style={codeContentStyle}>
          <Text className='auth-gate__code-title'>{codeStep === 'phone' ? '手机号登录/注册' : '输入验证码'}</Text>
          <Text className='auth-gate__code-subtitle'>
            {codeStep === 'phone'
              ? '未注册的手机号验证通过后将自动注册HYPER账号'
              : `验证码已发送至+86${maskPhone(phone)}`}
          </Text>

          {codeStep === 'phone' ? (
            <>
              <View className='auth-gate__line-input'>
                <Text className='auth-gate__country-code'>+86</Text>
                <Input
                  className='auth-gate__line-input-field'
                  type='number'
                  maxlength={11}
                  placeholder='请输入手机号'
                  placeholderClass='auth-gate__line-placeholder'
                  value={phone}
                  onInput={(event) => setPhone((event.detail.value || '').replace(/\D/g, '').slice(0, 11))}
                />
              </View>

              <Button
                className={`auth-gate__code-main-btn ${isPhoneValid ? 'enabled' : ''}`}
                loading={sendingCode}
                disabled={sendingCode}
                onClick={handlePrimaryClick}
              >
                获取短信验证码
              </Button>
            </>
          ) : (
            <>
              <View className='auth-gate__verify-row' onClick={() => setCodeInputFocus(true)}>
                {Array.from({ length: VERIFY_CODE_LEN }).map((_, index) => {
                  const digit = verifyCode[index] || ''
                  const isActive = index === verifyCode.length && verifyCode.length < VERIFY_CODE_LEN
                  return (
                    <View key={`digit-${index}`} className={`auth-gate__verify-cell ${isActive ? 'active' : ''}`}>
                      <Text className='auth-gate__verify-digit'>{digit}</Text>
                    </View>
                  )
                })}
              </View>

              <Input
                className='auth-gate__verify-hidden-input'
                type='number'
                maxlength={VERIFY_CODE_LEN}
                focus={codeInputFocus}
                value={verifyCode}
                onInput={(event) => handleCodeInput(event.detail.value)}
                onBlur={() => setCodeInputFocus(false)}
              />

              <View
                className={`auth-gate__resend ${canSendCode ? 'active' : ''}`}
                onClick={() => {
                  runWithAgreement(() => {
                    void doSendCode()
                  })
                }}
              >
                {countdown > 0 ? `${countdown}s 后重新获取` : '重新获取'}
              </View>
            </>
          )}

          <View className='auth-gate__agreement-row auth-gate__agreement-row--code' onClick={() => setAgreeProtocol((prev) => !prev)}>
            <View className='auth-gate__checkbox'>
              <View className={`auth-gate__checkbox-circle ${agreeProtocol ? 'checked' : ''}`}>
                {agreeProtocol && <View className='auth-gate__checkbox-dot' />}
              </View>
            </View>
            <Text className='auth-gate__agreement-text auth-gate__agreement-text--code'>
              我已阅读并同意
              <Text className='auth-gate__agreement-link' onClick={(event) => handleOpenAgreementDetail('user', event)}>《用户协议》</Text>
              和
              <Text className='auth-gate__agreement-link' onClick={(event) => handleOpenAgreementDetail('privacy', event)}>《隐私协议》</Text>
              ，允许HYPER统一管理本人账号信息
            </Text>
          </View>
        </View>
      )}

      {showAgreementSheet && (
        <View className={`auth-gate__agreement-overlay ${mode === 'code' ? 'dialog' : ''}`}>
          {mode === 'code' ? (
            <View className='auth-gate__agreement-dialog'>
              <Text className='auth-gate__dialog-title'>用户登录指引协议</Text>
              <Text className='auth-gate__dialog-content'>
                阅读并同意《用户协议》和《隐私协议》，允许HYPER统一管理本人账号信息
              </Text>
              <View className='auth-gate__dialog-actions'>
                <View
                  className='auth-gate__dialog-btn'
                  onClick={() => {
                    pendingActionRef.current = null
                    setShowAgreementSheet(false)
                  }}
                >
                  不同意
                </View>
                <View className='auth-gate__dialog-btn auth-gate__dialog-btn--primary' onClick={handleAgreeAndContinue}>
                  同意并登录
                </View>
              </View>
            </View>
          ) : (
            <View className='auth-gate__sheet'>
              <View className='auth-gate__sheet-header'>
                <Text className='auth-gate__sheet-title'>温馨提示</Text>
                <View className='auth-gate__sheet-close' onClick={() => setShowAgreementSheet(false)}>
                  <Text className='auth-gate__sheet-close-text'>×</Text>
                </View>
              </View>

              <Text className='auth-gate__sheet-desc'>
                请阅读并同意
                <Text className='auth-gate__agreement-link' onClick={(event) => handleOpenAgreementDetail('user', event)}>《用户协议》</Text>
                和
                <Text className='auth-gate__agreement-link' onClick={(event) => handleOpenAgreementDetail('privacy', event)}>《隐私协议》</Text>
                ，允许HYPER统一管理本人账号信息
              </Text>

              <Button className='auth-gate__sheet-btn' onClick={handleAgreeAndContinue}>
                同意并登录
              </Button>
            </View>
          )}
        </View>
      )}

      {agreementDetailType && (
        <View className='auth-gate__detail-overlay' onClick={() => setAgreementDetailType(null)}>
          <View className='auth-gate__detail-card' onClick={(event) => event.stopPropagation()}>
            <Text className='auth-gate__detail-title'>{AGREEMENT_DETAIL_MAP[agreementDetailType].title}</Text>
            <View className='auth-gate__detail-body'>
              {AGREEMENT_DETAIL_MAP[agreementDetailType].sections.map((section) => (
                <Text key={section} className='auth-gate__detail-paragraph'>{section}</Text>
              ))}
            </View>
            <Button className='auth-gate__detail-btn' onClick={() => setAgreementDetailType(null)}>
              我知道了
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
