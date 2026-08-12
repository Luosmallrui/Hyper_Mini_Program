import Taro from '@tarojs/taro'

const isObject = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object'

export const normalizeUserInfoPayload = (payload: any): Record<string, any> => {
  if (!isObject(payload)) return {}

  const nestedUser = isObject(payload.user) ? payload.user : payload
  const nestedVerifier = isObject(nestedUser.verifier) ? nestedUser.verifier : {}
  const topVerifier = isObject(payload.verifier) ? payload.verifier : {}
  const verifier = { ...nestedVerifier, ...topVerifier }
  const verifierId = payload.verifier_id ?? nestedUser.verifier_id ?? verifier.id
  const isVerifier = payload.is_verifier ?? nestedUser.is_verifier ?? Boolean(verifierId)

  const userId = nestedUser.user_id ?? nestedUser.id ?? nestedUser.uid ?? ''

  return {
    ...nestedUser,
    user_id: String(userId),
    numeric_user_id: nestedUser.numeric_user_id ?? nestedUser.id ?? '',
    user_hash_id: nestedUser.user_hash_id ?? nestedUser.user_id ?? '',
    avatar_url: nestedUser.avatar_url || nestedUser.avatar || nestedUser.headimgurl || nestedUser.head_img || '',
    is_verifier: Boolean(isVerifier),
    ...(verifierId !== undefined && verifierId !== null && verifierId !== '' ? { verifier_id: verifierId } : {}),
    ...(Object.keys(verifier).length > 0 ? { verifier } : {}),
  }
}

export const cacheUserInfo = (payload: any): Record<string, any> => {
  const normalized = normalizeUserInfoPayload(payload)
  Taro.setStorageSync('userInfo', normalized)

  const verifierId = normalized.verifier_id ?? normalized.verifier?.id
  if (normalized.is_verifier && verifierId) {
    Taro.setStorageSync('verifier_id', String(verifierId))
    Taro.setStorageSync('verifierId', String(verifierId))
  } else if (normalized.is_verifier === false) {
    Taro.removeStorageSync('verifier_id')
    Taro.removeStorageSync('verifierId')
  }

  return normalized
}
