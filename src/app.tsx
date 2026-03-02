import { PropsWithChildren, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLaunch } from '@tarojs/taro'
import { appUpdate } from './utils'
import IMService from './utils/im'
import { scheduleAutoRefresh } from './utils/request'
import './app.less'

const AUTH_PAGE_ROUTE = 'pages/auth/index'
const AUTH_CODE_PAGE_ROUTE = 'pages/auth-code/index'
const AUTH_PAGE_URL = '/pages/auth/index'
const FORCE_AUTH_KEY = '__force_auth_gate__'
const AUTH_REDIRECT_KEY = '__auth_redirect__'
const DEFAULT_REDIRECT = '/pages/index/index'

if (typeof console.time !== 'function') {
  const timeMap: Record<string, number> = {}

  console.time = function (label) {
    timeMap[label] = Date.now()
  }

  console.timeEnd = function (label) {
    if (timeMap[label]) {
      console.log(`${label}: ${Date.now() - timeMap[label]}ms`)
      delete timeMap[label]
    } else {
      console.log(`Timer '${label}' does not exist`)
    }
  }
}

function App({ children }: PropsWithChildren<any>) {
  const [isSwitching, setIsSwitching] = useState(false)

  const enableWeappShareMenu = () => {
    if (process.env.TARO_ENV !== 'weapp') return
    if (typeof Taro.showShareMenu !== 'function') return
    try {
      const shareMenuOptions: any = {
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      }
      Taro.showShareMenu(shareMenuOptions)
    } catch (error) {
      console.warn('showShareMenu failed', error)
    }
  }

  const isAuthPage = () => {
    const pages = Taro.getCurrentPages()
    const current: any = pages[pages.length - 1]
    return current?.route === AUTH_PAGE_ROUTE || current?.route === AUTH_CODE_PAGE_ROUTE
  }

  const buildCurrentPageUrl = () => {
    const pages = Taro.getCurrentPages()
    const current: any = pages[pages.length - 1]
    if (!current?.route) return DEFAULT_REDIRECT
    const basePath = `/${current.route}`
    const options = current.options || {}
    const query = Object.keys(options)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
      .join('&')
    return query ? `${basePath}?${query}` : basePath
  }

  const navigateToAuthPage = () => {
    if (isAuthPage()) return
    const redirectUrl = buildCurrentPageUrl()
    if (redirectUrl && !redirectUrl.startsWith(AUTH_PAGE_URL) && !redirectUrl.startsWith('/pages/auth-code/index')) {
      Taro.setStorageSync(AUTH_REDIRECT_KEY, redirectUrl)
    }
    Taro.reLaunch({ url: AUTH_PAGE_URL })
  }

  const ensureAuthRoute = () => {
    const token = Taro.getStorageSync('access_token')
    const forceAuthGate = Taro.getStorageSync(FORCE_AUTH_KEY) === 1
    if (token && !forceAuthGate) return
    navigateToAuthPage()
  }

  useLaunch(() => {
    appUpdate()
    enableWeappShareMenu()

    console.log(
      `\n %c 电子科技大学${process.env.NODE_ENV} %c ${process.env.YDY_APP_API} \n`,
      'color: #fff; background: #008bf8; padding:5px 0; font-size:12px;font-weight: bold;',
      'background: #008bf8; padding:5px 0; font-size:12px;',
    )
  })

  useDidShow(() => {
    ensureAuthRoute()
  })

  useEffect(() => {
    const token = Taro.getStorageSync('access_token')
    const expire = Taro.getStorageSync('access_expire')

    ensureAuthRoute()

    if (token) {
      IMService.getInstance().connect()
      if (expire) {
        scheduleAutoRefresh(expire)
      }
    }

    const handleConnect = () => {
      IMService.getInstance().reset()
      setTimeout(() => {
        IMService.getInstance().connect()
      }, 500)
    }

    const handleForceLogout = () => {
      IMService.getInstance().close()
      Taro.setStorageSync(FORCE_AUTH_KEY, 1)
      navigateToAuthPage()
    }

    const handleLoginSuccess = () => {
      const topPages = Taro.getCurrentPages()
      const current: any = topPages[topPages.length - 1]
      if (current?.route === AUTH_PAGE_ROUTE) return
      IMService.getInstance().reset()
      setTimeout(() => {
        IMService.getInstance().connect()
      }, 500)
    }

    Taro.eventCenter.on('USER_INFO_UPDATED', handleConnect)
    Taro.eventCenter.on('TOKEN_REFRESHED', handleConnect)
    Taro.eventCenter.on('FORCE_LOGOUT', handleForceLogout)
    Taro.eventCenter.on('AUTH_LOGIN_SUCCESS', handleLoginSuccess)

    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', handleConnect)
      Taro.eventCenter.off('TOKEN_REFRESHED', handleConnect)
      Taro.eventCenter.off('FORCE_LOGOUT', handleForceLogout)
      Taro.eventCenter.off('AUTH_LOGIN_SUCCESS', handleLoginSuccess)
    }
  }, [])

  useEffect(() => {
    const handleSwitchLoading = (flag: boolean) => {
      setIsSwitching(Boolean(flag))
    }
    Taro.eventCenter.on('TAB_SWITCH_LOADING', handleSwitchLoading)
    return () => {
      Taro.eventCenter.off('TAB_SWITCH_LOADING', handleSwitchLoading)
    }
  }, [])

  return (
    <View className='app-root'>
      {children}
      {isSwitching && (
        <View className='global-loading-mask'>
          <View className='global-loading-spinner' />
          <Text className='global-loading-text'>Loading...</Text>
        </View>
      )}
    </View>
  )
}

export default App
