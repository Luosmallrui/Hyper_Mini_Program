import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/index.scss'
import {useEffect, useState} from 'react'
import {View, Text, Button, Image, Input, ScrollView} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {setTabBarIndex} from '../../store/tabbar'
import {request, saveTokens} from '../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

// ✅ 修改：适配实际接口返回的数据结构
interface Note {
  id: number;
  title: string;
  content: string;
  media_data: Array<{
    url: string;
    thumbnail_url: string;
    width: number;
    height: number;
  }>;
  type: number;
  created_at: string;
}

export default function UserPage() {
  // --- 状态管理 ---
  const [isLogin, setIsLogin] = useState(false)
  const [userInfo, setUserInfo] = useState<any>({})
  const [userStats, setUserStats] = useState<any>({following: 0, follower: 0, likes: 0, notes: 0})
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false)

  // 弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [tempAvatar, setTempAvatar] = useState('')
  const [tempNickname, setTempNickname] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)

  // 布局适配状态
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  // ✅ 修改：只保留笔记相关状态
  const [noteList, setNoteList] = useState<Note[]>([])
  const [cursor, setCursor] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)

  // --- 生命周期 ---
  useEffect(() => {
    setTabBarIndex(4)

    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()

    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)

    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)

    const onUserUpdate = (u: any) => {
      setUserInfo(u)
      setIsLogin(true)
      setNeedPhoneAuth(!u.phone_number)
    }
    Taro.eventCenter.on('USER_INFO_UPDATED', onUserUpdate)

    initLoginState()

    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', onUserUpdate)
    }
  }, [])

  Taro.useDidShow(() => {
    setTabBarIndex(4)
    if (Taro.getStorageSync('access_token')) {
      fetchLatestUserInfo()
    }
  })

  // ✅ 修改：登录后自动加载笔记
  useEffect(() => {
    if (isLogin) {
      loadMyNotes()
    }
  }, [isLogin])

  // --- 业务逻辑 ---

  const initLoginState = () => {
    const token = Taro.getStorageSync('access_token')
    const cachedUser = Taro.getStorageSync('userInfo')

    if (token) {
      if (cachedUser) {
        setUserInfo(cachedUser)
        setIsLogin(true)
        setNeedPhoneAuth(!cachedUser.phone_number)
      }
      fetchLatestUserInfo()
    } else {
      handleLogin(true)
    }
  }

  // 获取最新用户信息
  const fetchLatestUserInfo = async () => {
    try {
      const res = await request({
        url: '/api/v1/user/info',
        method: 'GET'
      })

      let resData: any = res.data
      if (typeof resData === 'string') {
        try {
          resData = JSON.parse(resData)
        } catch (e) {
        }
      }

      if (resData && resData.code === 200 && resData.data) {
        const {user, stats} = resData.data

        setUserInfo(user)
        if (stats) {
          setUserStats(stats)
        }

        Taro.setStorageSync('userInfo', user)
        Taro.eventCenter.trigger('USER_INFO_UPDATED', user)

        setIsLogin(true)
        setNeedPhoneAuth(!user.phone_number)
      }
    } catch (e) {
      console.error('获取用户信息网络异常', e)
    }
  }

  // ✅ 修改：加载我的笔记（使用 cursor 分页）
  const loadMyNotes = async (currentCursor: number = 0) => {
    if (loading) return

    // 只在非首次加载时检查 hasMore
    if (currentCursor > 0 && !hasMore) return

    setLoading(true)

    try {
      const res = await request({
        url: '/api/v1/user/my-notes',
        method: 'GET',
        data: {
          cursor: currentCursor,
          pageSize: 6  // 首屏只显示 6 条
        }
      })

      let resData: any = res.data
      if (typeof resData === 'string') {
        try {
          resData = JSON.parse(resData)
        } catch (e) {
        }
      }

      if (resData && resData.code === 200 && resData.data) {
        const { list, next_cursor, has_more } = resData.data

        // cursor=0 时替换，否则追加
        setNoteList(prev => currentCursor === 0 ? list : [...prev, ...list])
        setCursor(next_cursor || 0)
        setHasMore(has_more || false)
      }
    } catch (error) {
      console.error('加载笔记失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Taro.removeStorageSync('access_token')
    Taro.removeStorageSync('refresh_token')
    Taro.removeStorageSync('userInfo')
    setIsLogin(false)
    setUserInfo({})
    setUserStats({following: 0, follower: 0, likes: 0, notes: 0})
    setNoteList([])
    setCursor(0)
    setHasMore(true)
  }

  const handleLogoutClick = () => {
    setTimeout(() => {
      Taro.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        confirmColor: '#FF2E4D',
        success: function (res) {
          if (res.confirm) {
            handleLogout()
          }
        }
      })
    }, 50)
  }

  const handleLogin = async (isSilent = false) => {
    if (!isSilent) Taro.showLoading({title: '登录中...'})

    try {
      const loginRes = await Taro.login()

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/auth/wx-login`,
        method: 'POST',
        data: {code: loginRes.code}
      })

      if (!isSilent) Taro.hideLoading()

      let responseData = res.data
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData)
        } catch (e) {
        }
      }

      if (responseData && responseData.code === 200 && responseData.data) {
        const {access_token, refresh_token, access_expire} = responseData.data

        Taro.setStorageSync('access_token', access_token)
        Taro.setStorageSync('refresh_token', refresh_token)

        saveTokens(access_token, refresh_token, access_expire)

        await fetchLatestUserInfo()

        if (!isSilent) {
          Taro.hideLoading()
          Taro.showToast({title: '登录成功', icon: 'success'})
        }
      } else {
        if (!isSilent) {
          Taro.hideLoading()
          const errorMsg = responseData?.msg || '登录失败'
          Taro.showToast({title: errorMsg, icon: 'none'})
        }
      }
    } catch (err) {
      if (!isSilent) {
        Taro.hideLoading()
        Taro.showToast({title: '请求失败', icon: 'none'})
      }
    }
  }

  const onGetPhoneNumber = async (e: any) => {
    if (!e.detail?.code) return
    Taro.showLoading({title: '绑定中...'})

    try {
      const res = await request({
        url: '/api/v1/auth/bind-phone',
        method: 'POST',
        data: {phone_code: e.detail.code}
      })

      Taro.hideLoading()
      const rd: any = res.data
      if (rd && rd.code === 200) {
        Taro.showToast({title: '绑定成功', icon: 'success'})
        fetchLatestUserInfo()
      } else {
        Taro.showToast({title: rd?.msg || '绑定失败', icon: 'none'})
      }
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({title: '网络请求失败', icon: 'none'})
    }
  }

  const onChooseAvatar = (e: any) => {
    setTempAvatar(e.detail.avatarUrl)
  }
  const onNicknameBlur = (e: any) => {
    setTempNickname(e.detail.value)
  }
  const handleCloseModal = () => {
    setShowAuthModal(false)
  }

  const handleOpenEdit = () => {
    if (!isLogin) {
      handleLogin(false)
      return
    }
    setTempAvatar(userInfo.avatar_url || '')
    setTempNickname(userInfo.nickname || '')
    setIsEditMode(true)
    setShowAuthModal(true)
  }

  const handleSubmitProfile = async () => {
    if (!tempNickname) {
      Taro.showToast({title: '请输入昵称', icon: 'none'});
      return
    }
    Taro.showLoading({title: '保存中...'})
    const token = Taro.getStorageSync('access_token')

    try {
      let finalAvatarUrl = userInfo.avatar_url
      const isNewImage = tempAvatar.startsWith('http') && !tempAvatar.includes('mmbiz.qpic.cn') || tempAvatar.startsWith('wxfile')

      if (isNewImage) {
        const upRes = await Taro.uploadFile({
          url: `${BASE_URL}/api/v1/user/avatar`,
          filePath: tempAvatar,
          name: 'image',
          header: {'Authorization': `Bearer ${token}`}
        })
        let upData: any = {}
        try {
          upData = JSON.parse(upRes.data)
        } catch (e) {
          throw new Error('头像上传解析失败')
        }

        if (upData.code === 200) {
          finalAvatarUrl = (typeof upData.data === 'string') ? upData.data : upData.data?.url
        } else {
          throw new Error(upData.msg || '头像上传失败')
        }
      } else if (tempAvatar !== userInfo.avatar_url) {
        finalAvatarUrl = tempAvatar
      }

      const upInfoRes = await request({
        url: '/api/v1/user/info',
        method: 'POST',
        data: {nickname: tempNickname, avatar: finalAvatarUrl}
      })

      Taro.hideLoading()

      const rd: any = upInfoRes.data
      if (rd && rd.code === 200) {
        setShowAuthModal(false)
        Taro.showToast({title: '保存成功', icon: 'success'})
        fetchLatestUserInfo()
      } else {
        Taro.showToast({title: rd?.msg || '保存失败', icon: 'none'})
      }
    } catch (err: any) {
      Taro.hideLoading()
      Taro.showToast({title: err.message || '操作失败', icon: 'none'})
    }
  }

  const formatNumber = (num: number | string): string => {
    if (num === '-') return '-';
    const value = Number(num);
    if (value >= 10000) {
      return (value / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return String(value);
  };

  const handleStatClick = (type: string | null) => {
    if (!isLogin || !hasData || !type) return;

    Taro.navigateTo({
      url: `/pages/user/follow-list/index?type=${type}&userId=${userInfo.user_id || ''}`
    });
  };

  // ✅ 修改：点击笔记跳转详情（使用笔记 id）
  const handleNoteClick = (noteId: number) => {
    Taro.navigateTo({
      url: `/pages/note/detail/index?noteId=${noteId}`
    });
  };

  // ✅ 修改：查看全部笔记
  const handleViewAll = () => {
    Taro.navigateTo({
      url: `/pages/user/profile/index?userId=${userInfo.user_id}`
    });
  };

  // ✅ 修改：获取笔记封面图（使用 thumbnail_url 或第一张图）
  const getNoteCover = (note: Note): string => {
    if (note.media_data && note.media_data.length > 0) {
      return note.media_data[0].thumbnail_url || note.media_data[0].url
    }
    return ''
  }

  const hasData = isLogin || needPhoneAuth;

  const stats = [
    {
      label: '关注',
      value: hasData ? userStats?.following || 0 : '-',
      type: 'following'
    },
    {
      label: '粉丝',
      value: hasData ? userStats?.follower || 0 : '-',
      type: 'follower'
    },
    {
      label: '赞/收藏',
      value: hasData ? userStats?.likes || 0 : '-',
      type: null
    },
  ];

  const mainNavItems = [
    {icon: 'list', label: '订单', action: '全部订单', route: '/pages/order/index'},
    {icon: 'sketch', label: '钱包', action: '充值'},
    {icon: 'tag', label: '票务', action: '优惠券'},
    {icon: 'star', label: '积分', action: '积分'},
    {icon: 'home', label: '主办中心', action: '站点'},
  ];

  const handleItemClick = (item) => {
    if (!isLogin) {
      handleLogin(false)
      return
    }

    if (item.route) {
      Taro.navigateTo({
        url: item.route,
      })
    }
  }

  return (
    <ScrollView className='user-page-dark' scrollY>
      <View className='custom-nav-bar' style={{height: `${statusBarHeight + navBarHeight}px`}}>
        <View style={{height: `${statusBarHeight}px`}}/>
        <View className='nav-bar-content' style={{height: `${navBarHeight}px`}}>
          <Text className='page-title'>我的</Text>
        </View>
      </View>

      <View className='header-section' style={{marginTop: `${statusBarHeight + navBarHeight}px`}}>
        <View className='user-profile'>
          <View className='avatar-container'>
            {hasData && userInfo.avatar_url ? (
              <Image className='avatar-img' src={userInfo.avatar_url} mode='aspectFill'/>
            ) : (
              <View className='avatar-placeholder'>
                <AtIcon value='user' size='30' color='#999'/>
              </View>
            )}
          </View>

          <View className='info-container'>
            {isLogin ? (
              <>
                <View className='name-row'>
                  <Text className='username'>{userInfo.nickname || '微信用户'}</Text>
                  <View className='vip-tag'><Text className='vip-text'>VIP会员</Text></View>
                </View>
                <Text className='user-id'>ID: {userInfo.user_id}</Text>
              </>
            ) : (
              <View className='login-actions'>
                <Text
                  className='welcome-text'>{needPhoneAuth ? `你好，${userInfo.nickname || '新用户'}` : '欢迎来到 HyperFun'}</Text>
                {needPhoneAuth ? (
                  <Button className='login-btn phone-btn' openType="getPhoneNumber"
                          onGetPhoneNumber={onGetPhoneNumber}>绑定手机号</Button>
                ) : (
                  <Button className='login-btn' onClick={() => handleLogin(false)}>立即登录 / 注册</Button>
                )}
              </View>
            )}
          </View>

          <View className='edit-btn-wrap'>
            <View className='edit-profile-btn' onClick={handleOpenEdit}>
              {isLogin ? '编辑资料' : '去登录'}
            </View>
          </View>
        </View>

        <View className='stats-row'>
          {stats.map((stat, index) => (
            <View
              key={index}
              className={`stat-item ${stat.type ? 'clickable' : ''}`}
              onClick={() => handleStatClick(stat.type)}
            >
              <Text className='stat-val'>{formatNumber(stat.value)}</Text>
              <Text className='stat-lbl'>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ✅ 修改：只保留笔记区域，去掉 Tab */}
      {isLogin && (
        <View className='my-content-section'>
          <View className='section-header'>
            <Text className='section-title'>我的笔记 {userStats.notes > 0 && `(${userStats.notes})`}</Text>
            <Text className='section-more' onClick={handleViewAll}>查看全部</Text>
          </View>

          {/* 笔记列表 */}
          <View className='notes-container'>
            {loading ? (
              <View className='loading-state'>
                <Text className='loading-text'>加载中...</Text>
              </View>
            ) : noteList.length > 0 ? (
              <View className='notes-grid'>
                {noteList.slice(0, 6).map(note => (
                  <View
                    key={note.id}
                    className='note-card'
                    onClick={() => handleNoteClick(note.id)}
                  >
                    <Image
                      className='note-cover'
                      src={getNoteCover(note)}
                      mode='aspectFill'
                    />
                    <Text className='note-title'>{note.title}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className='empty-state'>
                <Text className='empty-icon'>📝</Text>
                <Text className='empty-text'>还没有发布笔记</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View className='main-nav-card'>
        {mainNavItems.map((item, index) => (
          <View
            key={index}
            className='nav-item'
            onClick={() => handleItemClick(item)}
          >
            <View className='nav-icon-circle'>
              <AtIcon value={item.icon} size='24' color='#fff'/>
            </View>
            <Text className='nav-text'>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className='section-card'>
        <View className='section-header'>
          <View className='tab-active'><Text>我的订阅</Text></View>
          <View className='tab-inactive'><Text>动态</Text></View>
          <Text className='section-extra'>3个活动</Text>
        </View>
        <View className='scroll-row'>
          {[1, 2, 3].map((i) => (
            <View key={i} className='activity-card'>
              <View className='status-tag'><Text>进行中</Text></View>
            </View>
          ))}
        </View>
      </View>

      <View className='section-card'>
        <View className='section-header'>
          <Text className='section-title'>我参与的</Text>
          <Text className='section-more'>查看全部</Text>
        </View>
        <View className='scroll-row'>
          {[1, 2, 3].map((i) => (
            <View key={i} className='poster-card'/>
          ))}
        </View>
      </View>

      {isLogin && (
        <View className='logout-section'>
          <View className='logout-btn' onClick={handleLogoutClick}>
            <Text>退出登录</Text>
          </View>
        </View>
      )}

      {showAuthModal && (
        <View className='auth-modal-overlay'>
          <View className='auth-modal-content'>
            <View className='close-icon' onClick={handleCloseModal}>
              <AtIcon value='close' size='20' color='#666'/>
            </View>
            <Text className='modal-title'>{isEditMode ? '编辑个人信息' : '完善个人信息'}</Text>
            <Text className='modal-subtitle'>获取您的头像和昵称以展示</Text>

            <Button className='avatar-wrapper-btn' openType="chooseAvatar" onChooseAvatar={onChooseAvatar}>
              <Image className='chosen-avatar' src={tempAvatar} mode='aspectFill'/>
              <View className='edit-badge'><AtIcon value='camera' size='12' color='#fff'/></View>
            </Button>

            <View className='input-group'>
              <Text className='label'>昵称</Text>
              <Input type="nickname" className='nickname-input' placeholder="请输入昵称" value={tempNickname}
                     onBlur={onNicknameBlur} onInput={(e) => setTempNickname(e.detail.value)}/>
            </View>

            <Button className='save-btn' onClick={handleSubmitProfile}>保存信息</Button>
          </View>
        </View>
      )}
    </ScrollView>
  )
}
