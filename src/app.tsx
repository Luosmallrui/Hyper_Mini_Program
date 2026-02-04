import { PropsWithChildren, useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLaunch } from '@tarojs/taro'
import { appUpdate } from './utils'
import IMService from './utils/im'
// 【新增】引入自动刷新调度器
import { scheduleAutoRefresh } from './utils/request'
import './app.less'

// 在app.js或app.tsx文件顶部添加这段代码
if (typeof console.time !== 'function') {
  const timeMap = {};

  console.time = function(label) {
    timeMap[label] = Date.now();
  };

  console.timeEnd = function(label) {
    if (timeMap[label]) {
      console.log(`${label}: ${Date.now() - timeMap[label]}ms`);
      delete timeMap[label];
    } else {
      console.log(`Timer '${label}' does not exist`);
    }
  };
}

function App({ children }: PropsWithChildren<any>) {
  const [isSwitching, setIsSwitching] = useState(false)

  useLaunch(() => {
    // 小程序更新
    appUpdate();

    // 不要删除，用来识别当前项目环境
    console.log(
      `\n %c 电子科技大学${process.env.NODE_ENV} %c ${process.env.YDY_APP_API} \n`,
      "color: #fff; background: #008bf8; padding:5px 0; font-size:12px;font-weight: bold;",
      "background: #008bf8; padding:5px 0; font-size:12px;"
    );
  })

  useEffect(() => {
    // 1. 初始化检查
    const token = Taro.getStorageSync('access_token')
    // 【新增】读取本地存储的过期时间
    const expire = Taro.getStorageSync('access_expire')

    if (token) {
      // 如果已登录，启动 IM 连接
      IMService.getInstance().connect()

      // 【新增】如果有过期时间，应用启动时恢复自动刷新定时器
      // 否则用户杀掉小程序再进来，定时器就没了
      if (expire) {
        scheduleAutoRefresh(expire)
      }
    }
    
    // 定义连接和关闭处理函数
    const handleConnect = () => {
      console.log('[App] 监听到登录/刷新事件，启动IM')
      // Token 刷新后，建议重置连接以使用新 Token
      IMService.getInstance().reset()
      setTimeout(() => {
          IMService.getInstance().connect()
      }, 500)
    }

    const handleClose = () => {
      console.log('[App] 监听到登出事件，关闭IM')
      IMService.getInstance().close()
    }

    // 2. 监听事件 (适配 UserPage 和 request.ts 中的广播)
    
    // 登录成功 (UserPage 触发)
    Taro.eventCenter.on('USER_INFO_UPDATED', handleConnect)
    
    // Token 自动刷新成功 (request.ts 触发)
    Taro.eventCenter.on('TOKEN_REFRESHED', handleConnect)
    
    // 强制登出 (request.ts 触发 401 刷新失败)
    Taro.eventCenter.on('FORCE_LOGOUT', handleClose)
    
    // 清理监听
    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', handleConnect)
      Taro.eventCenter.off('TOKEN_REFRESHED', handleConnect)
      Taro.eventCenter.off('FORCE_LOGOUT', handleClose)
    }
    
  }, [])

  // children 是将要会渲染的页面

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
          <Text className='global-loading-text'>加载中</Text>
        </View>
      )}
    </View>
  )
}

export default App
