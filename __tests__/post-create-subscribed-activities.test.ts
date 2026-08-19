import fs from 'fs'
import path from 'path'
import { normalizeSubscribedActivities } from '../src/pages/square-sub/post-create/subscribed-activities'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')
const LEGACY_SUBSCRIBE_LIST_ENDPOINT = ['/api/v1', 'subscribe', 'list'].join('/')

describe('post create subscribed activity normalization', () => {
  it('keeps venues and activities with real ids and titles from legacy and nested subscribe list items', () => {
    expect(normalizeSubscribedActivities([
      { id: 1, title: 'POWER FLOW 嘻哈与电子音乐结合', type: '活动' },
      { id: 99, activity_id: 10, activity: { id: 10, name: 'jjjj', type: 'activity' } },
      { id: 100, activity: { id: 11, title: 'kkkkk' } },
      { id: 2, title: 'SWING鸡尾酒吧', type: '场地' },
    ])).toEqual([
      { id: 1, title: 'POWER FLOW 嘻哈与电子音乐结合', type: '活动' },
      { id: 10, title: 'jjjj', type: 'activity' },
      { id: 11, title: 'kkkkk', type: 'activity' },
      { id: 2, title: 'SWING鸡尾酒吧', type: '场地' },
    ])
  })

  it('normalizes the new activity subscriptions list items', () => {
    expect(normalizeSubscribedActivities([
      {
        id: 10,
        name: 'jjjj',
        poster_list: 'https://example.com/poster.png',
        start_time: '2026-06-13T16:51:00+08:00',
        end_time: '2026-06-19T16:51:00+08:00',
        status: 3,
        is_subscribe: true,
      },
    ])).toEqual([
      { id: 10, title: 'jjjj', type: 'activity' },
    ])
  })

  it('wires the publish page to normalized subscribed activities', () => {
    const source = readSource('src', 'pages', 'square-sub', 'post-create', 'index.tsx')

    expect(source).toContain('normalizeSubscribedActivities')
    expect(source).toContain('activity_id: selectedActivityId ?? null')
    expect(source).toContain("url: '/api/v1/activity/subscriptions?page=1&pageSize=20'")
    expect(source).toContain('Array.isArray(body?.data?.list) ? body.data.list : null')
    expect(source).not.toContain(`url: '${LEGACY_SUBSCRIBE_LIST_ENDPOINT}'`)
    expect(source).not.toContain("const activityTypeSet = new Set(['活动', '派对', 'activity', 'event'])")
  })

  it('refreshes subscribed activities whenever the publish page is shown', () => {
    const source = readSource('src', 'pages', 'square-sub', 'post-create', 'index.tsx')

    expect(source).toContain("import Taro, { useDidShow } from '@tarojs/taro'")
    expect(source).toContain('useDidShow(() => {')
    expect(source).toContain('void fetchSubscribedActivities()')
  })
})
