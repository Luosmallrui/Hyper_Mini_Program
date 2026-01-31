import { View, Text, Image, Input, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import { request } from '@/utils/request'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

interface GroupMember {
  user_id: number
  avatar: string
  nickname: string
  role: number
  is_mute: number
  user_card: string
}

export default function GroupMembersPage() {
  const router = useRouter()
  const groupId = Number(router.params.group_id || 0)
  const groupNameParam = router.params.group_name || ''

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)

  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [kickingId, setKickingId] = useState<number | null>(null)
  const [myUserId, setMyUserId] = useState(0)
  const [myRole, setMyRole] = useState(0)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)

    try {
      const userInfo = Taro.getStorageSync('userInfo')
      if (userInfo && userInfo.user_id) {
        setMyUserId(Number(userInfo.user_id))
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (groupId) {
      fetchMembers()
    }
  }, [groupId])

  useDidShow(() => {
    if (groupId) {
      fetchMembers()
    }
  })

  useEffect(() => {
    const mine = members.find(item => item.user_id === myUserId)
    if (mine) {
      setMyRole(mine.role)
    }
  }, [members, myUserId])

  const safeGroupName = useMemo(() => {
    if (!groupNameParam) return '群聊'
    try {
      return decodeURIComponent(groupNameParam)
    } catch (e) {
      return groupNameParam
    }
  }, [groupNameParam])

  const fetchMembers = async () => {
    if (!groupId || loading) return
    setLoading(true)
    try {
      const res = await request({
        url: '/api/v1/groupmember/list',
        method: 'GET',
        data: { group_id: groupId }
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {}
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        const list = resBody.data.members || []
        setMembers(Array.isArray(list) ? list : [])
      } else {
        Taro.showToast({ title: resBody?.msg || '获取成员失败', icon: 'none' })
      }
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '获取成员失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const parseInviteIds = (value: string) => {
    const raw = value.split(/[\s,，]+/).map(item => item.trim()).filter(Boolean)
    const ids = raw.filter(item => /^\d+$/.test(item)).map(item => Number(item))
    return Array.from(new Set(ids))
  }

  const canInvite = parseInviteIds(inviteInput).length > 0 && !inviting

  const handleInvite = async () => {
    const ids = parseInviteIds(inviteInput)
    if (!ids.length) {
      Taro.showToast({ title: '请输入正确的用户ID', icon: 'none' })
      return
    }
    if (inviting) return
    setInviting(true)
    try {
      const res = await request({
        url: '/api/v1/groupmember/invite',
        method: 'POST',
        data: {
          group_id: groupId,
          user_ids: ids
        }
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {}
      }

      if (resBody && resBody.code === 200) {
        const successCount = resBody.data?.invited_members?.success_count ?? ids.length
        Taro.showToast({ title: `已邀请 ${successCount} 人`, icon: 'success' })
        setInviteInput('')
        fetchMembers()
      } else {
        Taro.showToast({ title: resBody?.msg || '邀请失败', icon: 'none' })
      }
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '邀请失败', icon: 'none' })
    } finally {
      setInviting(false)
    }
  }

  const canKick = (member: GroupMember) => {
    if (!myRole) return false
    if (member.user_id === myUserId) return false
    if (myRole === 1) return member.role !== 1
    if (myRole === 2) return member.role === 3
    return false
  }

  const handleKick = async (member: GroupMember) => {
    if (!canKick(member)) return

    const confirmRes = await Taro.showModal({
      title: '确认踢出',
      content: `确定将 ${member.nickname || '该成员'} 移出群聊？`,
      confirmText: '踢出',
      cancelText: '取消'
    })

    if (!confirmRes.confirm) return

    setKickingId(member.user_id)
    try {
      const res = await request({
        url: '/api/v1/groupmember/kick',
        method: 'POST',
        data: {
          group_id: groupId,
          kicked_user_id: member.user_id
        }
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {}
      }

      if (resBody && resBody.code === 200) {
        Taro.showToast({ title: '已踢出成员', icon: 'success' })
        fetchMembers()
      } else {
        Taro.showToast({ title: resBody?.msg || '操作失败', icon: 'none' })
      }
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '操作失败', icon: 'none' })
    } finally {
      setKickingId(null)
    }
  }

  const roleLabel = (role: number) => {
    if (role === 1) return '群主'
    if (role === 2) return '管理员'
    return '成员'
  }

  const handleOpenChat = () => {
    if (!groupId) return
    Taro.navigateTo({
      url: `/pages/chat/index?peer_id=${groupId}&title=${encodeURIComponent(safeGroupName)}&type=2`
    })
  }

  return (
    <View className='group-members-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
        <View className='nav-left' onClick={() => Taro.navigateBack()}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        <View className='nav-title'>群成员</View>
      </View>

      <ScrollView
        scrollY
        className='members-scroll'
        style={{
          height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`,
          marginTop: `${statusBarHeight + navBarHeight}px`
        }}
      >
        <View className='group-info-card'>
          <View className='group-name'>{safeGroupName}</View>
          <View className='group-meta'>群ID {groupId} · {members.length}人</View>
          <View className='group-actions'>
            <View className='enter-btn' onClick={handleOpenChat}>进入群聊</View>
          </View>
        </View>

        <View className='invite-card'>
          <Text className='section-title'>邀请成员</Text>
          <Input
            className='input'
            placeholder='输入用户ID，多个用逗号/空格分隔'
            value={inviteInput}
            onInput={e => setInviteInput(e.detail.value)}
          />
          <Text className='hint'>示例：9, 10, 11</Text>
          <View className={`invite-btn ${canInvite ? 'active' : ''}`} onClick={handleInvite}>
            <Text>{inviting ? '邀请中...' : '邀请进群'}</Text>
          </View>
        </View>

        <View className='member-section'>
          <View className='section-header'>
            <Text className='section-title'>成员列表</Text>
            <Text className='section-count'>{members.length}人</Text>
          </View>

          {loading && (
            <View className='loading-row'>
              <Text className='loading-text'>加载中...</Text>
            </View>
          )}

          {!loading && members.length === 0 && (
            <View className='empty-state'>
              <Text className='empty-text'>暂无成员</Text>
            </View>
          )}

          {members.map(member => (
            <View key={member.user_id} className='member-item'>
              <View className='member-avatar'>
                {member.avatar ? (
                  <Image src={member.avatar} className='avatar-img' mode='aspectFill' />
                ) : (
                  <View className='avatar-placeholder'>
                    <Text>{member.nickname ? member.nickname[0] : 'U'}</Text>
                  </View>
                )}
              </View>
              <View className='member-info'>
                <View className='member-name-row'>
                  <Text className='member-name'>{member.nickname || '未命名成员'}</Text>
                  <View className='role-tag'>
                    <Text>{roleLabel(member.role)}</Text>
                  </View>
                </View>
                {member.user_card && <Text className='member-desc'>{member.user_card}</Text>}
              </View>
              {canKick(member) && (
                <View
                  className={`kick-btn ${kickingId === member.user_id ? 'disabled' : ''}`}
                  onClick={() => handleKick(member)}
                >
                  <Text>{kickingId === member.user_id ? '处理中' : '踢出'}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View className='bottom-space' />
      </ScrollView>
    </View>
  )
}
