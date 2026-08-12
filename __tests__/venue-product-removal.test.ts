import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'venue', 'index.tsx'), 'utf8')

describe('venue product removal', () => {
  it('does not render product tabs, product cards, or product purchase navigation', () => {
    expect(source).not.toContain("activeTab === 'goods'")
    expect(source).not.toContain('product-grid')
    expect(source).not.toContain('buy-btn')
    expect(source).not.toContain('/pages/venue/product/index')
    expect(source).not.toContain('>商品<')
  })
})
