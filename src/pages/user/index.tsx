import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/index.scss'
import React, { useEffect, useState } from 'react'
import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

const BASE_URL = 'https://www.hypercn.cn'

export default function UserPage() {
  // 状态管理
  const [isLogin, setIsLogin] = useState(false) // 是否完全登录
  const [userInfo, setUserInfo] = useState<any>({}) // 用户基础信息
  const [userStats, setUserStats] = useState<any>({ following: 0, follower: 0, likes: 0 }) // 用户统计
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false) // 是否需要手机号

  // 完善信息弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [tempAvatar, setTempAvatar] = useState('')
  const [tempNickname, setTempNickname] = useState('')

  useEffect(() => {
    setTabBarIndex(4)
  }, [])

  Taro.useDidShow(() => {
    setTabBarIndex(4)
    // 可选：检查 token 有效性
    const token = Taro.getStorageSync('token')
    if (token && !isLogin) {
      // 实际项目中可以在这里调接口刷新用户信息
    }
  })

  // 监听登录状态，如果已登录但无头像，弹出完善框
  useEffect(() => {
    if (isLogin && (!userInfo.avatar_url || userInfo.avatar_url === '')) {
      setShowAuthModal(true)
      // 设置默认头像
      setTempAvatar('https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0')
      setTempNickname(userInfo.nickname || '')
    }
  }, [isLogin, userInfo])

  // 1. 登录逻辑
  const handleLogin = async () => {
    Taro.showLoading({ title: '登录中...' })
    try {
      const loginRes = await Taro.login()
      console.log('wx.login code:', loginRes.code)

      const res = await Taro.request({
        url: `${BASE_URL}/api/auth/wx-login`,
        method: 'POST',
        data: { code: loginRes.code }
      })

      Taro.hideLoading()
      const responseData = res.data

      if (responseData && responseData.token) {
        const { user, stats, token } = responseData
        Taro.setStorageSync('token', token)
        setUserInfo(user)
        setUserStats(stats)

        if (user.phone_number && user.phone_number !== "") {
          setIsLogin(true)
          setNeedPhoneAuth(false)
          Taro.showToast({ title: '登录成功', icon: 'success' })
        } else {
          setNeedPhoneAuth(true)
        }
      } else {
        const errorMsg = (responseData as any).msg || '登录失败'
        Taro.showToast({ title: errorMsg, icon: 'none' })
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '请求失败', icon: 'none' })
    }
  }

  // 2. 手机号绑定逻辑
  const onGetPhoneNumber = async (e: any) => {
    if (!e.detail?.code) {
      Taro.showToast({ title: '需授权手机号', icon: 'none' })
      return
    }
    Taro.showLoading({ title: '绑定中...' })
    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/auth/bind-phone`,
        method: 'POST',
        header: { 'Authorization': `Bearer ${Taro.getStorageSync('token')}` },
        data: { phone_code: e.detail.code }
      })
      Taro.hideLoading()
      const responseData = res.data
      if (responseData && responseData.phone_number) {
        const updatedUser = { ...userInfo, phone_number: responseData.phone_number }
        setUserInfo(updatedUser)
        setIsLogin(true)
        setNeedPhoneAuth(false)
        Taro.showToast({ title: '绑定成功', icon: 'success' })
      } else {
        Taro.showToast({ title: (responseData as any).msg || '绑定失败', icon: 'none' })
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '网络请求失败', icon: 'none' })
    }
  }

  // 3. 头像选择
  const onChooseAvatar = (e: any) => {
    const { avatarUrl } = e.detail
    setTempAvatar(avatarUrl)
  }

  // 4. 昵称输入
  const onNicknameBlur = (e: any) => {
    setTempNickname(e.detail.value)
  }

  // 5. 关闭弹窗
  const handleCloseModal = () => {
    setShowAuthModal(false)
  }

  // 6. 保存个人信息 (修复 BUG)
  const handleSubmitProfile = async () => {
    if (!tempNickname) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '保存中...' })
    const token = Taro.getStorageSync('token')

    try {
      let finalAvatarUrl = userInfo.avatar_url // 默认维持原头像

      // 判断是否是临时文件
      const isNewImage = tempAvatar.startsWith('http') && !tempAvatar.includes('mmbiz.qpic.cn') || tempAvatar.startsWith('wxfile')
      
      // 1. 上传图片 (UploadFile 返回结构通常是标准的，data 为字符串)
      if (isNewImage) {
        const uploadRes = await Taro.uploadFile({
          url: `${BASE_URL}/api/v1/user/avatar`,
          filePath: tempAvatar,
          name: 'image',
          header: { 'Authorization': `Bearer ${token}` }
        })

        let uploadData: any = {}
        try {
          uploadData = JSON.parse(uploadRes.data)
        } catch (e) {
          throw new Error('头像上传响应解析失败')
        }
        
        if (uploadData.code === 200) {
           finalAvatarUrl = (typeof uploadData.data === 'string') ? uploadData.data : uploadData.data?.url
        } else {
           throw new Error(uploadData.msg || '头像上传失败')
        }
      } else {
        finalAvatarUrl = tempAvatar
      }

      // 2. 更新用户信息接口
      // 注意：这里的 updateRes 根据你的描述，可能已经被拦截器处理过，直接就是 {code:200, ...}
      const updateRes: any = await Taro.request({
        url: `${BASE_URL}/api/v1/user/info`,
        method: 'POST',
        header: { 'Authorization': `Bearer ${token}` },
        data: {
          nickname: tempNickname,
          avatar: finalAvatarUrl
        }
      })

      Taro.hideLoading()

      // 【核心修复】：智能判断 updateRes 的结构
      // 1. 如果 updateRes 直接有 code 字段，说明它就是数据对象 (拦截器处理过)
      // 2. 否则，尝试取 updateRes.data (标准 Taro.request 返回)
      let resData = (updateRes.code !== undefined) ? updateRes : updateRes.data

      // 防御性编程：如果数据还是字符串，尝试解析
      if (typeof resData === 'string') {
        try {
          resData = JSON.parse(resData)
        } catch (e) {
          console.error('API响应非JSON格式', resData)
        }
      }

      // 判断业务状态码
      if (resData && resData.code === 200) {
        setUserInfo({
          ...userInfo,
          nickname: tempNickname,
          avatar_url: finalAvatarUrl
        })
        setShowAuthModal(false)
        Taro.showToast({ title: '保存成功', icon: 'success' })
      } else {
        Taro.showToast({ title: resData?.msg || '保存失败', icon: 'none' })
      }

    } catch (err: any) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }

  // 界面配置
  const hasData = isLogin || needPhoneAuth;
  const stats = [
    { label: '关注', value: hasData ? userStats.following : '-' },
    { label: '粉丝', value: hasData ? userStats.follower : '-' },
    { label: '赞/收藏', value: hasData ? userStats.likes : '-' },
  ];
  const mainNavItems = [
    { icon: 'list', label: '订单', action: '全部订单' },
    { icon: 'sketch', label: '钱包', action: '充值' },
    { icon: 'tag', label: '票务', action: '优惠券' },
    { icon: 'star', label: '积分', action: '积分' },
    { icon: 'home', label: '主办中心', action: '站点' },
  ];

  const handleItemClick = (label: string) => {
    if (!isLogin && label !== '设置') {
       Taro.showToast({title: '请先登录', icon: 'none'})
       return
    }
    Taro.showToast({ title: `点击了${label}`, icon: 'none' })
  }

  return (
    <View className='user-page'>
      {/* Header Section */}
      <View className='header-section'>
        <View className='user-profile'>
          <View className='avatar-container'>
            {hasData && userInfo.avatar_url ? (
               <Image className='avatar-img' src={userInfo.avatar_url} />
            ) : (
               <View className='avatar-placeholder'>
                 <AtIcon value='user' size='30' color='#fff' />
               </View>
            )}
          </View>

          <View className='info-container'>
            {isLogin ? (
              <>
                <View className='name-row'>
                  <Text className='username'>{userInfo.nickname || '微信用户'}</Text>
                  <View className='vip-tag'>
                    <Text className='vip-text'>{userInfo.vip_level || '普通会员'}</Text>
                  </View>
                </View>
                <Text className='user-id'>ID: {userInfo.user_id}</Text>
              </>
            ) : (
              <View className='login-actions'>
                {needPhoneAuth ? (
                   <Text className='welcome-text'>你好，{userInfo.nickname}</Text>
                ) : (
                   <Text className='welcome-text'>欢迎来到HyperFun</Text>
                )}
                {needPhoneAuth ? (
                  <Button 
                    className='login-btn phone-btn'
                    openType="getPhoneNumber"
                    onGetPhoneNumber={onGetPhoneNumber}
                  >
                    点击绑定手机号
                  </Button>
                ) : (
                  <Button 
                    className='login-btn'
                    onClick={handleLogin}
                  >
                    立即登录/注册
                  </Button>
                )}
              </View>
            )}
          </View>
          
          <View className='header-tools'>
             <AtIcon value='streaming' size='20' color='#333' className='tool-icon'/>
             <AtIcon value='settings' size='20' color='#333' className='tool-icon'/>
          </View>
        </View>

        <View className='stats-row'>
          {stats.map((stat, index) => (
            <View key={index} className='stat-item'>
              <Text className='stat-val'>{stat.value}</Text>
              <Text className='stat-lbl'>{stat.label}</Text>
            </View>
          ))}
          <View className='edit-profile-btn'>
             {isLogin ? <Text>编辑资料</Text> : <Text>设置</Text>}
          </View>
        </View>
      </View>

      {/* Main Nav */}
      <View className='main-nav-card'>
        {mainNavItems.map((item, index) => (
          <View key={index} className='nav-item' onClick={() => handleItemClick(item.action)}>
             <View className='nav-icon-circle'>
               <AtIcon value={item.icon} size='24' color='#999' />
             </View>
             <Text className='nav-text'>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Subscription Section */}
      <View className='section-card'>
         <View className='section-header'>
            <View className='tab-active'><Text>我的订阅</Text></View>
            <View className='tab-inactive'><Text>动态</Text></View>
            <Text className='section-extra'>3个活动进行中</Text>
         </View>
         <View className='scroll-row'>
            {[1, 2, 3, 4].map((i) => (
               <View key={i} className='activity-card'>
                  <View className={`status-tag ${i===4 ? 'ended' : 'active'}`}>
                     <Text>{i===4 ? '已结束' : '进行中'}</Text>
                  </View>
               </View>
            ))}
         </View>
      </View>

      {/* Participation Section */}
      <View className='section-card'>
         <View className='section-header'>
            <Text className='section-title'>我参与的</Text>
            <Text className='section-more'>查看全部</Text>
         </View>
         <View className='scroll-row'>
             {[1, 2, 3, 4].map((i) => (
               <View key={i} className='poster-card' />
             ))}
         </View>
      </View>

      {/* 完善信息弹窗 (修复后) */}
      {showAuthModal && (
        <View className='auth-modal-overlay'>
          <View className='auth-modal-content'>
            {/* 关闭按钮 */}
            <View className='close-icon' onClick={handleCloseModal}>
              <AtIcon value='close' size='20' color='#999' />
            </View>

            <Text className='modal-title'>完善个人信息</Text>
            <Text className='modal-subtitle'>获取您的头像和昵称以展示</Text>
            
            <Button 
              className='avatar-wrapper-btn' 
              openType="chooseAvatar" 
              onChooseAvatar={onChooseAvatar}
            >
              <Image className='chosen-avatar' src={tempAvatar} mode='aspectFill' />
              <View className='edit-badge'>
                <AtIcon value='camera' size='12' color='#fff' />
              </View>
            </Button>

            <View className='input-group'>
              <Text className='label'>昵称</Text>
              <Input 
                type="nickname" 
                className='nickname-input' 
                placeholder="请输入昵称" 
                value={tempNickname}
                onBlur={onNicknameBlur}
                onInput={(e) => setTempNickname(e.detail.value)}
              />
            </View>

            <Button className='save-btn' onClick={handleSubmitProfile}>保存信息</Button>
          </View>
        </View>
      )}
    </View>
  )
}