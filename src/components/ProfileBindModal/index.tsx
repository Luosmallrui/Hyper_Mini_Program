import { useEffect, useRef, useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { cacheUserInfo } from '@/utils/user-info'
import { request } from '@/utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

interface ProfileBindModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * 绑定手机号引导弹窗：
 * 已登录但未绑定手机号的用户进行互动操作时弹出，
 * 主按钮走 getPhoneNumber 一键绑定，头像/昵称为必填项。
 */
const ProfileBindModal: React.FC<ProfileBindModalProps> = ({ visible, onClose }) => {
  const [avatar, setAvatar] = useState('')
  const [nickname, setNickname] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const initialRef = useRef({ avatar: '', nickname: '' })

  useEffect(() => {
    if (!visible) return
    const cached = Taro.getStorageSync('userInfo') || {}
    const initialAvatar = cached.avatar_url || ''
    const initialNickname = cached.nickname || ''
    initialRef.current = { avatar: initialAvatar, nickname: initialNickname }
    setAvatar(initialAvatar)
    setNickname(initialNickname)
    setSignature(cached.signature || '')
  }, [visible])

  const onChooseAvatar = (e: any) => {
    if (e?.detail?.avatarUrl) {
      setAvatar(e.detail.avatarUrl)
    }
  }

  const uploadAvatarIfNeeded = async (): Promise<string> => {
    const isLocalFile =
      avatar.startsWith('wxfile://') ||
      avatar.startsWith('http://tmp/') ||
      avatar.startsWith('https://tmp/')
    if (!isLocalFile) return avatar

    const uploadRes = await Taro.uploadFile({
      url: `${BASE_URL}/api/v1/user/avatar`,
      filePath: avatar,
      name: 'image',
      header: { Authorization: `Bearer ${Taro.getStorageSync('access_token')}` },
    })

    let uploadData: any = {}
    try {
      uploadData = JSON.parse(uploadRes.data)
    } catch (error) {
      throw new Error('头像上传解析失败')
    }
    if (uploadData.code === 200) {
      return typeof uploadData.data === 'string' ? uploadData.data : uploadData.data?.url
    }
    throw new Error(uploadData.msg || '头像上传失败')
  }

  const refreshLatestUserInfo = async () => {
    try {
      const userRes = await request({ url: '/api/v1/user/info', method: 'GET' })
      const userBody: any = userRes?.data
      if (userBody?.code === 200 && userBody?.data) {
        const normalized = cacheUserInfo(userBody.data)
        Taro.eventCenter.trigger('USER_INFO_UPDATED', normalized)
      }
    } catch (error) {
      // 拉取失败不阻断绑定成功流程，下次进入页面会再刷新
    }
  }

  const onGetPhoneNumber = async (e: any) => {
    const code = e?.detail?.code
    if (!code) {
      Taro.showToast({ title: '需要授权手机号才能完成绑定', icon: 'none' })
      return
    }
    if (submitting) return

    // 头像和昵称为必填项，未完善时中断绑定流程
    if (!avatar) {
      Taro.showToast({ title: '请先设置头像', icon: 'none' })
      return
    }
    if (!nickname.trim()) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    setSubmitting(true)
    Taro.showLoading({ title: '绑定中...', mask: true })

    try {
      const bindRes = await request({
        url: '/api/v1/auth/bind-phone',
        method: 'POST',
        data: { phone_code: code },
      })
      const bindBody: any = bindRes?.data
      if (!bindBody || bindBody.code !== 200) {
        throw new Error(bindBody?.msg || '绑定失败')
      }

      // 头像/昵称有改动时才提交资料更新
      const avatarChanged = avatar !== initialRef.current.avatar
      const nicknameChanged = nickname !== initialRef.current.nickname
      if (avatarChanged || nicknameChanged) {
        const finalAvatar = avatarChanged ? await uploadAvatarIfNeeded() : initialRef.current.avatar
        const updateRes = await request({
          url: '/api/v1/user/info',
          method: 'POST',
          data: {
            nickname: nickname.trim() || initialRef.current.nickname,
            avatar: finalAvatar,
            signature,
          },
        })
        const updateBody: any = updateRes?.data
        if (!updateBody || updateBody.code !== 200) {
          throw new Error(updateBody?.msg || '资料保存失败')
        }
      }

      // 拉取最新资料，确保 phone_number 写入本地缓存
      await refreshLatestUserInfo()

      Taro.hideLoading()
      setSubmitting(false)
      Taro.showToast({ title: '绑定成功', icon: 'success' })
      onClose()
    } catch (error: any) {
      Taro.hideLoading()
      setSubmitting(false)
      Taro.showToast({ title: error?.message || '绑定失败', icon: 'none' })
    }
  }

  if (!visible) return null

  return (
    <View className='profile-bind-overlay' onClick={onClose}>
      <View
        className='profile-bind-content'
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <View className='profile-bind-close' onClick={onClose}>
          <AtIcon value='close' size='18' color='rgba(255,255,255,0.45)' />
        </View>
        <Text className='profile-bind-title'>绑定手机号</Text>
        <Text className='profile-bind-subtitle'>完成绑定后即可继续操作</Text>

        <Button className='profile-bind-avatar-btn' openType='chooseAvatar' onChooseAvatar={onChooseAvatar}>
          {avatar ? (
            <Image className='profile-bind-avatar' src={avatar} mode='aspectFill' />
          ) : (
            <View className='profile-bind-avatar-placeholder'>
              <AtIcon value='camera' size='22' color='rgba(255,255,255,0.4)' />
            </View>
          )}
          <View className='profile-bind-avatar-badge'>
            <AtIcon value='edit' size='10' color='#000' />
          </View>
        </Button>
        <Text className='profile-bind-avatar-hint'>点击设置头像</Text>

        <View className='profile-bind-field'>
          <Text className='profile-bind-label'>昵称</Text>
          <Input
            type='nickname'
            className='profile-bind-input'
            placeholder='请填写昵称'
            placeholderClass='profile-bind-placeholder'
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
          />
        </View>

        <Button className='profile-bind-submit' openType='getPhoneNumber' onGetPhoneNumber={onGetPhoneNumber}>
          手机号快捷绑定
        </Button>
        <Text className='profile-bind-skip' onClick={onClose}>
          暂不绑定
        </Text>
      </View>
    </View>
  )
}

export default ProfileBindModal
