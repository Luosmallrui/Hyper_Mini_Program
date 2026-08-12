import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('client 0617 frontend requirements', () => {
  it('hides product subpackage route from the client app config', () => {
    const source = readSource('src', 'app.config.ts')

    expect(source).toContain("root: 'pages/venue'")
    expect(source).not.toContain("'product/index'")
  })

  it('locks settlement apply region to Chengdu and only allows picking a district', () => {
    const source = readSource('src', 'pages', 'user', 'index.tsx')

    expect(source).not.toContain("mode=\"region\"")
    expect(source).toContain("mode=\"selector\"")
    expect(source).toContain('handleChooseSettlementDistrict')
    expect(source).toContain('四川省 / 成都市')
    expect(source).toContain('请选择区县')
    expect(source).not.toContain('placeholder="请输入省份"')
    expect(source).not.toContain('placeholder="请输入城市"')
    expect(source).not.toContain('placeholder="请输入区县"')
  })

  it('keeps after-sales statuses inside the existing order page', () => {
    const source = readSource('src', 'pages', 'order', 'status.ts')

    expect(source).toContain('待审核')
    expect(source).toContain('退款中')
    expect(source).toContain('已退款')
    expect(source).toContain('已驳回')
    expect(source).toContain('已取消')
    expect(source).toContain('buildOrderListQuery')
    expect(source).toContain('refund_status')
  })

  it('shows organizer level rules and removes lottery from visible organizer tabs', () => {
    const account = readSource('src', 'pages', 'user-sub', 'organizer', 'account', 'index.tsx')
    const constants = readSource('src', 'pages', 'user-sub', 'organizer', 'constants.ts')

    expect(account).toContain('主办方等级')
    expect(account).toContain('默认等级为 LV1')
    expect(account).toContain('升级条件')
    expect(constants).not.toContain("label: '活动抽奖'")
  })
})
