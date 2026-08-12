import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('activity share layout', () => {
  it('keeps the confirmation action visible while the session list scrolls', () => {
    const styles = read('src/pages/activity/index.scss')

    expect(styles).toContain('height: 70vh;')
    expect(styles).toContain('min-height: 0;')
    expect(styles).toContain('flex-shrink: 0;')
  })

  it('requires explicit session selection before sending', () => {
    const source = read('src/pages/activity/index.tsx')

    expect(source).toContain('selectedShareSession')
    expect(source).toContain('handleConfirmShare')
    expect(source).toContain('请选择会话')
  })
})
