import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('organizer admin entry identity flow', () => {
  it('enters via WeChat session + audit/staff check, no password form', () => {
    const page = readSource('src', 'pages', 'user-sub', 'organizer', 'index.tsx')

    // 入口校验链：主办方审核状态 → 子账号/核销员探针（profile 接口）
    expect(page).toContain('fetchOrganizerAuditStatus')
    expect(page).toContain('fetchOrganizerProfile()')
    // 非商家视图为引导页，不再提供账号密码登录
    expect(page).toContain('暂未关联商家账号')
    expect(page).toContain('我要入驻')
    expect(page).not.toContain('商家账号登录')
    expect(page).not.toContain('请输入登录密码')
    expect(page).not.toContain('loginOrganizerPassword')
    expect(page).not.toContain('handleOrganizerPasswordLogin')
  })
})
