import Taro from '@tarojs/taro'
import { request } from './request'

const STORAGE_KEY_DM = 'system_config_direct_message_enabled'
const STORAGE_KEY_CS = 'system_config_customer_service_user_id'
let memoryCacheDm: boolean | null = null
let memoryCacheCs: number | null = null

// 同步读缓存：内存 → storage，都没有则默认 false（隐藏私信入口）
export const getDirectMessageEnabledSync = (): boolean => {
  if (memoryCacheDm !== null) return memoryCacheDm
  try {
    return Taro.getStorageSync(STORAGE_KEY_DM) === true
  } catch (e) {
    return false
  }
}

// 同步读客服账号 ID（消息列表过滤普通用户会话用）
export const getCustomerServiceUserIdSync = (): number => {
  if (memoryCacheCs !== null) return memoryCacheCs
  try {
    return Number(Taro.getStorageSync(STORAGE_KEY_CS)) || 0
  } catch (e) {
    return 0
  }
}

// 拉取并缓存（App 启动预热 / 页面兜底刷新）
export const refreshDirectMessageEnabled = async (): Promise<boolean> => {
  try {
    const res = await request({ url: '/api/v1/system-config', method: 'GET' })
    const body: any = res?.data
    const enabled = body?.data?.direct_message_enabled === true
    const csUserId = Number(body?.data?.customer_service_user_id) || 0
    memoryCacheDm = enabled
    memoryCacheCs = csUserId
    Taro.setStorageSync(STORAGE_KEY_DM, enabled)
    Taro.setStorageSync(STORAGE_KEY_CS, csUserId)
    return enabled
  } catch (e) {
    return getDirectMessageEnabledSync()
  }
}
