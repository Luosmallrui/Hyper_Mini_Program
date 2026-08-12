import fs from 'fs'
import path from 'path'

const appConfigPath = path.join(__dirname, '..', 'src', 'app.config.ts')
const indexPagePath = path.join(__dirname, '..', 'src', 'pages', 'index', 'index.tsx')

describe('app index page wiring', () => {
  const appConfig = fs.readFileSync(appConfigPath, 'utf8')
  const indexSource = fs.readFileSync(indexPagePath, 'utf8')

  test('keeps the home tab and map marker API wired without booting the H5 router', () => {
    expect(appConfig).toContain('pages/index/index')
    expect(indexSource).toContain('/api/v1/map/markers')
    expect(indexSource).toContain('TaroMap')
  })
})
