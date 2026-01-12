import Taro from '@tarojs/taro'

const BASE_URL = 'https://www.hypercn.cn'

const KEY_ACCESS_TOKEN = 'access_token'
const KEY_REFRESH_TOKEN = 'refresh_token'
const KEY_ACCESS_EXPIRE = 'access_expire' // 新增 Key
const KEY_USER_INFO = 'userInfo'

let isRefreshing = false
let requestQueue: Function[] = []
let refreshTimer: any = null

/**
 * 核心：保存 Token 并启动自动刷新监听
 * @param access Access Token
 * @param refresh Refresh Token
 * @param expire Access Token 过期时间戳 (秒)
 */
export const saveTokens = (access: string, refresh?: string, expire?: number) => {
  if (access) Taro.setStorageSync(KEY_ACCESS_TOKEN, access)
  if (refresh) Taro.setStorageSync(KEY_REFRESH_TOKEN, refresh)
  
  if (expire) {
    Taro.setStorageSync(KEY_ACCESS_EXPIRE, expire)
    // 启动定时器
    scheduleAutoRefresh(expire)
  }
}

/**
 * 计算自动刷新时间
 * 策略：在剩余有效期的 80% 处执行刷新
 */
export const scheduleAutoRefresh = (expireTimestamp: number) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }

  const now = Math.floor(Date.now() / 1000) // 当前时间 (秒)
  const remainingSeconds = expireTimestamp - now

  if (remainingSeconds <= 0) {
    console.log('[Token] Token 已过期，立即尝试刷新')
    doRefreshToken()
    return
  }

  // 计算延迟时间：剩余时间的 80%
  // 例如：剩余 100s，延迟 80s 后刷新，保留 20s 缓冲
  const delayMs = remainingSeconds * 0.8 * 1000 

  console.log(`[Token] 有效期至: ${new Date(expireTimestamp * 1000).toLocaleString()}，将在 ${delayMs / 1000} 秒后自动刷新`)

  refreshTimer = setTimeout(() => {
    console.log('[Token] 触发自动刷新...')
    doRefreshToken()
  }, delayMs)
}

/**
 * 执行 Token 刷新逻辑
 */
const doRefreshToken = async (): Promise<string | null> => {
  if (isRefreshing) return null
  const refreshToken = Taro.getStorageSync(KEY_REFRESH_TOKEN)
  
  if (!refreshToken) {
    console.error('[Request] 无 refresh_token，无法刷新')
    return null
  }

  isRefreshing = true

  try {
    const res = await Taro.request({
      url: `${BASE_URL}/api/v1/auth/refresh`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}` 
      },
      data: {} 
    })

    let data = res.data
    if (typeof data === 'string') try { data = JSON.parse(data) } catch (e) {}

    // 假设刷新接口也返回了类似结构: { data: { access_token, access_expire, ... } }
    if (res.statusCode === 200 && data && data.code === 200) {
      const newData = data.data || {}
      const newAccess = newData.access_token
      const newRefresh = newData.refresh_token
      const newExpire = newData.access_expire // 获取新的过期时间

      if (newAccess) {
        console.log('[Request] 刷新成功')
        // 保存并重新计时
        saveTokens(newAccess, newRefresh, newExpire)
        
        Taro.eventCenter.trigger('TOKEN_REFRESHED', newAccess)
        isRefreshing = false
        return newAccess
      }
    }
    
    isRefreshing = false
    return null
  } catch (e) {
    console.error('[Request] 刷新失败', e)
    isRefreshing = false
    return null
  }
}

export const request = async (options: Taro.request.Option) => {
  const accessToken = Taro.getStorageSync(KEY_ACCESS_TOKEN)
  
  const header = {
    ...options.header,
    'Authorization': accessToken ? `Bearer ${accessToken}` : ''
  }

  const res = await Taro.request({
    ...options,
    url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
    header
  })

  // 检查 Header 自动续期 (保留原有逻辑作为双重保障)
  if (res.header) {
      const newAccess = res.header['X-New-Access-Token'] || res.header['x-new-access-token']
      // 注意：Header续期通常不带过期时间，这里我们暂时只存 token，不更新定时器
      // 或者你可以选择忽略 Header 续期，完全依赖上面的定时器
      if (newAccess) {
          console.log('[Request] Header 自动续期')
          Taro.setStorageSync(KEY_ACCESS_TOKEN, newAccess)
          Taro.eventCenter.trigger('TOKEN_REFRESHED', newAccess)
      }
  }

  let data = res.data
  if (typeof data === 'string') try { data = JSON.parse(data) } catch (e) {}

  // 401 拦截
  if (res.statusCode === 401 || (data && data.code === 401)) {
    if (isRefreshing) {
      return new Promise((resolve) => {
        requestQueue.push((newToken: string) => {
          request({
            ...options,
            header: { ...header, 'Authorization': `Bearer ${newToken}` }
          }).then(resolve)
        })
      })
    }

    isRefreshing = true
    const newToken = await doRefreshToken()
    isRefreshing = false

    if (newToken) {
      requestQueue.forEach(cb => cb(newToken))
      requestQueue = []
      return request({
        ...options,
        header: { ...header, 'Authorization': `Bearer ${newToken}` }
      })
    } else {
      // 彻底失效，清理所有
      Taro.removeStorageSync(KEY_ACCESS_TOKEN)
      Taro.removeStorageSync(KEY_REFRESH_TOKEN)
      Taro.removeStorageSync(KEY_ACCESS_EXPIRE) // 清理过期时间
      Taro.removeStorageSync(KEY_USER_INFO)
      if (refreshTimer) clearTimeout(refreshTimer)
      
      Taro.eventCenter.trigger('FORCE_LOGOUT')
      
      return { ...res, data: { code: 401, msg: '登录已过期' } } 
    }
  }

  return { ...res, data }
}