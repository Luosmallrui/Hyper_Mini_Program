import fs from 'fs'
import path from 'path'
import Taro from '@tarojs/taro'
import { isLoggedIn, requireLogin } from '../src/utils/auth'

jest.mock('@tarojs/taro', () => ({
  __esModule: true,
  default: {
    getStorageSync: jest.fn(),
    setStorageSync: jest.fn(),
    navigateTo: jest.fn(),
    getCurrentPages: jest.fn(),
  },
}))

const mockedTaro = Taro as unknown as {
  getStorageSync: jest.Mock
  setStorageSync: jest.Mock
  navigateTo: jest.Mock
  getCurrentPages: jest.Mock
}

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('auth utils for guest mode', () => {
  it('isLoggedIn reflects the stored access token', () => {
    mockedTaro.getStorageSync.mockReturnValue('token-abc')
    expect(isLoggedIn()).toBe(true)

    mockedTaro.getStorageSync.mockReturnValue('')
    expect(isLoggedIn()).toBe(false)
  })

  it('requireLogin passes through when logged in', () => {
    mockedTaro.getStorageSync.mockReturnValue('token-abc')
    expect(requireLogin()).toBe(true)
    expect(mockedTaro.navigateTo).not.toHaveBeenCalled()
  })

  it('requireLogin stores current url and navigates to auth page for guests', () => {
    mockedTaro.getStorageSync.mockReturnValue('')
    mockedTaro.getCurrentPages.mockReturnValue([
      { route: 'pages/activity/index', options: { id: '12' } },
    ])

    expect(requireLogin()).toBe(false)
    expect(mockedTaro.setStorageSync).toHaveBeenCalledWith(
      '__auth_redirect__',
      '/pages/activity/index?id=12',
    )
    expect(mockedTaro.navigateTo).toHaveBeenCalledWith({ url: '/pages/auth/index' })
  })

  it('requireLogin does not overwrite redirect when already on auth pages', () => {
    mockedTaro.getStorageSync.mockReturnValue('')
    mockedTaro.getCurrentPages.mockReturnValue([{ route: 'pages/auth/index', options: {} }])

    expect(requireLogin()).toBe(false)
    expect(mockedTaro.setStorageSync).not.toHaveBeenCalled()
    expect(mockedTaro.navigateTo).toHaveBeenCalledWith({ url: '/pages/auth/index' })
  })
})

describe('guest mode source contracts', () => {
  it('app entry no longer force-redirects to the auth page', () => {
    const app = readSource('src', 'app.tsx')
    expect(app).not.toContain('ensureAuthRoute')
    expect(app).not.toContain('navigateToAuthPage')
    expect(app).not.toContain("setStorageSync('__force_auth_gate__'")
  })

  it('request layer does not kick guests out on 401', () => {
    const request = readSource('src', 'utils', 'request.ts')
    expect(request).not.toContain('reLaunch')
    expect(request).not.toContain('__force_auth_gate__')
    // 无 token 的 401 提前返回，交给页面自行引导
    expect(request).toContain("msg: '请先登录'")
  })

  it('interactive actions are gated by requireLogin or requireProfile', () => {
    const targets = [
      ['src', 'pages', 'index', 'index.tsx'],
      ['src', 'pages', 'activity-list', 'index.tsx'],
      ['src', 'pages', 'activity', 'index.tsx'],
      ['src', 'pages', 'square', 'index.tsx'],
      ['src', 'pages', 'square-sub', 'post-detail', 'index.tsx'],
      ['src', 'pages', 'message', 'index.tsx'],
      ['src', 'pages', 'user', 'index.tsx'],
      ['src', 'pages', 'venue', 'index.tsx'],
      ['src', 'pages', 'user-sub', 'profile', 'index.tsx'],
      ['src', 'custom-tab-bar', 'index.tsx'],
    ]
    targets.forEach((segments) => {
      // requireProfile 内部仍会走 requireLogin，游客行为不变
      expect(readSource(...segments)).toMatch(/requireLogin|requireProfile/)
    })
  })

  it('message tab renders a login guide instead of forcing auth for guests', () => {
    const message = readSource('src', 'pages', 'message', 'index.tsx')
    expect(message).toContain('登录后查看消息')
    expect(message).toContain('isLoggedIn')
  })

  it('user page no longer performs silent wx-login without agreement', () => {
    const user = readSource('src', 'pages', 'user', 'index.tsx')
    expect(user).not.toContain('/api/v1/auth/wx-login')
    expect(user).not.toContain('handleLogin')
  })
})
