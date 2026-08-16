import { useCallback, useState } from 'react'
import { hasBoundPhone, isLoggedIn, requireLogin } from '@/utils/auth'

/**
 * 互动操作门禁：
 * - 未登录：走 requireLogin 跳登录页，返回 false；
 * - 已登录但未绑定手机号：弹出绑定引导弹窗，返回 false；
 * - 已登录且已绑定：返回 true，继续原操作。
 *
 * 用法：
 *   const { requireProfile, bindVisible, closeBindModal } = useProfileBindGate()
 *   if (!requireProfile()) return
 *   ...JSX 根部渲染 <ProfileBindModal visible={bindVisible} onClose={closeBindModal} />
 */
export const useProfileBindGate = () => {
  const [bindVisible, setBindVisible] = useState(false)

  const requireProfile = useCallback((): boolean => {
    if (!isLoggedIn()) return requireLogin()
    if (!hasBoundPhone()) {
      setBindVisible(true)
      return false
    }
    return true
  }, [])

  const closeBindModal = useCallback(() => setBindVisible(false), [])

  return { requireProfile, bindVisible, closeBindModal }
}
