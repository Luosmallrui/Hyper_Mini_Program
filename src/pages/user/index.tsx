import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/index.scss'
import React, { useEffect, useState } from 'react'
import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setTabBarIndex } from '../../store/tabbar'
// 引入封装好的请求工具
import { request } from '../../utils/request'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

export default function UserPage() {
  // --- 状态管理 ---
  const [isLogin, setIsLogin] = useState(false) 
  const [userInfo, setUserInfo] = useState<any>({}) 
  const [userStats, setUserStats] = useState<any>({ following: 0, follower: 0, likes: 0 }) 
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false) 

  // 弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [tempAvatar, setTempAvatar] = useState('')
  const [tempNickname, setTempNickname] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)

  // 布局适配状态
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  // --- 生命周期 ---
  useEffect(() => {
    setTabBarIndex(4)
    
    // 1. 布局适配计算
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)

    // 2. 监听全局用户信息更新
    const onUserUpdate = (u: any) => {
        setUserInfo(u)
        setIsLogin(true)
        setNeedPhoneAuth(!u.phone_number)
    }
    Taro.eventCenter.on('USER_INFO_UPDATED', onUserUpdate)

    // 3. 初始化登录状态
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

  // --- 业务逻辑 ---

  // 初始化检查本地缓存
  const initLoginState = () => {
    const token = Taro.getStorageSync('access_token')
    const cachedUser = Taro.getStorageSync('userInfo')

    if (token) {
      if (cachedUser) {
        setUserInfo(cachedUser)
        setIsLogin(true)
        setNeedPhoneAuth(!cachedUser.phone_number)
      }
      // 有 Token 就尝试去拉取最新信息
      fetchLatestUserInfo()
    } else {
      handleLogin(true) 
    }
  }

  // 获取最新用户信息 (GET /user/info)
  const fetchLatestUserInfo = async () => {
    try {
      const res = await request({
          url: '/api/v1/user/info',
          method: 'GET'
      })
      
      let resData: any = res.data
      if (typeof resData === 'string') {
        try { resData = JSON.parse(resData) } catch(e){}
      }

      if (resData && resData.code === 200 && resData.data) {
          const { user, stats } = resData.data
          
          setUserInfo(user)
          if (stats) {
              setUserStats(stats)
          }
          
          Taro.setStorageSync('userInfo', user)
          Taro.eventCenter.trigger('USER_INFO_UPDATED', user)
          
          setIsLogin(true)
          setNeedPhoneAuth(!user.phone_number)
      } else {
          console.warn('获取用户信息失败', resData)
      }
    } catch (e) {
      console.error('获取用户信息网络异常', e)
    }
  }

  // 执行登出操作
  const handleLogout = () => {
    Taro.removeStorageSync('access_token')
    Taro.removeStorageSync('refresh_token')
    Taro.removeStorageSync('userInfo')
    setIsLogin(false)
    setUserInfo({})
    setUserStats({ following: 0, follower: 0, likes: 0 })
  }

  // 点击登出按钮
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

  // 登录 (支持静默)
  const handleLogin = async (isSilent = false) => {
    if (!isSilent) Taro.showLoading({ title: '登录中...' })
    
    try {
      const loginRes = await Taro.login()
      
      // 使用原生 request，避免死循环
      // 【修改】URL 增加 v1
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/auth/wx-login`,
        method: 'POST',
        data: { code: loginRes.code }
      })

      if (!isSilent) Taro.hideLoading()
      
      let responseData = res.data
      if (typeof responseData === 'string') {
          try { responseData = JSON.parse(responseData) } catch(e){}
      }

      if (responseData && responseData.code === 200 && responseData.data) {
        const { access_token, refresh_token } = responseData.data
        
        Taro.setStorageSync('access_token', access_token)
        Taro.setStorageSync('refresh_token', refresh_token)
        
        // 登录成功后，立即调用 /user/info 获取用户信息
        await fetchLatestUserInfo()
        
        if (!isSilent) {
          Taro.hideLoading()
          Taro.showToast({ title: '登录成功', icon: 'success' })
        }
      } else {
        if (!isSilent) {
            Taro.hideLoading()
            const errorMsg = responseData?.msg || '登录失败'
            Taro.showToast({ title: errorMsg, icon: 'none' })
        }
      }
    } catch (err) {
      if (!isSilent) {
          Taro.hideLoading()
          Taro.showToast({ title: '请求失败', icon: 'none' })
      }
    }
  }

  // 手机号绑定
  const onGetPhoneNumber = async (e: any) => { 
    if (!e.detail?.code) return
    Taro.showLoading({ title: '绑定中...' })
    
    try {
        // 【修改】URL 增加 v1
        const res = await request({
            url: '/api/v1/auth/bind-phone',
            method: 'POST',
            data: { phone_code: e.detail.code }
        })
        
        Taro.hideLoading()
        const rd: any = res.data
        if (rd && rd.code === 200) {
            Taro.showToast({ title: '绑定成功', icon: 'success' })
            fetchLatestUserInfo()
        } else {
            Taro.showToast({ title: rd?.msg || '绑定失败', icon: 'none' })
        }
    } catch (error) {
        Taro.hideLoading()
        Taro.showToast({ title: '网络请求失败', icon: 'none' })
    }
  }

  // 编辑资料相关
  const onChooseAvatar = (e: any) => { setTempAvatar(e.detail.avatarUrl) }
  const onNicknameBlur = (e: any) => { setTempNickname(e.detail.value) }
  const handleCloseModal = () => { setShowAuthModal(false) }

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

  // 保存资料
  const handleSubmitProfile = async () => { 
      if (!tempNickname) { Taro.showToast({ title: '请输入昵称', icon: 'none' }); return }
      Taro.showLoading({ title: '保存中...' })
      const token = Taro.getStorageSync('access_token')

      try {
        let finalAvatarUrl = userInfo.avatar_url 
        const isNewImage = tempAvatar.startsWith('http') && !tempAvatar.includes('mmbiz.qpic.cn') || tempAvatar.startsWith('wxfile')
        
        if (isNewImage) {
            const upRes = await Taro.uploadFile({
                url: `${BASE_URL}/api/v1/user/avatar`,
                filePath: tempAvatar,
                name: 'image',
                header: { 'Authorization': `Bearer ${token}` }
            })
            let upData: any = {}
            try { upData = JSON.parse(upRes.data) } catch(e) { throw new Error('头像上传解析失败') }
            
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
            data: { nickname: tempNickname, avatar: finalAvatarUrl }
        })
        
        Taro.hideLoading()
        
        const rd: any = upInfoRes.data
        if (rd && rd.code === 200) {
            setShowAuthModal(false)
            Taro.showToast({ title: '保存成功', icon: 'success' })
            fetchLatestUserInfo() 
        } else {
            Taro.showToast({ title: rd?.msg || '保存失败', icon: 'none' })
        }
      } catch(err: any) {
          Taro.hideLoading()
          Taro.showToast({ title: err.message || '操作失败', icon: 'none' })
      }
  }

  // 界面配置
  const hasData = isLogin || needPhoneAuth;
  const stats = [
    { label: '关注', value: hasData ? userStats?.following || 0 : '-' },
    { label: '粉丝', value: hasData ? userStats?.follower || 0 : '-' },
    { label: '赞/收藏', value: hasData ? userStats?.likes || 0 : '-' },
  ];
  
  const mainNavItems = [
    { icon: 'list', label: '订单', action: '全部订单' },
    { icon: 'sketch', label: '钱包', action: '充值' },
    { icon: 'tag', label: '票务', action: '优惠券' },
    { icon: 'star', label: '积分', action: '积分' },
    { icon: 'home', label: '主办中心', action: '站点' },
  ];

  const handleItemClick = (label: string) => {
    if (!isLogin && label !== '设置') { handleLogin(false); return }
    Taro.showToast({ title: `点击了${label}`, icon: 'none' })
  }

  return (
    <View className='user-page-dark'>
      <View className='custom-nav-bar' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
          <View style={{ height: `${statusBarHeight}px` }} />
          <View className='nav-bar-content' style={{ height: `${navBarHeight}px` }}>
              <Text className='page-title'>我的</Text>
          </View>
      </View>

      <View className='header-section' style={{ marginTop: `${statusBarHeight + navBarHeight}px` }}>
        <View className='user-profile'>
          <View className='avatar-container'>
            {hasData && userInfo.avatar_url ? (
               <Image className='avatar-img' src={userInfo.avatar_url} mode='aspectFill' />
            ) : (
               <View className='avatar-placeholder'>
                 <AtIcon value='user' size='30' color='#999' />
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
                <Text className='welcome-text'>{needPhoneAuth ? `你好，${userInfo.nickname || '新用户'}` : '欢迎来到 HyperFun'}</Text>
                {needPhoneAuth ? (
                  <Button className='login-btn phone-btn' openType="getPhoneNumber" onGetPhoneNumber={onGetPhoneNumber}>绑定手机号</Button>
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
            <View key={index} className='stat-item'>
              <Text className='stat-val'>{stat.value}</Text>
              <Text className='stat-lbl'>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='main-nav-card'>
        {mainNavItems.map((item, index) => (
          <View key={index} className='nav-item' onClick={() => handleItemClick(item.action)}>
             <View className='nav-icon-circle'><AtIcon value={item.icon} size='24' color='#fff' /></View>
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
               <View key={i} className='poster-card' />
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
              <AtIcon value='close' size='20' color='#666' />
            </View>
            <Text className='modal-title'>{isEditMode ? '编辑个人信息' : '完善个人信息'}</Text>
            <Text className='modal-subtitle'>获取您的头像和昵称以展示</Text>
            
            <Button className='avatar-wrapper-btn' openType="chooseAvatar" onChooseAvatar={onChooseAvatar}>
              <Image className='chosen-avatar' src={tempAvatar} mode='aspectFill' />
              <View className='edit-badge'><AtIcon value='camera' size='12' color='#fff' /></View>
            </Button>

            <View className='input-group'>
              <Text className='label'>昵称</Text>
              <Input type="nickname" className='nickname-input' placeholder="请输入昵称" value={tempNickname} onBlur={onNicknameBlur} onInput={(e) => setTempNickname(e.detail.value)}/>
            </View>

            <Button className='save-btn' onClick={handleSubmitProfile}>保存信息</Button>
          </View>
        </View>
      )}
    </View>
  )
}