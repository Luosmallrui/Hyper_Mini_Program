import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('client 0617 backend contract alignment', () => {
  it('uses comprehensive search and consumes activity results returned by backend search', () => {
    const source = readSource('src', 'pages', 'search', 'index.tsx')

    expect(source).toContain('const SEARCH_TYPE: SearchType = 0')
    expect(source).toContain('activities')
    expect(source).toContain('poster_list')
    expect(source).toContain("source: 'activity'")
    expect(source).toContain('/pages/activity/index?id=')
  })

  it('formats organizer decimal fee rate and queries verifier records with documented pagination', () => {
    const source = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    expect(source).toContain('formatFeeRate')
    expect(source).toContain('value * 100')
    expect(source).toContain('item?.service_fee_rate ?? item?.fee_rate')
    expect(source).toContain('/api/v1/verifier/verified-list?page=1&size=50')
  })

  it('queries points records with the documented cursor, limit, and action params', () => {
    const source = readSource('src', 'pages', 'user-sub', 'points', 'index.tsx')

    expect(source).toContain("url: '/api/v1/points/records'")
    expect(source).toContain('buildPointsRecordsQuery(activeTab, currentCursor, isRefresh)')
    expect(source).toContain('cursor: isRefresh ? 0 : (cursor ?? 0)')
    expect(source).toContain('limit: 20')
    expect(source).toContain('query.action = activeTab')
    expect(source).not.toContain('pageSize: 20')
    expect(source).not.toContain("type: activeTab === 'all'")
  })

  it('loads points records only through the active tab effect on initial mount', () => {
    const source = readSource('src', 'pages', 'user-sub', 'points', 'index.tsx')

    expect(source).toContain('loadPointsData()')
    expect(source.match(/loadPointsRecords\(true\)/g) || []).toHaveLength(1)
  })
})
