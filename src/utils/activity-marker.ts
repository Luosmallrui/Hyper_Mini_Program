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

export const normalizeActivityMarkerSourceId = (marker: ActivityMarkerLike) => {
  const rawId = toTrimmedString(marker?.source_id ?? marker?.sourceId ?? marker?.id)
  return rawId.replace(/^activity-/, '')
}

export const isActivityMarker = (marker: ActivityMarkerLike) => {
  const detailType = toTrimmedString(marker?.detail_type ?? marker?.detailType).toLowerCase()
  if (detailType) return detailType === 'activity'

  const source = toTrimmedString(marker?.source).toLowerCase()
  if (source) return source === 'activity'

  return true
}

export const getActivityMarkerDetailUrl = (marker: ActivityMarkerLike) => {
  const detailUrl = toTrimmedString(marker?.detail_url ?? marker?.detailUrl)
  if (detailUrl) return detailUrl

  const sourceId = normalizeActivityMarkerSourceId(marker)
  return `/api/v1/activity/${encodeURIComponent(sourceId)}`
}

export const getActivityMarkerPageUrl = (marker: ActivityMarkerLike, extraParams = '') => {
  const sourceId = normalizeActivityMarkerSourceId(marker)
  const suffix = extraParams ? (extraParams.startsWith('&') ? extraParams : `&${extraParams}`) : ''
  return `/pages/activity/index?id=${encodeURIComponent(sourceId)}${suffix}`
}
