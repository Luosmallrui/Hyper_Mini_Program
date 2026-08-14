export interface ActivityMarkerLike {
  id?: string | number
  source?: string
  source_id?: string | number
  sourceId?: string | number
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
  const rawId = toTrimmedString(marker?.source_id ?? marker?.sourceId ?? marker?.id)
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
  const detailUrl = toTrimmedString(marker?.detail_url ?? marker?.detailUrl)
  if (detailUrl) return detailUrl

  const source = normalizeMarkerSource(marker)
  const sourceId = normalizeActivityMarkerSourceId(marker)
  return source === 'venue'
    ? `/api/v1/venues/${encodeURIComponent(sourceId)}`
    : `/api/v1/activity/${encodeURIComponent(sourceId)}`
}

export const getActivityMarkerPageUrl = (marker: ActivityMarkerLike, extraParams = '') => {
  const source = normalizeMarkerSource(marker)
  const sourceId = normalizeActivityMarkerSourceId(marker)
  const suffix = extraParams ? (extraParams.startsWith('&') ? extraParams : `&${extraParams}`) : ''
  const page = source === 'venue' ? '/pages/venue/index' : '/pages/activity/index'
  return `${page}?id=${encodeURIComponent(sourceId)}${suffix}`
}
