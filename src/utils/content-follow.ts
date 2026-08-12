/**
 * 内容关注（活动/场地/派对）接入工具。
 * 见 docs/content_follow_api_20260810.md：
 * - 关注/取关请求在保留 user_id 的基础上补充 target_type/target_id；
 * - 目标字段必须直接读接口返回的 follow_target_type / follow_target_id，不要自行推导；
 * - 后端未返回目标字段时保持原有用户关注行为（灰度兼容）。
 */

export interface ContentFollowTarget {
  type: string
  id: string | number
}

/** 从接口数据读取内容关注目标；未返回（后端未部署）时返回 null */
export const readContentFollowTarget = (item: any): ContentFollowTarget | null => {
  const type = String(item?.follow_target_type ?? item?.followTargetType ?? '').trim()
  const id = item?.follow_target_id ?? item?.followTargetId
  if (!type || id === undefined || id === null || id === '') return null
  return { type, id }
}

/** 组装关注/取关请求体：保留 user_id 兼容字段，有目标时补充 target_type/target_id */
export const buildFollowPayload = (userId: string | number, item: any) => {
  const target = readContentFollowTarget(item)
  return {
    user_id: String(userId),
    ...(target ? { target_type: target.type, target_id: target.id } : {}),
  }
}
