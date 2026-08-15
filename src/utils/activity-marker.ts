export interface ActivityMarkerLike {
  id?: string | number
  source?: string
  source_id?: string | number
  sourceId?: string | number
  /** 活动 id（仅 activity marker 使用）；venue marker 的路由 id 一律取 source_id（=主办方 id） */
  activity_id?: string | number
  detail_type?: string
  detailType?: string
  detail_url?: string
  detailUrl?: string
}

const toTrimmedString = (value: unknown) => (
  typeof value === 'undefined' || value === null ? '' : String(value).trim()
)

/** 归一化 marker 的 source（activity/venue/party/merchant...），小写 */
const normalizeMarkerSource = (marker: ActivityMarkerLike) =>
  toTrimmedString(marker?.source).toLowerCase()

/** 是否固定场地 marker：venue 的 source_id 是主办方 id，详情走 /venues/:id 与场地页 */
export const isVenueMarker = (marker: ActivityMarkerLike) => {
  const detailType = toTrimmedString(marker?.detail_type ?? marker?.detailType).toLowerCase()
  if (detailType) return detailType === 'venue'
  return normalizeMarkerSource(marker) === 'venue'
}

export const normalizeActivityMarkerSourceId = (marker: ActivityMarkerLike) => {
  // venue marker 的 source_id 是主办方 id（绝不能回退到 activity_id）；
  // activity marker 的 source_id 即活动 id，兼容旧数据回退 activity_id
  const rawId = isVenueMarker(marker)
    ? toTrimmedString(marker?.source_id ?? marker?.sourceId ?? marker?.id)
    : toTrimmedString(marker?.activity_id ?? marker?.source_id ?? marker?.sourceId ?? marker?.id)
  return rawId.replace(/^(activity|venue)-/, '')
}

/** 是否地图应展示的内容 marker：派对（activity）+ 场地（venue）。过滤掉 merchant / 旧 party 等兼容来源 */
export const isActivityMarker = (marker: ActivityMarkerLike) => {
  const detailType = toTrimmedString(marker?.detail_type ?? marker?.detailType).toLowerCase()
  if (detailType) return detailType === 'activity' || detailType === 'venue'

  const source = normalizeMarkerSource(marker)
  if (source) return source === 'activity' || source === 'venue'

  return true
}

export const getActivityMarkerDetailUrl = (marker: ActivityMarkerLike) => {
  // 按 source 路由详情接口：venue → /venues/:organizer_id，activity → /activity/:id
  const sourceId = normalizeActivityMarkerSourceId(marker)
  return isVenueMarker(marker)
    ? `/api/v1/venues/${encodeURIComponent(sourceId)}`
    : `/api/v1/activity/${encodeURIComponent(sourceId)}`
}

export const getActivityMarkerPageUrl = (marker: ActivityMarkerLike, extraParams = '') => {
  // 按 source 路由：venue → 商家主页（场地资料+活动），activity → 活动详情页
  const sourceId = normalizeActivityMarkerSourceId(marker)
  const suffix = extraParams ? (extraParams.startsWith('&') ? extraParams : `&${extraParams}`) : ''
  const base = isVenueMarker(marker) ? '/pages/user-sub/organizer-home/index?id=' : '/pages/activity/index?id='
  return `${base}${encodeURIComponent(sourceId)}${suffix}`
}
