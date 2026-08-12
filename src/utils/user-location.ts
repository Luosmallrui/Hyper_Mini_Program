import Taro from '@tarojs/taro'

export interface ChosenLocation {
  latitude: number
  longitude: number
  name: string
  address: string
}

export const CHOSEN_LOCATION_STORAGE_KEY = 'user_chosen_location'

const normalizeChosenLocation = (raw: any): ChosenLocation | null => {
  if (!raw || typeof raw !== 'object') return null
  const latitude = Number(raw.latitude)
  const longitude = Number(raw.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    latitude,
    longitude,
    name: typeof raw.name === 'string' ? raw.name : '',
    address: typeof raw.address === 'string' ? raw.address : '',
  }
}

/**
 * 读取用户最近一次通过 wx.chooseLocation 选择的位置。
 * 小程序端不再依赖 wx.getLocation，各页面统一以这份缓存作为定位兜底。
 */
export function getStoredChosenLocation(): ChosenLocation | null {
  try {
    return normalizeChosenLocation(Taro.getStorageSync(CHOSEN_LOCATION_STORAGE_KEY))
  } catch (error) {
    console.warn('read chosen location failed:', error)
    return null
  }
}

export function saveChosenLocation(location: ChosenLocation) {
  try {
    Taro.setStorageSync(CHOSEN_LOCATION_STORAGE_KEY, location)
  } catch (error) {
    console.warn('save chosen location failed:', error)
  }
}

/**
 * 核心定位入口：调起微信原生地图选点（wx.chooseLocation）。
 * 成功时写入缓存并返回选点结果；用户取消或调用失败时返回 null。
 */
export async function chooseUserLocation(): Promise<ChosenLocation | null> {
  try {
    const res = await Taro.chooseLocation({})
    const location = normalizeChosenLocation(res)
    if (!location) return null
    saveChosenLocation(location)
    return location
  } catch (error) {
    // 用户取消选点属于正常流程，按 null 处理
    console.warn('chooseUserLocation failed:', error)
    return null
  }
}
