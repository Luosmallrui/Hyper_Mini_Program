import Taro from '@tarojs/taro'

const BASE_URL = 'https://www.hypercn.cn'

const KEY_ACCESS_TOKEN = 'access_token'
const KEY_REFRESH_TOKEN = 'refresh_token'
const KEY_ACCESS_EXPIRE = 'access_expire'
const KEY_USER_INFO = 'userInfo'
const KEY_FORCE_AUTH_GATE = '__force_auth_gate__'
const AUTH_PAGE_ROUTE = 'pages/auth/index'
const AUTH_CODE_PAGE_ROUTE = 'pages/auth-code/index'
const AUTH_PAGE_URL = '/pages/auth/index'

let isRefreshing = false
let requestQueue: Array<(token: string) => void> = []
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let forceLogoutEmitted = false

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

const emitForceLogoutOnce = () => {
  if (forceLogoutEmitted) return
  forceLogoutEmitted = true
  Taro.eventCenter.trigger('FORCE_LOGOUT')
  const pages = Taro.getCurrentPages()
  const current: any = pages[pages.length - 1]
  if (current?.route !== AUTH_PAGE_ROUTE && current?.route !== AUTH_CODE_PAGE_ROUTE) {
    Taro.reLaunch({ url: AUTH_PAGE_URL })
  }
}

const clearAuthStorage = () => {
  Taro.setStorageSync(KEY_FORCE_AUTH_GATE, 1)
  Taro.removeStorageSync(KEY_ACCESS_TOKEN)
  Taro.removeStorageSync(KEY_REFRESH_TOKEN)
  Taro.removeStorageSync(KEY_ACCESS_EXPIRE)
  Taro.removeStorageSync(KEY_USER_INFO)
  clearRefreshTimer()
}

export const saveTokens = (access: string, refresh?: string, expire?: number) => {
  forceLogoutEmitted = false
  Taro.removeStorageSync(KEY_FORCE_AUTH_GATE)

  if (access) Taro.setStorageSync(KEY_ACCESS_TOKEN, access)
  if (refresh) Taro.setStorageSync(KEY_REFRESH_TOKEN, refresh)

  if (expire) {
    Taro.setStorageSync(KEY_ACCESS_EXPIRE, expire)
    scheduleAutoRefresh(expire)
  }
}

export const scheduleAutoRefresh = (expireTimestamp: number) => {
  clearRefreshTimer()

  const now = Math.floor(Date.now() / 1000)
  const remainingSeconds = expireTimestamp - now

  if (remainingSeconds <= 0) {
    void doRefreshToken()
    return
  }

  const delayMs = remainingSeconds * 0.8 * 1000

  refreshTimer = setTimeout(() => {
    void doRefreshToken()
  }, delayMs)
}

const doRefreshToken = async (): Promise<string | null> => {
  if (isRefreshing) return null

  const refreshToken = Taro.getStorageSync(KEY_REFRESH_TOKEN)
  if (!refreshToken) {
    return null
  }

  isRefreshing = true

  try {
    const res = await Taro.request({
      url: `${BASE_URL}/api/v1/auth/refresh`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
      data: {},
    })

    let data: any = res.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (error) {
        data = null
      }
    }

    if (res.statusCode === 200 && data?.code === 200) {
      const newAccess = data?.data?.access_token
      const newRefresh = data?.data?.refresh_token
      const newExpire = data?.data?.access_expire

      if (newAccess) {
        saveTokens(newAccess, newRefresh, newExpire)
        Taro.eventCenter.trigger('TOKEN_REFRESHED', newAccess)
        return newAccess
      }
    }

    return null
  } catch (error) {
    return null
  } finally {
    isRefreshing = false
  }
}

export const request = async (options: Taro.request.Option) => {
  const accessToken = Taro.getStorageSync(KEY_ACCESS_TOKEN)

  const header = {
    ...options.header,
    Authorization: accessToken ? `Bearer ${accessToken}` : '',
  }

  const res = await Taro.request({
    ...options,
    url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
    header,
  })

  if (res.header) {
    const newAccess = res.header['X-New-Access-Token'] || res.header['x-new-access-token']
    if (newAccess) {
      forceLogoutEmitted = false
      Taro.setStorageSync(KEY_ACCESS_TOKEN, newAccess)
      Taro.eventCenter.trigger('TOKEN_REFRESHED', newAccess)
    }
  }

  let data: any = res.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (error) {
      data = res.data
    }
  }

  if (res.statusCode === 401 || data?.code === 401) {
    if (isRefreshing) {
      return new Promise((resolve) => {
        requestQueue.push((newToken: string) => {
          request({
            ...options,
            header: { ...header, Authorization: `Bearer ${newToken}` },
          }).then(resolve)
        })
      })
    }

    const newToken = await doRefreshToken()

    if (newToken) {
      requestQueue.forEach((cb) => cb(newToken))
      requestQueue = []
      return request({
        ...options,
        header: { ...header, Authorization: `Bearer ${newToken}` },
      })
    }

    requestQueue = []
    clearAuthStorage()
    emitForceLogoutOnce()

    return { ...res, data: { code: 401, msg: '登录已过期' } }
  }

  return { ...res, data }
}
