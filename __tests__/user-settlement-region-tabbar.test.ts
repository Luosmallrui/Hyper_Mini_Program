import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'user', 'index.tsx'), 'utf8')
const style = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'user', 'index.scss'), 'utf8')

describe('settlement region picker tabbar handling', () => {
  it('keeps native tabbar hidden after region picker closes', () => {
    expect(source).toContain('hideNativeTabBar')
    expect(source).toContain('onCancel={handleCancelSettlementRegion}')
    expect(source).toContain('setTimeout(hideNativeTabBar, 0)')
    expect(source).not.toContain('Taro.showTabBar')
  })

  it('centers the settlement modal within the viewport', () => {
    expect(style).toContain('.settlement-modal-overlay')
    expect(style).toContain('align-items: center')
    expect(style).toContain('justify-content: center')
    expect(style).toContain('calc(48px + env(safe-area-inset-top))')
  })
})
