// src/services/auth.ts
import Taro from '@tarojs/taro'

const API_BASE_URL = 'https://characterization-composed-gently-clinic.trycloudflare.com' // 替换为你的后端地址

export interface LoginResponse {
  token: string
  userInfo?: {
    nickname?: string
    avatar?: string
    openid?: string
  }
}

/**
 * 微信小程序登录
 */
export async function wxLogin(): Promise<LoginResponse> {
  try {
    // 1. 获取微信登录凭证 code
    const { code } = await Taro.login()

    if (!code) {
      throw new Error('获取微信登录凭证失败')
    }

    // 2. 将 code 发送到后端
    const res = await Taro.request({
      url: `${API_BASE_URL}/api/v1/auth/wx-login`,
      method: 'POST',
      data: {
        code
      }
    })

    if (res.statusCode !== 200 || !res.data.token) {
      throw new Error(res.data.message || '登录失败')
    }

    // 3. 保存 token
    Taro.setStorageSync('token', res.data.token)

    // 4. 保存用户信息(如果后端返回了)
    if (res.data.userInfo) {
      Taro.setStorageSync('userInfo', res.data.userInfo)
    }

    return res.data
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

/**
 * 获取用户信息并更新
 */
export async function updateUserInfo() {
  try {
    // 获取用户信息
    const userProfile = await Taro.getUserProfile({
      desc: '用于完善用户资料'
    })

    if (!userProfile.userInfo) {
      throw new Error('获取用户信息失败')
    }

    const token = Taro.getStorageSync('token')

    // 发送到后端更新
    const res = await Taro.request({
      url: `${API_BASE_URL}/api/user/update-info`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        nickname: userProfile.userInfo.nickName,
        avatar: userProfile.userInfo.avatarUrl,
        gender: userProfile.userInfo.gender
      }
    })

    if (res.statusCode === 200) {
      // 更新本地存储
      Taro.setStorageSync('userInfo', {
        nickname: userProfile.userInfo.nickName,
        avatar: userProfile.userInfo.avatarUrl
      })
    }

    return userProfile.userInfo
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw error
  }
}

export async function bindPhone(phoneCode: string) {
  const token = Taro.getStorageSync('token')

  if (!token) {
    throw new Error('未登录')
  }

  const res = await Taro.request({
    url: `${API_BASE_URL}/api/auth/bind-phone`,
    method: 'POST',
    header: {
      Authorization: `Bearer ${token}`
    },
    data: {
      phone_code: phoneCode // ⚠️ 只能是 getPhoneNumber 的 code
    }
  })

  if (res.statusCode !== 200 || res.data.code !== 0) {
    throw new Error(res.data.error || '绑定手机号失败')
  }

  return res.data.data.phone
}
/**
 * 检查登录状态
 */
export function checkLoginStatus(): boolean {
  const token = Taro.getStorageSync('token')
  return !!token
}

/**
 * 退出登录
 */
export function logout() {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('userInfo')
}

/**
 * 获取token
 */
export function getToken(): string {
  return Taro.getStorageSync('token') || ''
}
