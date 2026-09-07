import fs from 'fs'
import path from 'path'
import Taro from '@tarojs/taro'
import {
  CHOSEN_LOCATION_STORAGE_KEY,
  chooseUserLocation,
  getStoredChosenLocation,
  saveChosenLocation,
} from '../src/utils/user-location'

jest.mock('@tarojs/taro', () => ({
  __esModule: true,
  default: {
    chooseLocation: jest.fn(),
    getStorageSync: jest.fn(),
    setStorageSync: jest.fn(),
  },
}))

const mockedTaro = Taro as unknown as {
  chooseLocation: jest.Mock
  getStorageSync: jest.Mock
  setStorageSync: jest.Mock
}

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('user-location shared helper', () => {
  it('returns null when no chosen location is cached', () => {
    mockedTaro.getStorageSync.mockReturnValue('')
    expect(getStoredChosenLocation()).toBeNull()

    mockedTaro.getStorageSync.mockReturnValue({ latitude: 'abc', longitude: 104 })
    expect(getStoredChosenLocation()).toBeNull()
  })

  it('normalizes cached chosen location values', () => {
    mockedTaro.getStorageSync.mockReturnValue({
      latitude: '30.5539',
      longitude: 104.0676,
      name: '东郊记忆',
    })
    expect(getStoredChosenLocation()).toEqual({
      latitude: 30.5539,
      longitude: 104.0676,
      name: '东郊记忆',
      address: '',
    })
  })

  it('chooseUserLocation persists the picked location and returns it', async () => {
    mockedTaro.chooseLocation.mockResolvedValue({
      latitude: 30.66,
      longitude: 104.06,
      name: '太古里',
      address: '锦江区中纱帽街8号',
    })

    const result = await chooseUserLocation()

    expect(result).toEqual({
      latitude: 30.66,
      longitude: 104.06,
      name: '太古里',
      address: '锦江区中纱帽街8号',
    })
    expect(mockedTaro.setStorageSync).toHaveBeenCalledWith(
      CHOSEN_LOCATION_STORAGE_KEY,
      result,
    )
  })

  it('chooseUserLocation resolves to null when the user cancels', async () => {
    mockedTaro.chooseLocation.mockRejectedValue({ errMsg: 'chooseLocation:fail cancel' })
    await expect(chooseUserLocation()).resolves.toBeNull()
    expect(mockedTaro.setStorageSync).not.toHaveBeenCalled()
  })

  it('saveChosenLocation writes through to storage', () => {
    const location = { latitude: 30.5, longitude: 104.1, name: '测试', address: '' }
    saveChosenLocation(location)
    expect(mockedTaro.setStorageSync).toHaveBeenCalledWith(CHOSEN_LOCATION_STORAGE_KEY, location)
  })
})

describe('getLocation via shared helper with chooseLocation fallback', () => {
  it('pages no longer call Taro.getLocation / wx.getLocation directly (shared helper only)', () => {
    const targets = [
      ['src', 'pages', 'index', 'index.tsx'],
      ['src', 'pages', 'activity-list', 'index.tsx'],
      ['src', 'pages', 'square-sub', 'post-create', 'index.tsx'],
    ]
    targets.forEach((segments) => {
      const source = readSource(...segments)
      expect(source).not.toContain('Taro.getLocation(')
      expect(source).not.toContain('wx.getLocation(')
    })
    // 唯一直接调用点在共享工具（高精度定位，失败回退选点缓存）
    const helper = readSource('src', 'utils', 'user-location.ts')
    expect(helper).toContain('getRealTimeLocation')
    expect(helper).toContain("Taro.getLocation({ type: 'gcj02', isHighAccuracy: true })")
  })

  it('home locate button uses getRealTimeLocation; other pages keep chooseLocation entry', () => {
    const home = readSource('src', 'pages', 'index', 'index.tsx')
    const list = readSource('src', 'pages', 'activity-list', 'index.tsx')
    const postCreate = readSource('src', 'pages', 'square-sub', 'post-create', 'index.tsx')
    // 首页定位按钮：wx.getLocation 实时定位（权限已开通，58669c4 的 chooseLocation 替代方案已回退）
    expect(home).toContain('getRealTimeLocation')
    expect(home).not.toContain('chooseUserLocation')
    // 列表距离排序/发帖页：实时定位优先，地图选点作为兜底或手动入口保留
    ;[list, postCreate].forEach((source) => {
      expect(source).toContain('getRealTimeLocation')
      expect(source).toContain('chooseUserLocation')
    })
    // 首页位置标记：实时定位优先，选点缓存兜底
    expect(home).toContain('getStoredChosenLocation')
  })

  it('qqmap sdk bundle no longer calls wx.getLocation', () => {
    const sdkMin = readSource('src', 'utils', 'qqmap-wx-jssdk.min.js')
    const sdk = readSource('src', 'utils', 'qqmap-wx-jssdk.js')
    expect(sdkMin).not.toContain('wx.getLocation(')
    expect(sdk).not.toContain('wx.getLocation(')
  })

  it('app config declares getLocation + chooseLocation and the location permission desc', () => {
    const config = readSource('src', 'app.config.ts')
    expect(config).toContain("requiredPrivateInfos: ['chooseLocation', 'getLocation']")
    expect(config).toContain('scope.userLocation')
  })
})
