import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('home distance filter source wiring', () => {
  it('provides default distance options and sends distance with coordinates', () => {
    const source = read('src/pages/index/index.tsx')

    expect(source).toContain('DEFAULT_DISTANCE_OPTIONS')
    expect(source).toContain('selectedDistanceKm')
    expect(source).toContain('distance=')
    expect(source).toContain('lat=')
    expect(source).toContain('lng=')
    expect(source).toContain('matchesDistanceFilter')
  })
})
