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
 * 读取用户最近一次定位/选点的位置缓存。
 * wx.getLocation 实时定位成功后也会写入这份缓存，各页面统一以它作为定位兜底。
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
 * 高精度实时定位（wx.getLocation，需在 app.config 声明 requiredPrivateInfos + 接口设置申请开通）。
 * 授权成功返回坐标并写入缓存；用户拒绝/接口未开通/调用失败时返回 null，调用方回退选点缓存。
 */
export async function getRealTimeLocation(): Promise<ChosenLocation | null> {
  try {
    const res = await Taro.getLocation({ type: 'gcj02', isHighAccuracy: true })
    const latitude = Number(res.latitude)
    const longitude = Number(res.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    const location: ChosenLocation = { latitude, longitude, name: '', address: '' }
    saveChosenLocation(location)
    return location
  } catch (error) {
    // 用户拒绝授权或未开通接口属正常流程，静默回退
    console.warn('getRealTimeLocation failed:', error)
    return null
  }
}

/**
 * 地图选点入口：调起微信原生地图选点（wx.chooseLocation）。
 * 用于场地地址选点等需要用户手动挑选位置的场景；首页定位按钮走 getRealTimeLocation。
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
