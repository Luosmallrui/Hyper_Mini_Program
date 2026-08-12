import Taro from '@tarojs/taro'

const VISITOR_ID_KEY = 'hyper_visitor_id'

const createVisitorId = () => {
  // 简单 UUID v4（小程序环境无 crypto.randomUUID 依赖）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 游客 UV 去重标识（docs/activity_traffic_withdraw_status_api_20260810.md 第 2 节）：
 * 本地长期保存一个随机 UUID，请求活动详情时放入 X-Visitor-Id 头。
 * 注意不要在每次请求时重新生成，否则会虚增 UV。
 */
export const getVisitorId = (): string => {
  let id = String(Taro.getStorageSync(VISITOR_ID_KEY) || '')
  if (!id) {
    id = createVisitorId()
    Taro.setStorageSync(VISITOR_ID_KEY, id)
  }
  return id
}
