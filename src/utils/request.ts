import Taro from '@tarojs/taro'

const BASE_URL = 'https://www.hypercn.cn'

const KEY_ACCESS_TOKEN = 'access_token'
const KEY_REFRESH_TOKEN = 'refresh_token'
const KEY_USER_INFO = 'userInfo'

let isRefreshing = false
let requestQueue: Function[] = []

// 辅助：保存 Token
const saveTokens = (access: string, refresh?: string) => {
  if (access) Taro.setStorageSync(KEY_ACCESS_TOKEN, access)
  if (refresh) Taro.setStorageSync(KEY_REFRESH_TOKEN, refresh)
}

/**
 * 执行 Token 刷新逻辑
 */
const doRefreshToken = async (): Promise<string | null> => {
  const refreshToken = Taro.getStorageSync(KEY_REFRESH_TOKEN)
  if (!refreshToken) {
    console.error('[Request] 本地没有 refresh_token，无法刷新')
    return null
  }

  try {
    console.log('[Request] 正在尝试刷新 Token...')
    
    // 【修改 1】URL 增加 v1
    const url = `${BASE_URL}/api/v1/auth/refresh`
    
    // 【修改 2】根据要求，将 refresh_token 放入 Authorization 头
    const res = await Taro.request({
      url: url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        // 关键：Bearer + refresh_token
        'Authorization': `Bearer ${refreshToken}` 
      },
      data: {} // POST 请求通常带个空 body，视后端框架而定
    })

    console.log('[Request] 刷新接口返回:', res)

    let data = res.data
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch (e) {}
    }

    // 假设刷新接口返回结构: { code: 200, data: { access_token: "..." } }
    if (res.statusCode === 200 && data && data.code === 200) {
      const newAccess = data.data?.access_token || data.access_token
      const newRefresh = data.data?.refresh_token || data.refresh_token

      if (newAccess) {
        console.log('[Request] 刷新成功，新 Token:', newAccess.substring(0, 10) + '...')
        saveTokens(newAccess, newRefresh)
        
        // 广播事件：通知 WebSocket 和其他组件 Token 已更新
        Taro.eventCenter.trigger('TOKEN_REFRESHED', newAccess)
        
        return newAccess
      }
    }
    
    console.error('[Request] 刷新接口返回业务失败', data)
    return null
  } catch (e) {
    console.error('[Request] 刷新 Token 网络请求失败', e)
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

  // 检查 header 中的自动续期 (如果有 X-New-Access-Token)
  if (res.header) {
      const newAccess = res.header['X-New-Access-Token'] || res.header['x-new-access-token']
      if (newAccess) {
          console.log('[Request] Header 自动续期 Access Token')
          Taro.setStorageSync(KEY_ACCESS_TOKEN, newAccess)
          Taro.eventCenter.trigger('TOKEN_REFRESHED', newAccess)
      }
  }

  let data = res.data
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch (e) {}
  }

  // 拦截 401
  if (res.statusCode === 401 || (data && data.code === 401)) {
    console.log('[Request] 401 Detected, queueing request...')
    
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
      console.log('[Request] Retrying queued requests...')
      requestQueue.forEach(cb => cb(newToken))
      requestQueue = []
      return request({
        ...options,
        header: { ...header, 'Authorization': `Bearer ${newToken}` }
      })
    } else {
      console.warn('[Request] 刷新失败，执行强制登出')
      // 刷新彻底失败 (Refresh Token 也过期或无效)
      Taro.removeStorageSync(KEY_ACCESS_TOKEN)
      Taro.removeStorageSync(KEY_REFRESH_TOKEN)
      Taro.removeStorageSync(KEY_USER_INFO)
      Taro.eventCenter.trigger('FORCE_LOGOUT')
      
      return { ...res, data: { code: 401, msg: '登录已过期' } } 
    }
  }

  return { ...res, data }
}