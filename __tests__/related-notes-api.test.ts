import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('venue and activity related notes', () => {
  it('loads venue related notes from the documented store_id API', () => {
    const source = read('src/pages/venue/index.tsx')

    expect(source).toContain("url: '/api/v1/note/related'")
    expect(source).toContain('store_id: venueId')
    expect(source).toContain('setRelatedNotes')
    expect(source).toContain('normalizeRelatedNotes')
  })

  it('loads activity related notes from the documented activity_id API', () => {
    const source = read('src/pages/activity/index.tsx')

    expect(source).toContain("url: '/api/v1/note/related'")
    expect(source).toContain('activity_id: activityId')
    expect(source).toContain('setRelatedNotes')
    expect(source).toContain('normalizeRelatedNotes')
    expect(source).not.toContain('派对预热中，更多阵容与活动细节持续更新。')
  })
})
