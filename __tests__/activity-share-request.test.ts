import {
  buildActivitySharePayload,
  getActivityShareErrorMessage,
} from '../src/pages/activity/share'

describe('activity share request', () => {
  it('builds an idempotent activity-card message payload', () => {
    const payload = buildActivitySharePayload({
      activityId: '12',
      title: '测试活动',
      session: { peer_id: 8, session_type: 1 },
      clientMsgId: 'share_123',
    })

    expect(payload).toEqual({
      target_id: '8',
      session_type: 1,
      msg_type: 9,
      content: '分享活动：测试活动',
      client_msg_id: 'share_123',
      ext: {
        card_type: 'activity_forward',
        activity_id: '12',
      },
    })
  })

  it('localizes a stopped message producer error', () => {
    expect(getActivityShareErrorMessage('producer is not running')).toBe(
      '消息服务暂不可用，请稍后重试',
    )
  })
})
