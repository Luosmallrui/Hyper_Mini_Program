import { PropsWithChildren, useEffect } from 'react'
import { View } from '@tarojs/components'
import Taro, { useLaunch } from '@tarojs/taro'
import { appUpdate } from './utils'
import IMService from './utils/im'
import { scheduleAutoRefresh } from './utils/request'
import { refreshDirectMessageEnabled } from './utils/system-config'
import './app.less'

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
    return current?.route === 'pages/auth/index' || current?.route === 'pages/auth-code/index'
  }

  useLaunch(() => {
    appUpdate()
    enableWeappShareMenu()

    // 游客模式：清理历史版本遗留的强制登录标记
    Taro.removeStorageSync('__force_auth_gate__')

    // 预热平台配置（私信开关等），供各页面同步读缓存
    void refreshDirectMessageEnabled()

    console.log(
      `\n %c 电子科技大学${process.env.NODE_ENV} %c ${process.env.YDY_APP_API} \n`,
      'color: #fff; background: #008bf8; padding:5px 0; font-size:12px;font-weight: bold;',
      'background: #008bf8; padding:5px 0; font-size:12px;',
    )
  })

  useEffect(() => {
    const token = Taro.getStorageSync('access_token')
    const expire = Taro.getStorageSync('access_expire')

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

    // 会话过期仅关闭 IM，不再强制跳转登录页；页面各自降级为游客态
    const handleForceLogout = () => {
      IMService.getInstance().close()
    }

    const handleLoginSuccess = () => {
      if (isAuthPage()) return
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

  return (
    <View className='app-root'>
      {children}
    </View>
  )
}

export default App
