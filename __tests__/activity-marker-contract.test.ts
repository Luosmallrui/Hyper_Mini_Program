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
