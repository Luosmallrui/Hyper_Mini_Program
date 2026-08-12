export interface ActivityShareSession {
  peer_id: number | string
  session_type: number | string
}

interface BuildActivitySharePayloadOptions {
  activityId: number | string
  title: string
  session: ActivityShareSession
  clientMsgId: string
  message?: string
}

export const buildActivitySharePayload = ({
  activityId,
  title,
  session,
  clientMsgId,
  message,
}: BuildActivitySharePayloadOptions) => ({
  target_id: String(session.peer_id),
  session_type: Number(session.session_type) === 2 ? 2 : 1,
  msg_type: 9,
  content: message || `分享活动：${title}`,
  client_msg_id: clientMsgId,
  ext: {
    card_type: 'activity_forward',
    activity_id: String(activityId),
  },
})

export const getActivityShareErrorMessage = (message?: string) => {
  if (/producer is not running/i.test(message || '')) {
    return '消息服务暂不可用，请稍后重试'
  }

  return message || '分享失败'
}
