import fs from 'fs'
import path from 'path'
import {
  getActivityMarkerDetailUrl,
  getActivityMarkerPageUrl,
  isActivityMarker,
  normalizeActivityMarkerSourceId,
} from '../src/utils/activity-marker'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('activity marker backend contract', () => {
  it('normalizes new activity marker ids and detail urls', () => {
    expect(isActivityMarker({ source: 'activity', detail_type: 'activity' })).toBe(true)
    expect(isActivityMarker({ source: 'party' })).toBe(false)
    expect(normalizeActivityMarkerSourceId({ source_id: 123 })).toBe('123')
    expect(normalizeActivityMarkerSourceId({ id: 'activity-456' })).toBe('456')
    expect(getActivityMarkerDetailUrl({ source_id: 123, detail_url: '/api/v1/activity/123' })).toBe('/api/v1/activity/123')
    expect(getActivityMarkerDetailUrl({ source_id: 123 })).toBe('/api/v1/activity/123')
    expect(getActivityMarkerPageUrl({ source_id: 123 })).toBe('/pages/activity/index?id=123')
  })

  it('routes venue markers by source_id to the venue page, never to the activity page', () => {
    // venue marker 的 source_id 是主办方 id；即使带了 activity_id 也不能用（docs/organizer_venue_activity_model_api_20260815.md §5）
    const venueMarker = { id: 'venue-9', source: 'venue', source_id: 9, activity_id: 456 }
    expect(normalizeActivityMarkerSourceId(venueMarker)).toBe('9')
    expect(normalizeActivityMarkerSourceId({ source: 'venue', id: 'venue-12' })).toBe('12')
    expect(normalizeActivityMarkerSourceId({ detail_type: 'venue', source_id: 7 })).toBe('7')
    expect(getActivityMarkerPageUrl(venueMarker)).toBe('/pages/venue/index?id=9')
    expect(getActivityMarkerPageUrl({ source: 'venue', source_id: 9 }, '&lat=30.1')).toBe('/pages/venue/index?id=9&lat=30.1')
    expect(getActivityMarkerDetailUrl(venueMarker)).toBe('/api/v1/venues/9')
    // activity marker 不受 venue 路由影响
    expect(getActivityMarkerPageUrl({ source: 'activity', source_id: 456 })).toBe('/pages/activity/index?id=456')
  })

  it('keeps home map and list marker flows activity-only', () => {
    const home = readSource('src', 'pages', 'index', 'index.tsx')
    const list = readSource('src', 'pages', 'activity-list', 'index.tsx')

    expect(home).toContain('isActivityMarker(item)')
    expect(home).toContain('getActivityMarkerPageUrl(item)')
    expect(list).toContain('isActivityMarker(item)')
    expect(list).toContain('getActivityMarkerPageUrl(item, extParams)')
    expect(home).not.toContain('/pages/venue/index?id=')
    expect(list).not.toContain('/pages/venue/index?id=')
    expect(home).not.toContain('/api/v1/merchant/subscribe')
    expect(list).not.toContain('/api/v1/merchant/subscribe')
  })
})
