import { View, Text, Image, Input, ScrollView, Switch } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

// 群资料与成员管理页，对接 docs/group_member_detail_api_20260812.md
// 入口：群聊页右上角菜单（group_id + group_name），建群成功后也会跳到这里

interface GroupInfo {
  id: number
  name: string
  avatar: string
  description: string
  owner_id: number
  member_count: number
  max_members: number
  is_mute_all: boolean
  created_at: string
  member_avatar_list: string[]
}

interface GroupPermissions {
  can_invite?: boolean
  can_manage_members?: boolean
  can_mute_members?: boolean
  can_mute_all?: boolean
  can_set_admin?: boolean
  can_transfer_owner?: boolean
  can_update_group_info?: boolean
  can_dismiss_group?: boolean
  can_quit?: boolean
}

interface CurrentUser {
  user_id: number
  role: number
  role_name: string
  is_owner: boolean
  is_admin: boolean
  is_muted: boolean
  can_send_message: boolean
  permissions: GroupPermissions
}

interface GroupMember {
  user_id: number
  avatar: string
  nickname: string
  display_name: string
  motto: string
  role: number
  role_name: string
  is_muted: boolean
  join_time: string
  is_current_user: boolean
  can_kick?: boolean
  can_mute?: boolean
  can_set_admin?: boolean
  can_transfer_owner?: boolean
}

interface InviteCandidate {
  user_id: number
  mobile_masked: string
  nickname: string
  avatar: string
  motto: string
  membership_status: 'not_member' | 'left' | 'active' | string
  can_invite: boolean
  invite_disabled_reason: string
}

const safeDecode = (value?: string) => {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (e) {
    return value
  }
}

const parseBody = (res: any) => {
  let body: any = res?.data
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch (e) {}
  }
  return body
}

