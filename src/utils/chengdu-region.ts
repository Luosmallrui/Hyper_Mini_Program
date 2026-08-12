import { request } from '@/utils/request'

/** 运营城市固定为成都：主办方相关地区选择只允许 四川省 / 成都市 */
export const CHENGDU_PROVINCE = '四川省'
export const CHENGDU_CITY = '成都市'

/** 成都市区县兜底列表（优先使用后台 /api/v1/districts/tree 返回的运营区县） */
export const CHENGDU_DISTRICTS = [
  '锦江区',
  '青羊区',
  '金牛区',
  '武侯区',
  '成华区',
  '龙泉驿区',
  '青白江区',
  '新都区',
  '温江区',
  '双流区',
  '郫都区',
  '新津区',
  '都江堰市',
  '彭州市',
  '邛崃市',
  '崇州市',
  '简阳市',
  '金堂县',
  '大邑县',
  '蒲江县',
  '高新区',
  '天府新区',
]

/** 拉取后台区县树（当前运营城市即成都），失败时回退到内置列表 */
export const fetchChengduDistricts = async (): Promise<string[]> => {
  try {
    const res = await request({
      url: '/api/v1/districts/tree',
      method: 'GET',
    })
    const body: any = res?.data
    const list = Array.isArray(body?.data) ? body.data : []
    const names = list.map((item: any) => String(item?.name || '')).filter(Boolean)
    return names.length > 0 ? names : CHENGDU_DISTRICTS
  } catch {
    return CHENGDU_DISTRICTS
  }
}
