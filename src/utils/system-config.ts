import Taro from '@tarojs/taro'
import { request } from './request'

const STORAGE_KEY = 'system_config_direct_message_enabled'
let memoryCache: boolean | null = null

// 同步读缓存：内存 → storage，都没有则默认 false（隐藏私信入口）
export const getDirectMessageEnabledSync = (): boolean => {
  if (memoryCache !== null) return memoryCache
  try {
    return Taro.getStorageSync(STORAGE_KEY) === true
  } catch (e) {
    return false
  }
}

// 拉取并缓存（App 启动预热 / 页面兜底刷新）
export const refreshDirectMessageEnabled = async (): Promise<boolean> => {
  try {
    const res = await request({ url: '/api/v1/system-config', method: 'GET' })
    const body: any = res?.data
    const enabled = body?.data?.direct_message_enabled === true
    memoryCache = enabled
    Taro.setStorageSync(STORAGE_KEY, enabled)
    return enabled
  } catch (e) {
    return getDirectMessageEnabledSync()
  }
}