export default function GroupMembersPage() {
  const router = useRouter()
  const groupId = Number(router.params.group_id || 0)
  const initialName = safeDecode(router.params.group_name || '')

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)

  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])

  const [invitePhone, setInvitePhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [candidate, setCandidate] = useState<InviteCandidate | null>(null)
  const [inviteHint, setInviteHint] = useState('')
  const [inviting, setInviting] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const permissions = currentUser?.permissions || {}
  const isOwner = Boolean(currentUser?.is_owner)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)
  }, [])

  useEffect(() => {
    if (groupId) {
      void fetchOverview()
    }
  }, [groupId])

  const exitToMessageTab = () => {
    Taro.switchTab({ url: '/pages/message/index' }).catch(() => {
      Taro.navigateBack().catch(() => {})
    })
  }

  const fetchOverview = async () => {
    try {
      const res = await request({
        url: '/api/v1/groupmember/list',
        method: 'GET',
        data: { group_id: groupId }
      })
      const body = parseBody(res)
      if (body?.code === 200 && body.data) {
        setGroup(body.data.group || null)
        setCurrentUser(body.data.current_user || null)
        setMembers(Array.isArray(body.data.members) ? body.data.members : [])
        return
      }
      // 403 已退群/非成员，404 群不存在或已解散：退出本页并回会话列表
      if (body?.code === 403 || body?.code === 404) {
        Taro.showToast({ title: body.msg || '群聊不可用', icon: 'none' })
        setTimeout(() => exitToMessageTab(), 800)
        return
      }
      Taro.showToast({ title: body?.msg || '加载失败', icon: 'none' })
    } catch (e) {
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const postAction = async (url: string, data: any, successText: string) => {
    const res = await request({ url, method: 'POST', data })
    const body = parseBody(res)
    if (body?.code === 200) {
      if (successText) Taro.showToast({ title: successText, icon: 'none' })
      await fetchOverview()
      return true
    }
    Taro.showToast({ title: body?.msg || '操作失败', icon: 'none' })
    return false
  }

  // ── 邀请成员（手机号精确查找 → 确认邀请）──

  const handlePhoneInput = (value: string) => {
    const mobile = value.replace(/\D/g, '').slice(0, 11)
    setInvitePhone(mobile)
    setCandidate(null)
    setInviteHint('')
    if (mobile.length === 11) {
      void searchCandidate(mobile)
    }
  }

  const searchCandidate = async (mobile: string) => {
    if (searching) return
    setSearching(true)
    try {
      const res = await request({
        url: '/api/v1/groupmember/invite-candidate',
        method: 'POST',
        data: { group_id: groupId, mobile }
      })
      const body = parseBody(res)
      if (body?.code === 200) {
        const c = body.data?.candidate
        if (body.data?.found && c) {
          setCandidate(c)
          if (!c.can_invite) {
            setInviteHint(c.invite_disabled_reason || (c.membership_status === 'active' ? '该用户已在群内' : '暂不可邀请'))
          }
        } else {
          setInviteHint('未找到该手机号对应的用户')
        }
      } else {
        setInviteHint(body?.msg || '查询失败')
      }
    } catch (e) {
      setInviteHint('查询失败，请重试')
    } finally {
      setSearching(false)
    }
  }

  const handleInvite = async () => {
    if (!candidate || !candidate.can_invite || inviting) return
    setInviting(true)
    try {
      const res = await request({
        url: '/api/v1/groupmember/invite',
        method: 'POST',
        data: { group_id: groupId, invited_user_ids: [candidate.user_id] }
      })
      const body = parseBody(res)
      if (body?.code === 200) {
        const ok = Number(body.data?.success_count || 0) > 0
        Taro.showToast({ title: ok ? '已邀请入群' : '邀请失败', icon: 'none' })
        if (ok) {
          setInvitePhone('')
          setCandidate(null)
          setInviteHint('')
          await fetchOverview()
        }
      } else {
        Taro.showToast({ title: body?.msg || '邀请失败', icon: 'none' })
      }
    } catch (e) {
      Taro.showToast({ title: '邀请失败，请重试', icon: 'none' })
    } finally {
      setInviting(false)
    }
  }

  // ── 成员操作：禁言 / 设管理员 / 转让群主 / 踢出 ──

  const handleMemberPress = (member: GroupMember) => {
    if (member.is_current_user || actionBusy) return
    const actions: { key: string; label: string }[] = []
    if (member.can_mute) actions.push({ key: 'mute', label: member.is_muted ? '解除禁言' : '禁言' })
    if (member.can_set_admin) actions.push({ key: 'admin', label: member.role === 2 ? '撤销管理员' : '设为管理员' })
    if (member.can_transfer_owner) actions.push({ key: 'transfer', label: '转让群主' })
    if (member.can_kick) actions.push({ key: 'kick', label: '踢出群聊' })
    if (!actions.length) return

    Taro.showActionSheet({
      itemList: actions.map(a => a.label),
      success: (res) => {
        const action = actions[res.tapIndex]
        if (action) void runMemberAction(member, action.key)
      }
    }).catch(() => {})
  }

  const runMemberAction = async (member: GroupMember, key: string) => {
    const name = member.display_name || member.nickname || '该成员'
    if (key === 'transfer') {
      const modal = await Taro.showModal({
        title: '转让群主',
        content: `确定将群主转让给「${name}」吗？你将自动成为普通成员。`,
        confirmColor: '#FF2E4D'
      })
      if (!modal.confirm) return
      setActionBusy(true)
      try {
        await postAction('/api/v1/groupmember/transfer-owner', { group_id: groupId, new_owner_id: member.user_id }, '已转让群主')
      } finally {
        setActionBusy(false)
      }
      return
    }
    if (key === 'kick') {
      const modal = await Taro.showModal({
        title: '踢出群聊',
        content: `确定将「${name}」移出群聊吗？`,
        confirmColor: '#FF2E4D'
      })
      if (!modal.confirm) return
    }
    setActionBusy(true)
    try {
      if (key === 'kick') {
        await postAction('/api/v1/groupmember/kick', { group_id: groupId, kicked_user_id: member.user_id }, '已移出群聊')
      } else if (key === 'mute') {
        const next = !member.is_muted
        await postAction('/api/v1/groupmember/mute', { group_id: groupId, target_user_id: member.user_id, mute: next }, next ? '已禁言' : '已解除禁言')
      } else if (key === 'admin') {
        const next = member.role !== 2
        await postAction('/api/v1/groupmember/admin', { group_id: groupId, target_user_id: member.user_id, admin: next }, next ? '已设为管理员' : '已撤销管理员')
      }
    } finally {
      setActionBusy(false)
    }
  }

  // ── 群管理：全员禁言 / 群资料 / 退出 / 解散 ──

  const handleToggleMuteAll = async (next: boolean) => {
    await postAction(
      '/api/v1/groupmember/mute-all',
      { group_id: groupId, mute: next },
      next ? '已开启全员禁言' : '已关闭全员禁言'
    )
  }

  const handleEditName = () => {
    // editable 为微信基础库能力，Taro 类型未收录，这里做类型放宽
    Taro.showModal({
      title: '修改群名称',
      editable: true,
      placeholderText: '1-20 个字符',
      content: group?.name || '',
      success: async (res: any) => {
        if (!res.confirm) return
        const name = String(res.content || '').trim()
        if (!name) {
          Taro.showToast({ title: '群名称不能为空', icon: 'none' })
          return
        }
        if (name.length > 20) {
          Taro.showToast({ title: '群名称最长 20 个字符', icon: 'none' })
          return
        }
        await postAction('/api/v1/group/update-name', { group_id: groupId, name }, '群名称已更新')
      }
    } as any)
  }

  const handleEditDescription = () => {
    Taro.showModal({
      title: '修改群简介',
      editable: true,
      placeholderText: '最长 100 个字符',
      content: group?.description || '',
      success: async (res: any) => {
        if (!res.confirm) return
        const description = String(res.content || '').trim()
        if (description.length > 100) {
          Taro.showToast({ title: '群简介最长 100 个字符', icon: 'none' })
          return
        }
        await postAction('/api/v1/group/update-description', { group_id: groupId, description }, '群简介已更新')
      }
    } as any)
  }

  const handleEditAvatar = async () => {
    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      })
      const filePath = res.tempFiles?.[0]?.tempFilePath
      if (!filePath) return

      Taro.showLoading({ title: '上传中...', mask: true })
      const token = Taro.getStorageSync('access_token')
      const uploadRes = await Taro.uploadFile({
        url: 'https://www.hypercn.cn/api/v1/note/upload',
        filePath,
        name: 'image',
        header: { Authorization: `Bearer ${token}` }
      })
      Taro.hideLoading()
      let data: any = uploadRes.data
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) {}
      }
      if (data?.code === 200 && data?.data?.url) {
        await postAction('/api/v1/group/update-avatar', { group_id: groupId, avatar: data.data.url }, '群头像已更新')
      } else {
        Taro.showToast({ title: '头像上传失败', icon: 'none' })
      }
    } catch (e) {
      Taro.hideLoading()
      // 用户取消选择等情况不提示
    }
  }

  const handleQuitOrDismiss = () => {
    const title = isOwner ? '解散群聊' : '退出群聊'
    const content = isOwner
      ? '解散后全体成员将被移出，且不可恢复。确定解散吗？'
      : '退出后将不再接收该群消息。确定退出吗？'
    Taro.showModal({
      title,
      content,
      confirmColor: '#FF2E4D',
      success: async (modal) => {
        if (!modal.confirm) return
        const url = isOwner ? '/api/v1/group/dismiss' : '/api/v1/groupmember/quit'
        try {
          const res = await request({ url, method: 'POST', data: { group_id: groupId } })
          const body = parseBody(res)
          if (body?.code === 200) {
            Taro.showToast({ title: isOwner ? '群已解散' : '已退出群聊', icon: 'none' })
            setTimeout(() => exitToMessageTab(), 600)
          } else {
            Taro.showToast({ title: body?.msg || '操作失败', icon: 'none' })
          }
        } catch (e) {
          Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
        }
      }
    })
  }

  const handleEnterChat = () => {
    const name = group?.name || initialName || '群聊'
    Taro.redirectTo({
      url: `/pages/chat/index?peer_id=${groupId}&title=${encodeURIComponent(name)}&type=2`
    })
  }

  // ── 渲染 ──

  const renderGroupAvatar = () => {
    if (group?.avatar) {
      return <Image src={group.avatar} className='group-avatar-img' mode='aspectFill' />
    }
    const list = (group?.member_avatar_list || []).filter(Boolean).slice(0, 9)
    if (!list.length) {
      return (
        <View className='group-avatar-placeholder'>
          <Text>{(group?.name || initialName || '群')[0]}</Text>
        </View>
      )
    }
    const cols = list.length === 1 ? 1 : list.length <= 4 ? 2 : 3
    return (
      <View className={`group-avatar-grid cols-${cols}`}>
        {list.map((url, index) => (
          <Image key={`${url}-${index}`} src={url} className='group-avatar-cell' mode='aspectFill' />
        ))}
      </View>
    )
  }

  const candidateStatusText = (c: InviteCandidate) => {
    if (c.membership_status === 'active') return '已在群内'
    if (c.membership_status === 'left') return '曾是群成员，邀请后恢复'
    return '邀请后直接入群'
  }

  return (
    <View className='group-members-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
        <View className='nav-left' onClick={() => Taro.navigateBack()}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        <View className='nav-title'>群聊信息</View>
      </View>

      <ScrollView
        scrollY
        className='members-scroll'
        style={{ height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`, marginTop: `${statusBarHeight + navBarHeight}px` }}
      >
        <View className='group-info-card'>
          <View className='group-header'>
            <View className='group-avatar' onClick={permissions.can_update_group_info ? handleEditAvatar : undefined}>
              {renderGroupAvatar()}
              {permissions.can_update_group_info && (
                <View className='group-avatar-edit'>
                  <AtIcon value='camera' size='12' color='#fff' />
                </View>
              )}
            </View>
            <View className='group-header-info'>
              <Text className='group-name'>{group?.name || initialName || '群聊'}</Text>
              <Text className='group-meta'>
                {group ? `${group.member_count}/${group.max_members} 人` : ''}
                {group?.created_at ? ` · ${group.created_at.slice(0, 10)} 创建` : ''}
              </Text>
              {group?.is_mute_all && <Text className='group-mute-flag'>全员禁言中</Text>}
            </View>
          </View>
          {!!group?.description && <Text className='group-desc'>{group.description}</Text>}
          <View className='group-actions'>
            <View className='enter-btn' onClick={handleEnterChat}>进入群聊</View>
          </View>
        </View>

        {permissions.can_invite && (
          <View className='invite-card'>
            <Text className='section-title'>邀请成员</Text>
            <Input
              className='input'
              type='number'
              placeholder='输入对方 11 位手机号'
              value={invitePhone}
              onInput={e => handlePhoneInput(e.detail.value)}
            />
            {searching && <Text className='hint'>查询中...</Text>}
            {!searching && !!inviteHint && <Text className='hint'>{inviteHint}</Text>}
            {candidate && (
              <View className='candidate-row'>
                <View className='candidate-avatar'>
                  {candidate.avatar ? (
                    <Image src={candidate.avatar} className='avatar-img' mode='aspectFill' />
                  ) : (
                    <View className='avatar-placeholder'>{(candidate.nickname || 'U')[0]}</View>
                  )}
                </View>
                <View className='candidate-info'>
                  <Text className='candidate-name'>{candidate.nickname || '未命名用户'}</Text>
                  <Text className='candidate-mobile'>{candidate.mobile_masked} · {candidateStatusText(candidate)}</Text>
                </View>
              </View>
            )}
            <View
              className={`invite-btn ${candidate?.can_invite && !inviting ? 'active' : ''}`}
              onClick={handleInvite}
            >
              {inviting ? '邀请中...' : '确认邀请'}
            </View>
          </View>
        )}

        <View className='member-section'>
          <View className='section-header'>
            <Text className='section-title'>群成员</Text>
            <Text className='section-count'>{group ? `${group.member_count} 人` : ''}</Text>
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
          {!loading && members.map(member => {
            const actionable = !member.is_current_user && (member.can_kick || member.can_mute || member.can_set_admin || member.can_transfer_owner)
            return (
              <View
                key={member.user_id}
                className='member-item'
                onClick={() => handleMemberPress(member)}
              >
                <View className='member-avatar'>
                  {member.avatar ? (
                    <Image src={member.avatar} className='avatar-img' mode='aspectFill' />
                  ) : (
                    <View className='avatar-placeholder'>{(member.display_name || member.nickname || 'U')[0]}</View>
                  )}
                </View>
                <View className='member-info'>
                  <View className='member-name-row'>
                    <Text className='member-name'>{member.display_name || member.nickname || `用户${member.user_id}`}</Text>
                    {member.role !== 3 && !!member.role_name && (
                      <Text className='role-tag'>{member.role_name}</Text>
                    )}
                    {member.is_muted && <Text className='role-tag muted-tag'>禁言中</Text>}
                    {member.is_current_user && <Text className='role-tag me-tag'>我</Text>}
                  </View>
                  {!!member.motto && <Text className='member-desc'>{member.motto}</Text>}
                </View>
                {actionable && <AtIcon value='chevron-right' size='16' color='#666' />}
              </View>
            )
          })}
        </View>

        {(permissions.can_update_group_info || permissions.can_mute_all) && (
          <View className='manage-card'>
            {permissions.can_update_group_info && (
              <>
                <View className='manage-item' onClick={handleEditName}>
                  <Text className='manage-label'>修改群名称</Text>
                  <AtIcon value='chevron-right' size='16' color='#666' />
                </View>
                <View className='manage-item' onClick={handleEditDescription}>
                  <Text className='manage-label'>修改群简介</Text>
                  <AtIcon value='chevron-right' size='16' color='#666' />
                </View>
              </>
            )}
            {permissions.can_mute_all && (
              <View className='manage-item'>
                <View className='manage-label-col'>
                  <Text className='manage-label'>全员禁言</Text>
                  <Text className='manage-hint'>开启后仅群主和管理员可发言</Text>
                </View>
                <Switch
                  checked={Boolean(group?.is_mute_all)}
                  color='#FF2E4D'
                  onChange={e => void handleToggleMuteAll(e.detail.value)}
                />
              </View>
            )}
          </View>
        )}

        {(permissions.can_quit || permissions.can_dismiss_group) && (
          <View className='danger-btn' onClick={handleQuitOrDismiss}>
            {isOwner ? '解散群聊' : '退出群聊'}
          </View>
        )}

        <View className='bottom-space' />
      </ScrollView>
    </View>
  )
}
