import Taro from '@tarojs/taro'

const AUTH_PAGE_URL = '/pages/auth/index'
const AUTH_REDIRECT_KEY = '__auth_redirect__'
const DEFAULT_REDIRECT = '/pages/index/index'
const AUTH_ROUTES = ['pages/auth/index', 'pages/auth-code/index']

export const isLoggedIn = () => Boolean(Taro.getStorageSync('access_token'))

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

/**
 * 登录引导统一入口（游客模式）：
 * - 已登录：返回 true，调用方继续原操作；
 * - 未登录：记录当前页面地址后跳转登录页（可返回放弃），返回 false。
 * 用法：`if (!requireLogin()) return`
 */
export function requireLogin(): boolean {
  if (isLoggedIn()) return true

  const pages = Taro.getCurrentPages()
  const current: any = pages[pages.length - 1]
  if (current?.route && !AUTH_ROUTES.includes(current.route)) {
    Taro.setStorageSync(AUTH_REDIRECT_KEY, buildCurrentPageUrl())
  }
  Taro.navigateTo({ url: AUTH_PAGE_URL })
  return false
}
