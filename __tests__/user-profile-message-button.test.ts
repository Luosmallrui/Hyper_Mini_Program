import fs from 'fs'
import path from 'path'

const sourcePath = path.join(__dirname, '..', 'src', 'pages', 'user-sub', 'profile', 'index.tsx')

describe('user profile message entry', () => {
  const source = fs.readFileSync(sourcePath, 'utf8')

  it('binds the private message button to the chat navigation handler', () => {
    expect(source).toContain('const handleMessageClick')
    expect(source).toMatch(/className="message-btn"[\s\S]*onClick=\{handleMessageClick\}/)
  })

  it('opens the one-to-one chat page with the profile user id and nickname', () => {
    expect(source).toContain('/pages/chat/index?peer_id=${userId}')
    expect(source).toContain('title=${encodeURIComponent(userProfile?.nickname || \'\')}')
    expect(source).toContain('&type=1')
  })
})
