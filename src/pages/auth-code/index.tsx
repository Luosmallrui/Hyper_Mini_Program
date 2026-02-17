import { useEffect } from 'react'
import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import AuthGate from '@/components/AuthGate'
import './index.less'

const FORCE_AUTH_KEY = '__force_auth_gate__'
const AUTH_REDIRECT_KEY = '__auth_redirect__'
const DEFAULT_REDIRECT = '/pages/index/index'
const TAB_PAGES = ['/pages/index/index', '/pages/square/index', '/pages/message/index', '/pages/user/index']

const goAfterLogin = () => {
  const redirectUrl = String(Taro.getStorageSync(AUTH_REDIRECT_KEY) || DEFAULT_REDIRECT)
  Taro.removeStorageSync(AUTH_REDIRECT_KEY)

  const redirectPath = redirectUrl.split('?')[0]
  if (TAB_PAGES.includes(redirectPath)) {
    Taro.switchTab({
      url: redirectPath,
      fail: () => {
        Taro.switchTab({ url: DEFAULT_REDIRECT })
      },
    })
    return
  }

  Taro.reLaunch({
    url: redirectUrl,
    fail: () => {
      Taro.switchTab({ url: DEFAULT_REDIRECT })
    },
  })
}

export default function AuthCodePage() {
  useDidShow(() => {
    const token = Taro.getStorageSync('access_token')
    const forceAuth = Taro.getStorageSync(FORCE_AUTH_KEY) === 1
    if (token && !forceAuth) {
      goAfterLogin()
    }
  })

  useEffect(() => {
    const handleLoginSuccess = () => {
      Taro.removeStorageSync(FORCE_AUTH_KEY)
      goAfterLogin()
    }

    Taro.eventCenter.on('AUTH_LOGIN_SUCCESS', handleLoginSuccess)
    return () => {
      Taro.eventCenter.off('AUTH_LOGIN_SUCCESS', handleLoginSuccess)
    }
  }, [])

  return (
    <View className='auth-code-page'>
      <AuthGate
        visible
        mode='code'
        onBack={() => {
          Taro.navigateBack({ delta: 1 })
        }}
      />
    </View>
  )
}
