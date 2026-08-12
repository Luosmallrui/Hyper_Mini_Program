import fs from 'fs'
import path from 'path'
import { getActivitySubscriptionEndpoint } from '../src/pages/activity/subscription'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('activity subscription api contract', () => {
  it('builds the official activity subscribe and unsubscribe endpoints', () => {
    expect(getActivitySubscriptionEndpoint(10, true)).toBe('/api/v1/activity/10/subscribe')
    expect(getActivitySubscriptionEndpoint('10', false)).toBe('/api/v1/activity/10/unsubscribe')
  })

  it('uses the activity subscription endpoint from the activity detail page', () => {
    const source = readSource('src', 'pages', 'activity', 'index.tsx')

    expect(source).toContain('getActivitySubscriptionEndpoint')
    expect(source).not.toContain('/api/v1/merchant/subscribe')
    expect(source).not.toContain('/api/v1/merchant/unsubscribe')
    expect(source).not.toContain('party_id: String(activity.id)')
  })
})
