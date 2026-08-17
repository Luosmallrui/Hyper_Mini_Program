import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

/**
 * direct_message_enabled（私信开关）契约：
 * 关闭时三处必须隐藏/过滤，且游客同样受约束（不能因缓存残留绕过）。
 */
describe('direct message switch contracts (guests included)', () => {
  it('message tab refreshes the switch before the guest early-return', () => {
    const message = readSource('src', 'pages', 'message', 'index.tsx')
    const refreshAt = message.indexOf('refreshDirectMessageEnabled()')
    const guestReturnAt = message.indexOf('if (!loggedIn)')
    expect(refreshAt).toBeGreaterThan(-1)
    expect(guestReturnAt).toBeGreaterThan(-1)
    // 刷新必须先于游客 return，否则游客永远用旧缓存
    expect(refreshAt).toBeLessThan(guestReturnAt)
  })

  it('create-group entry requires login and the switch', () => {
    const message = readSource('src', 'pages', 'message', 'index.tsx')
    expect(message).toContain('{isLogin && directMessageEnabled && (')
  })

  it('group-select page guards both login and the switch', () => {
    const select = readSource('src', 'pages', 'chat', 'group-select', 'index.tsx')
    expect(select).toContain('isLoggedIn')
    expect(select).toContain('requireLogin')
    expect(select).toContain('refreshDirectMessageEnabled')
    expect(select).toContain('群聊功能暂未开放')
  })

  it('chat page itself guards login and only allows customer-service when switch is off', () => {
    const chat = readSource('src', 'pages', 'chat', 'index.tsx')
    expect(chat).toContain('isLoggedIn')
    expect(chat).toContain('requireLogin')
    expect(chat).toContain('refreshDirectMessageEnabled')
    expect(chat).toContain('isCustomerServiceChat')
    expect(chat).toContain('私信功能暂未开放')
  })

  it('profile page refreshes the switch unconditionally on show', () => {
    const profile = readSource('src', 'pages', 'user-sub', 'profile', 'index.tsx')
    expect(profile).toContain('refreshDirectMessageEnabled().then(setDirectMessageEnabled)')
    expect(profile).toContain('directMessageEnabled && (')
  })

  it('session list falls back to customer-service only when switch is off', () => {
    const message = readSource('src', 'pages', 'message', 'index.tsx')
    expect(message).toContain('directMessageEnabled')
    expect(message).toContain('s.session_type === 1 && Number(s.peer_id) === customerServiceUserId')
  })

  it('group-create page guards both login and the switch', () => {
    const create = readSource('src', 'pages', 'chat', 'group-create', 'index.tsx')
    expect(create).toContain('isLoggedIn')
    expect(create).toContain('requireLogin')
    expect(create).toContain('refreshDirectMessageEnabled')
    expect(create).toContain('群聊功能暂未开放')
  })

  it('share-to-session entries are hidden when the switch is off (post detail)', () => {
    const postDetail = readSource('src', 'pages', 'square-sub', 'post-detail', 'index.tsx')
    expect(postDetail).toContain('refreshDirectMessageEnabled().then(setDirectMessageEnabled)')
    expect(postDetail).toContain('directMessageEnabled && (')
  })

  it('share-to-session entries are hidden when the switch is off (activity detail)', () => {
    const activity = readSource('src', 'pages', 'activity', 'index.tsx')
    expect(activity).toContain('refreshDirectMessageEnabled().then(setDirectMessageEnabled)')
    expect(activity).toContain('directMessageEnabled && (')
  })

  it('system-config cache defaults to hidden when nothing stored', () => {
    const config = readSource('src', 'utils', 'system-config.ts')
    expect(config).toContain("getStorageSync(STORAGE_KEY_DM) === true")
    expect(config).toContain("body?.data?.direct_message_enabled === true")
  })
})
