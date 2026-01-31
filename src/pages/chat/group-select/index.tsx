import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import { request } from '@/utils/request'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

interface FriendItem {
  user_id: number
  avatar: string
  nickname: string
  is_mutual: boolean
}

export default function GroupSelectPage() {
  const router = useRouter()
  const peerId = Number(router.params.peer_id || 0)
  const peerNameParam = router.params.peer_name || ''
  const peerAvatarParam = router.params.peer_avatar || ''

  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)

  const [friends, setFriends] = useState<FriendItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [creating, setCreating] = useState(false)
  const [myUserId, setMyUserId] = useState(0)
  const [groupAvatar, setGroupAvatar] = useState('')
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

    try {
      const userInfo = Taro.getStorageSync('userInfo')
      if (userInfo && userInfo.user_id) {
        setMyUserId(Number(userInfo.user_id))
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (peerId) {
      setSelectedIds([peerId])
    }
  }, [peerId])

  useEffect(() => {
    if (peerAvatarParam) {
      setGroupAvatar(String(peerAvatarParam))
    }
  }, [peerAvatarParam])

  useEffect(() => {
    fetchMutualFriends()
  }, [])

  const safePeerName = useMemo(() => {
    if (!peerNameParam) return ''
    try {
      return decodeURIComponent(peerNameParam)
    } catch (e) {
      return peerNameParam
    }
  }, [peerNameParam])

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

  const fetchMutualFriends = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await request({
        url: '/api/v1/follow/list',
        method: 'GET',
        data: {
          pageSize: 100,
          cursor: 0,
          type: 'following'
        }
      })

      let resBody: any = res.data
      if (typeof resBody === 'string') {
        try { resBody = JSON.parse(resBody) } catch (e) {}
      }

      if (resBody && resBody.code === 200) {
        const list = resBody.data?.following || []
        const mutuals = (Array.isArray(list) ? list : []).filter(item => item.is_mutual)
        const mapped: FriendItem[] = mutuals.map(item => ({
          user_id: Number(item.user_id),
          avatar: item.avatar || '',
          nickname: item.nickname || '',
          is_mutual: Boolean(item.is_mutual)
        }))

        const existsPeer = mapped.find(item => item.user_id === peerId)
        if (!existsPeer && peerId) {
          mapped.unshift({
            user_id: peerId,
            avatar: String(peerAvatarParam || ''),
            nickname: safePeerName || '当前聊天对象',
            is_mutual: true
          })
        } else if (existsPeer && peerAvatarParam && !existsPeer.avatar) {
          existsPeer.avatar = String(peerAvatarParam)
        }

        setFriends(mapped)
      } else {
        Taro.showToast({ title: resBody?.msg || '获取互关好友失败', icon: 'none' })
      }
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '获取互关好友失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
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
        setGroupAvatar(data.data.url)
      } else {
        Taro.showToast({ title: '头像上传失败', icon: 'none' })
      }
    } catch (e) {
      // ignore cancel
    } finally {
      setAvatarUploading(false)
    }
  }

  const toggleSelect = (id: number) => {
    if (id === peerId) return
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id)
      return [...prev, id]
    })
  }

  const selectedCount = selectedIds.length

  const buildGroupName = (count: number) => {
    if (safePeerName && count <= 1) {
      return `与${safePeerName}的群聊`
    }
    return `群聊(${count + 1})`
  }

  const handleCreateGroup = async () => {
    Taro.showToast({ title: '创建群聊暂未开放', icon: 'none' })
    return
    if (!selectedCount) {
      Taro.showToast({ title: '请选择好友', icon: 'none' })
      return
    }
    if (creating) return
    setCreating(true)

    try {
      const groupName = buildGroupName(selectedCount)
      const groupIdSeed = Date.now()
      const resBody = await createGroup({ name: groupName, avatar: groupAvatar || '', description: '', group_id: groupIdSeed })

      if (!resBody || resBody.code !== 200) {
        Taro.showToast({ title: resBody?.msg || '创建失败', icon: 'none' })
        return
      }

      const groupId = resBody.data?.id || groupIdSeed
      if (!groupId) {
        Taro.showToast({ title: '创建失败', icon: 'none' })
        return
      }

      const inviteIds = selectedIds.filter(id => id !== myUserId)
      if (inviteIds.length > 0) {
        await request({
          url: '/api/v1/groupmember/invite',
          method: 'POST',
          data: { group_id: groupId, user_ids: inviteIds }
        })
      }

      Taro.redirectTo({
        url: `/pages/chat/index?peer_id=${groupId}&title=${encodeURIComponent(groupName)}&type=2`
      })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '创建失败', icon: 'none' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <View className='group-select-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px`, paddingRight: `${menuButtonWidth}px` }}>
        <View className='nav-left' onClick={() => Taro.navigateBack()}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        <View className='nav-title'>选择互关好友</View>
      </View>

      <ScrollView
        scrollY
        className='select-scroll'
        style={{ height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`, marginTop: `${statusBarHeight + navBarHeight}px` }}
      >
        <View className='group-config-card' onClick={handleChooseAvatar}>
          <Text className='section-title'>群头像</Text>
          <View className='avatar-row'>
            {groupAvatar ? (
              <Image src={groupAvatar} className='avatar-preview' mode='aspectFill' />
            ) : (
              <View className='avatar-placeholder'>选择头像</View>
            )}
            <Text className='avatar-action'>{avatarUploading ? '上传中...' : '上传头像'}</Text>
          </View>
        </View>
        {loading && (
          <View className='loading-row'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        )}

        {!loading && friends.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-text'>暂无互关好友</Text>
          </View>
        )}

        <View className='friend-list'>
          {friends.map(item => {
            const checked = selectedIds.includes(item.user_id)
            const isPeer = item.user_id === peerId
            return (
              <View key={item.user_id} className='friend-item' onClick={() => toggleSelect(item.user_id)}>
                <View className={`select-dot ${checked ? 'checked' : ''} ${isPeer ? 'locked' : ''}`}>
                  {checked && <AtIcon value='check' size='12' color='#fff' />}
                </View>
                <View className='avatar-box'>
                  {item.avatar ? (
                    <Image src={item.avatar} className='avatar-img' mode='aspectFill' />
                  ) : (
                    <View className='avatar-placeholder'>
                      <Text>{item.nickname ? item.nickname[0] : 'U'}</Text>
                    </View>
                  )}
                </View>
                <View className='info-box'>
                  <Text className='name'>{item.nickname || '未命名用户'}</Text>
                  {isPeer && <Text className='tag'>当前聊天</Text>}
                </View>
              </View>
            )
          })}
        </View>

        <View className='bottom-space' />
      </ScrollView>

      <View className='bottom-bar'>
        <View className={`create-btn ${selectedCount ? 'active' : ''}`} onClick={handleCreateGroup}>
          <Text>{creating ? '创建中...' : `创建群聊(${selectedCount + 1})`}</Text>
        </View>
      </View>
    </View>
  )
}
