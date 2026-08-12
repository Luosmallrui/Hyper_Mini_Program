import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('organizer password login entry', () => {
  it('lets non-merchant users log in with an existing organizer account', () => {
    const page = readSource('src', 'pages', 'user-sub', 'organizer', 'index.tsx')
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')
    const style = readSource('src', 'pages', 'user-sub', 'organizer', 'index.scss')

    expect(page).toContain('loginOrganizerPassword')
    expect(page).toContain('organizerLoginPhone')
    expect(page).toContain('organizerLoginPassword')
    expect(page).toContain('handleOrganizerPasswordLogin')
    expect(page).toContain('商家账号登录')
    expect(page).toContain('登录管理后台')
    expect(page).toContain('请输入手机号')
    expect(page).toContain('请输入登录密码')
    expect(adapter).toContain("url: '/api/v1/auth/login-password'")
    expect(adapter).toContain('saveTokens(data.access_token, data.refresh_token, data.access_expire)')
    expect(style).toContain('.organizer-login-form')
    expect(style).toContain('.organizer-login-input')
  })
})
