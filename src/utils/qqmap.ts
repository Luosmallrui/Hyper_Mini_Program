// =============================================================
// 腾讯地图接入完整方案（Taro 小程序）
// =============================================================

// ========================
// 第一步：前置配置（必做）
// ========================

// 1. 注册腾讯位置服务账号
//    https://lbs.qq.com/ → 注册/登录 → 控制台

// 2. 创建 Key
//    控制台 → key管理 → 创建新密钥
//    - 勾选 "WebServiceAPI"
//    - 勾选 "微信小程序"
//    - 填入你的小程序 AppID
//    - 保存后得到 key（如 "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"）

// 3. 微信公众平台配置域名
//    mp.weixin.qq.com → 设置 → 开发设置 → 服务器域名
//    在 request 合法域名中添加：https://apis.map.qq.com

// 4. 小程序 app.config.ts 添加定位权限
//    "requiredPrivateInfos": ["getLocation", "chooseLocation"],
//    "permission": {
//      "scope.userLocation": {
//        "desc": "你的位置信息将用于发布帖子时显示位置"
//      }
//    }

// 5. 下载 SDK
//    https://mapapi.qq.com/web/miniprogram/JSSDK/qqmap-wx-jssdk1.2.zip
//    解压后把 qqmap-wx-jssdk.min.js 放到项目 src/utils/ 目录下


// ========================
// 第二步：封装地图工具类
// ========================
// 文件：src/utils/qqmap.ts

import QQMapWX from './qqmap-wx-jssdk.min.js'

// ⚠️ 替换为你自己的 Key
const MAP_KEY = '7GEBZ-DLZKN-TRUFI-S7MTP-UISI6-4XBGI'

const qqmapsdk = new QQMapWX({
  key: MAP_KEY,
})

export interface POIItem {
  id: string
  name: string       // 地点名称，如 "南溪湿地公园"
  address: string    // 详细地址
  latitude: number
  longitude: number
  distance?: number  // 距离（米）
  category?: string  // 分类，如 "美食:小吃"
}

/**
 * 搜索附近 POI（无关键词 = 附近热门地点）
 */
export function searchNearby(
  latitude: number,
  longitude: number,
  keyword: string = '',
  pageSize: number = 20
): Promise<POIItem[]> {
  return new Promise((resolve, reject) => {
    qqmapsdk.search({
      keyword: keyword || '美食,商场,景点,公园,学校',
      location: { latitude, longitude },
      page_size: pageSize,
      page_index: 1,
      success: (res: any) => {
        const list: POIItem[] = (res.data || []).map((item: any) => ({
          id: item.id || `poi_${item._distance}_${Math.random()}`,
          name: item.title || '',
          address: item.address || '',
          latitude: item.location?.lat || latitude,
          longitude: item.location?.lng || longitude,
          distance: item._distance || 0,
          category: item.category || '',
        }))
        resolve(list)
      },
      fail: (err: any) => {
        console.error('searchNearby failed:', err)
        reject(err)
      },
    })
  })
}

/**
 * 逆地址解析：坐标 → 附近地点列表（更适合"附近地点推荐"场景）
 * 返回的 pois 就是附近地标，不需要关键词
 */
export function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ address: string; pois: POIItem[] }> {
  return new Promise((resolve, reject) => {
    qqmapsdk.reverseGeocoder({
      location: { latitude, longitude },
      get_poi: 1,        // 返回附近 POI
      poi_options: 'policy=2;page_size=20', // policy=2 综合排序
      success: (res: any) => {
        const result = res.result || {}
        const pois: POIItem[] = (result.pois || []).map((item: any) => ({
          id: item.id || `revgeo_${Math.random()}`,
          name: item.title || '',
          address: item.address || '',
          latitude: item.location?.lat || latitude,
          longitude: item.location?.lng || longitude,
          distance: item._distance || 0,
          category: item.category || '',
        }))
        resolve({
          address: result.address || '',
          pois,
        })
      },
      fail: (err: any) => {
        console.error('reverseGeocode failed:', err)
        reject(err)
      },
    })
  })
}

/**
 * 关键词搜索 POI（用于弹窗中的搜索功能）
 */
export function searchByKeyword(
  keyword: string,
  latitude: number,
  longitude: number,
  pageSize: number = 20
): Promise<POIItem[]> {
  return new Promise((resolve, reject) => {
    qqmapsdk.search({
      keyword,
      location: { latitude, longitude },
      page_size: pageSize,
      page_index: 1,
      success: (res: any) => {
        const list: POIItem[] = (res.data || []).map((item: any) => ({
          id: item.id || `search_${Math.random()}`,
          name: item.title || '',
          address: item.address || '',
          latitude: item.location?.lat || latitude,
          longitude: item.location?.lng || longitude,
          distance: item._distance || 0,
          category: item.category || '',
        }))
        resolve(list)
      },
      fail: (err: any) => {
        console.error('searchByKeyword failed:', err)
        reject(err)
      },
    })
  })
}

export default qqmapsdk
