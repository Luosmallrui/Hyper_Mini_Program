import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'index', 'index.tsx'), 'utf8')

describe('home area filter default selection', () => {
  it('does not default-select the first district after loading district tree', () => {
    expect(source).toContain('return hasPrev ? prev : null')
    expect(source).not.toContain('return hasPrev ? prev : normalized[0].id')
    expect(source).not.toContain('setSelectedDistrictId(districtTree[0].id)')
  })
})
