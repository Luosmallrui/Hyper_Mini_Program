import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'index', 'index.tsx'), 'utf8')

describe('home filter query contract', () => {
  it('does not send backend-breaking area params to map markers', () => {
    expect(source).not.toContain('business_area=')
    expect(source).not.toContain('query.push(`area=')
    expect(source).not.toContain('query.push(`area_id=')
    expect(source).toContain('matchesFilterText')
    expect(source).toContain('filters.areaName')
  })
})
