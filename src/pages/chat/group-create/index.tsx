import { View, Text, Input, Textarea, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { AtIcon } from 'taro-ui'
import { request } from '@/utils/request'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

export default function GroupCreatePage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)

  const [groupId, setGroupId] = useState<number>(0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)
    setGroupId(Date.now())
  }, [])

  const canSubmit = name.trim().length > 0 && !submitting

  const parseResponse = (res: any) => {
    let resBody: any = res?.data
    if (typeof resBody === 'string') {
      try { resBody = JSON.parse(resBody) } catch (e) {}
    }
    return resBody
  }

  const createGroup = async (payload: { name: string; avatar: string; description: string; group_id: number }) => {
    const res = await request({ url: '/api/v1/group/create', method: 'POST', data: payload })
    return parseResponse(res)
  }

  const handleChooseAvatar = async () => {
    if (avatarUploading) return
    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      })
      const filePath = res.tempFiles?.[0]?.tempFilePath
      if (!filePath) return

      setAvatarUploading(true)
      const token = Taro.getStorageSync('access_token')
      const uploadRes = await Taro.uploadFile({
        url: 'https://www.hypercn.cn/api/v1/note/upload',
        filePath,
        name: 'image',
        header: { 'Authorization': `Bearer ${token}` }
      })
      let data: any = uploadRes.data
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) {}
      }
      if (data?.code === 200 && data?.data?.url) {
        setAvatar(data.data.url)
      } else {
        Taro.showToast({ title: '头像上传失败', icon: 'none' })
      }
    } catch (e) {
      // ignore cancel
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleCreate = async () => {
    Taro.showToast({ title: '创建群聊暂未开放', icon: 'none' })
    return
    const groupName = name.trim()
    if (!groupName) {
      Taro.showToast({ title: '请输入群名称', icon: 'none' })
      return
    }

    if (submitting) return
    setSubmitting(true)

    try {
      const resBody = await createGroup({
        name: groupName,
        avatar: avatar.trim(),
        description: description.trim(),
        group_id: groupId || Date.now()
      })

      if (resBody && resBody.code === 200) {
        const groupData = resBody.data || {}
        const createdGroupId = groupData.id
        Taro.showToast({ title: '创建成功', icon: 'success' })

        if (createdGroupId) {
          Taro.redirectTo({
            url: `/pages/chat/group-members/index?group_id=${createdGroupId}&group_name=${encodeURIComponent(groupName)}`
          })
        } else {
          Taro.navigateBack()
        }
      } else {
        Taro.showToast({ title: resBody?.msg || '创建失败', icon: 'none' })
      }
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '创建失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='group-create-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
        <View className='nav-left' onClick={() => Taro.navigateBack()}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        <View className='nav-title'>创建群聊</View>
      </View>

      <View className='form-body' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>
        <View className='field'>
          <Text className='label'>群头像</Text>
          <View className='avatar-row' onClick={handleChooseAvatar}>
            {avatar ? (
              <Image src={avatar} className='avatar-preview' mode='aspectFill' />
            ) : (
              <View className='avatar-placeholder'>选择头像</View>
            )}
            <Text className='avatar-action'>{avatarUploading ? '上传中...' : '上传头像'}</Text>
          </View>
        </View>
        <View className='field'>
          <Text className='label'>群名称</Text>
          <Input
            className='input'
            placeholder='请输入群名称'
            value={name}
            maxlength={100}
            onInput={e => setName(e.detail.value)}
          />
        </View>

        <View className='field'>
          <Text className='label'>群头像 URL（可选）</Text>
          <Input
            className='input'
            placeholder='https://...'
            value={avatar}
            onInput={e => setAvatar(e.detail.value)}
          />
        </View>

        <View className='field'>
          <Text className='label'>群简介（可选）</Text>
          <Textarea
            className='textarea'
            placeholder='简单介绍一下群聊'
            value={description}
            maxlength={500}
            onInput={e => setDescription(e.detail.value)}
          />
        </View>

        <Text className='hint'>创建后可在成员页邀请好友进群</Text>
      </View>

      <View className='bottom-bar'>
        <View className={`submit-btn ${canSubmit ? 'active' : ''}`} onClick={handleCreate}>
          <Text>{submitting ? '创建中...' : '创建并继续'}</Text>
        </View>
      </View>
    </View>
  )
}
