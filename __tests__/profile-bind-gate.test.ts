import fs from 'fs'
import path from 'path'
import Taro from '@tarojs/taro'
import { hasBoundPhone } from '../src/utils/auth'

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
}

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('hasBoundPhone', () => {
  it('returns true when cached userInfo has a phone_number', () => {
    mockedTaro.getStorageSync.mockReturnValue({ phone_number: '13800000000' })
    expect(hasBoundPhone()).toBe(true)
  })

  it('returns false when phone_number is missing or empty', () => {
    mockedTaro.getStorageSync.mockReturnValue({ nickname: 'foo' })
    expect(hasBoundPhone()).toBe(false)

    mockedTaro.getStorageSync.mockReturnValue({ phone_number: '' })
    expect(hasBoundPhone()).toBe(false)
  })

  it('returns false when there is no cached userInfo', () => {
    mockedTaro.getStorageSync.mockReturnValue('')
    expect(hasBoundPhone()).toBe(false)
  })
})

describe('profile bind gate source contracts', () => {
  it('interactive pages mount ProfileBindModal via useProfileBindGate', () => {
    const hookPages = [
      ['src', 'pages', 'index', 'index.tsx'],
      ['src', 'pages', 'activity-list', 'index.tsx'],
      ['src', 'pages', 'activity', 'index.tsx'],
      ['src', 'pages', 'square', 'index.tsx'],
      ['src', 'pages', 'square-sub', 'post-detail', 'index.tsx'],
      ['src', 'pages', 'square-sub', 'post-create', 'index.tsx'],
      ['src', 'pages', 'venue', 'index.tsx'],
      ['src', 'pages', 'user-sub', 'organizer-home', 'index.tsx'],
      ['src', 'pages', 'user-sub', 'profile', 'index.tsx'],
    ]
    hookPages.forEach((segments) => {
      const source = readSource(...segments)
      expect(source).toContain('useProfileBindGate')
      expect(source).toContain('requireProfile')
      expect(source).toContain('ProfileBindModal')
    })
  })

  it('custom tab bar gates the publish entry with hasBoundPhone', () => {
    const source = readSource('src', 'custom-tab-bar', 'index.tsx')
    expect(source).toContain('hasBoundPhone')
    expect(source).toContain('ProfileBindModal')
  })

  it('post publish action is gated (no bypass via direct entry)', () => {
    const source = readSource('src', 'pages', 'square-sub', 'post-create', 'index.tsx')
    expect(source).toContain('if (!requireProfile()) return')
  })

  it('activity purchase is gated by requireProfile', () => {
    const source = readSource('src', 'pages', 'activity', 'index.tsx')
    expect(source).toContain('requireProfile')
  })
})
