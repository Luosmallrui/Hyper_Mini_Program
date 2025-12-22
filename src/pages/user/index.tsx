import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/index.scss'
import { useEffect, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

export default function UserPage() {
  // 状态管理
  const [isLogin, setIsLogin] = useState(false) // 是否完全登录（绑定了手机号）
  const [userInfo, setUserInfo] = useState<any>({}) // 用户基础信息
  const [userStats, setUserStats] = useState<any>({ following: 0, follower: 0, likes: 0 }) // 用户统计数据
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false) // 是否处于“等待绑定手机”状态

  useEffect(() => {
    setTabBarIndex(3)
  }, [])

  Taro.useDidShow(() => {
    setTabBarIndex(3)
  })

  // 第一步：普通登录（获取 openid/token）
  const handleLogin = async () => {
    Taro.showLoading({ title: '登录中...' })
    try {
      const loginRes = await Taro.login()
      console.log('wx.login code:', loginRes.code)

      const res = await Taro.request({
        url: 'https://hyperfun.com.cn/api/auth/wx-login',
        method: 'POST',
        data: {
          code: loginRes.code
        }
      })

      console.log('Code2Session 返回:', res.data)
      Taro.hideLoading()

      const responseData = res.data

      // 判断依据：只要返回的数据里有 token，就视为请求成功
      if (responseData && responseData.token) {
        const { user, stats, token } = responseData

        // 1. 保存 Token
        Taro.setStorageSync('token', token)

        // 2. 更新用户信息和统计数据
        setUserInfo(user)
        setUserStats(stats)

        // 3. 判断是否有手机号
        if (user.phone_number && user.phone_number !== "") {
          setIsLogin(true)
          setNeedPhoneAuth(false)
          Taro.showToast({ title: '登录成功', icon: 'success' })
        } else {
          // 手机号为空，设置需要验证手机状态
          setNeedPhoneAuth(true)
          // 这里不要 setIsLogin(true)，保持未完全登录状态，界面显示绑定按钮
          // 但此时头像和昵称已经获取到了，界面会更新显示头像
        }
      } else {
        // 如果没有 token，或者返回了错误信息
        // 兼容一下如果服务器返回了 { msg: 'error' } 这种情况
        const errorMsg = (responseData as any).msg || '登录数据解析失败'
        Taro.showToast({ title: errorMsg, icon: 'none' })
      }

    } catch (err) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: '登录请求失败', icon: 'none' })
    }
  }

  // 第二步：获取手机号并绑定
  const onGetPhoneNumber = async (e: any) => {
    console.log('getPhoneNumber event:', e)

    if (!e.detail?.code) {
      console.log('用户拒绝或环境不对')
      Taro.showToast({ title: '需授权手机号才能继续', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '绑定中...' })

    try {
      const res = await Taro.request({
        url: 'https://hyperfun.com.cn/api/auth/bind-phone',
        method: 'POST',
        header: {
          // 绑定手机号通常需要带上 token
          'Authorization': `Bearer ${Taro.getStorageSync('token')}`
        },
        data: {
          phone_code: e.detail.code
        }
      })

      console.log('绑定手机号返回:', res.data)
      Taro.hideLoading()

      // 【修改点】：直接获取 res.data
      const responseData = res.data

      // 判断依据：如果返回的数据里有 phone_number，说明绑定成功
      if (responseData && responseData.phone_number) {
        // 1. 更新用户信息
        // 将新的手机号合并到当前的 userInfo 中
        const updatedUser = { 
          ...userInfo, 
          phone_number: responseData.phone_number 
        }
        setUserInfo(updatedUser)
        
        // 2. 状态切换：完全登录成功，不再需要授权手机
        setIsLogin(true)
        setNeedPhoneAuth(false)
        
        Taro.showToast({ title: '绑定成功', icon: 'success' })
      } else {
        // 如果没有 phone_number 字段，视为失败
        const errorMsg = (responseData as any).msg || '绑定失败'
        Taro.showToast({ title: errorMsg, icon: 'none' })
      }

    } catch (err) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: '绑定请求失败', icon: 'none' })
    }
  }

  // 计算属性：如果有用户信息（无论是已登录 还是 待绑定手机），都显示数据
  const hasData = isLogin || needPhoneAuth;

  // 映射接口数据到界面统计
  const stats = [
    { label: '关注', value: hasData ? userStats.following : '-' },
    { label: '粉丝', value: hasData ? userStats.follower : '-' },
    { label: '赞/收藏', value: hasData ? userStats.likes : '-' },
  ];

  // 中间圆圈导航
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
    // ... 原有跳转逻辑不变 ...
    Taro.showToast({ title: `点击了${label}`, icon: 'none' })
  }

  return (
    <View className='user-page'>
      {/* Top Header Section */}
      <View className='header-section'>
        {/* User Info Row */}
        <View className='user-profile'>
          <View className='avatar-container'>
            {/* 如果有头像url (userInfo.avatar_url) 则显示，否则显示默认 */}
            {hasData && userInfo.avatar_url ? (
               <Image className='avatar-img' src={userInfo.avatar_url} />
            ) : (
               <View className='avatar-placeholder'>
                 <AtIcon value='user' size='30' color='#fff' />
               </View>
            )}
          </View>

          <View className='info-container'>
            {/* 登录成功：显示 昵称 + ID */}
            {/* 待绑定手机：也可以显示昵称(接口已返回)，但下方显示绑定按钮 */}
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
                {/* 这里的文案可以根据状态稍微变化，增强体验 */}
                {needPhoneAuth ? (
                   // 已经获取了昵称，显示欢迎语
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

        {/* Stats Row */}
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

      {/* Main Circular Navigation */}
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

      {/* 剩余 UI 代码保持不变 (我的订阅/我参与的) ... */}
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
    </View>
  )
}