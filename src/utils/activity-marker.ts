export interface ActivityMarkerLike {
  id?: string | number
  source?: string
  source_id?: string | number
  sourceId?: string | number
  /** 活动 id：跳活动页/编辑页用；场地时是活动 id，派对时与 source_id 相同 */
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

export const normalizeActivityMarkerSourceId = (marker: ActivityMarkerLike) => {
  // 跳活动页/编辑页优先用 activity_id（场地是活动 id，派对时与 source_id 相同）；兼容旧数据回退 source_id
  const rawId = toTrimmedString(marker?.activity_id ?? marker?.source_id ?? marker?.sourceId ?? marker?.id)
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
  // 统一走活动详情接口 /activity/:id（activity_id 优先，场地/派对一致）
  const sourceId = normalizeActivityMarkerSourceId(marker)
  return `/api/v1/activity/${encodeURIComponent(sourceId)}`
}

export const getActivityMarkerPageUrl = (marker: ActivityMarkerLike, extraParams = '') => {
  const sourceId = normalizeActivityMarkerSourceId(marker)
  const suffix = extraParams ? (extraParams.startsWith('&') ? extraParams : `&${extraParams}`) : ''
  return `/pages/activity/index?id=${encodeURIComponent(sourceId)}${suffix}`
}
