import fs from 'fs'
import path from 'path'

const sourcePath = path.join(__dirname, '..', 'src', 'pages', 'user-sub', 'organizer', 'index.tsx')
const source = fs.readFileSync(sourcePath, 'utf8')

describe('organizer activity location map', () => {
  it('uses the native Taro Map component for venue setting', () => {
    expect(source).toMatch(/Map\s+as\s+TaroMap/)
    expect(source).toContain("<TaroMap")
    expect(source).toContain("id=\"organizer-location-map\"")
    expect(source).toContain("subkey={ORGANIZER_MAP_KEY}")
  })

  it('does not render the old handcrafted fake map', () => {
    expect(source).not.toContain('map-mock-card')
    expect(source).not.toContain('map-grid')
    expect(source).not.toContain('map-landmark')
  })
})
