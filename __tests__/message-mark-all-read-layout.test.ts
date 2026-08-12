import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('message mark-all-read action', () => {
  it('keeps the action visible in the left side of the header', () => {
    const source = read('src/pages/message/index.tsx')
    const styles = read('src/pages/message/index.scss')

    expect(source).toContain("totalUnread > 0 ? '一键已读' : '已全部读'")
    expect(source).not.toContain('{totalUnread > 0 && (\n          <View className={`header-mark-all')
    expect(styles).toMatch(/\.header-mark-all\s*\{[^}]*left: 30px;/s)
    expect(styles).not.toMatch(/\.header-mark-all\s*\{[^}]*right: 30px;/s)
  })
})
