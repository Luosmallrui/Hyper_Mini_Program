import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/index.scss'
import React, { useEffect, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setTabBarIndex } from '../../store/tabbar'
import './index.scss'

export default function UserPage() {
  // 状态管理
  const [isLogin, setIsLogin] = useState(false) // 是否已登录
  const [userInfo, setUserInfo] = useState<any>({}) // 用户信息
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false) // 是否需要授权手机号

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

      // 假设 res.data.data 包含用户信息，具体根据你的后端结构调整
      const userData = res.data.data || res.data 
      
      // 逻辑判断：如果后端返回的数据中包含手机号
      if (userData && userData.phone) {
        setUserInfo(userData)
        setIsLogin(true)
        setNeedPhoneAuth(false)
        Taro.showToast({ title: '登录成功', icon: 'success' })
      } else {
        // 如果没有手机号，设置状态，界面上的按钮会变成“授权手机号”
        setNeedPhoneAuth(true)
        Taro.showToast({ title: '请授权手机号以完成注册', icon: 'none' })
      }

    } catch (err) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  // 第二步：获取手机号并绑定
  const onGetPhoneNumber = async (e: any) => {
    console.log('getPhoneNumber event:', e)

    if (!e.detail?.code) {
      console.log('用户拒绝或环境不对')
      Taro.showToast({ title: '需要授权手机号才能继续', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '绑定中...' })

    try {
      const res = await Taro.request({
        url: 'https://hyperfun.com.cn/api/auth/bind-phone',
        method: 'POST',
        data: {
          phone_code: e.detail.code
        }
      })

      console.log('绑定手机号返回:', res.data)
      Taro.hideLoading()

      // 绑定成功后，设置为登录状态
      // 假设后端返回了完整的用户信息
      setUserInfo(res.data.data || res.data) 
      setIsLogin(true)
      setNeedPhoneAuth(false)
      Taro.showToast({ title: '登录成功', icon: 'success' })

    } catch (err) {
      Taro.hideLoading()
      console.error(err)
      Taro.showToast({ title: '绑定失败', icon: 'none' })
    }
  }

  // 模拟数据 - 对应图片中的 "关注 23 | 粉丝 115 | 赞/收藏 25"
  const stats = [
    { label: '关注', value: isLogin ? '23' : '-' },
    { label: '粉丝', value: isLogin ? '115' : '-' },
    { label: '赞/收藏', value: isLogin ? '25' : '-' },
  ];

  // 对应图片中间的一排圆形入口 (订单、钱包、票务、积分、主办中心)
  const mainNavItems = [
    { icon: 'list', label: '订单', action: '全部订单' },
    { icon: 'sketch', label: '钱包', action: '充值' },
    { icon: 'tag', label: '票务', action: '优惠券' }, // 暂用优惠券逻辑
    { icon: 'star', label: '积分', action: '积分' },
    { icon: 'home', label: '主办中心', action: '站点' },
  ];

  const handleItemClick = (label: string) => {
    if (!isLogin && label !== '设置') {
       Taro.showToast({title: '请先登录', icon: 'none'})
       return
    }

    // 保持原有的跳转逻辑
    const routes: {[key: string]: string} = {
      '全部订单': '/order/pages/order/index',
      '待付款': '/order/pages/pending-payment/index',
      '待发货': '/order/pages/pending-shipment/index',
      '待收货': '/order/pages/pending-receipt/index',
      '优惠券': '/pages/coupon/index',
      '收货地址': '/order/pages/address-edit/index',
      '充值': '/pages/recharge/index',
      '收藏': '/pages/collection/index',
      '开具发票': '/order/pages/InvoiceRecord/index',
      '问卷调查': '/pages/survey/index',
      '商务合作': '/pages/cooperation/index',
      '用户反馈': '/pages/feedback/index',
      '站点': '/pages/SiteApplyModal/index',
      '跑腿员': '/pages/errand/index',
      '代理': '/pages/agency/index',
      '荟长': '/pages/president/index',
      '红人申请': '/pages/redperson/index'
    }

    if (routes[label]) {
      Taro.navigateTo({ url: routes[label] })
    } else {
      Taro.showToast({ title: `点击了${label}`, icon: 'none' })
    }
  }

  return (
    <View className='user-page'>
      {/* Top Header Section */}
      <View className='header-section'>
        {/* User Info Row */}
        <View className='user-profile'>
          <View className='avatar-container'>
            {isLogin && userInfo.avatarUrl ? (
               <Image className='avatar-img' src={userInfo.avatarUrl} />
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
                  <Text className='username'>{userInfo.nickName || '邪修的马路路'}</Text>
                  <View className='vip-tag'>
                    <Text className='vip-text'>黄金会员</Text>
                  </View>
                </View>
                <Text className='user-id'>ID: {userInfo.id || '231255123123'}</Text>
              </>
            ) : (
              <View className='login-actions'>
                <Text className='welcome-text'>欢迎来到HyperFun</Text>
                
                {/* 登录逻辑核心按钮 */}
                {needPhoneAuth ? (
                  <Button 
                    className='login-btn phone-btn'
                    openType="getPhoneNumber"
                    onGetPhoneNumber={onGetPhoneNumber}
                  >
                    点击授权手机号
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
          
          {/* 右上角设置/扫描等图标 */}
          <View className='header-tools'>
             <AtIcon value='streaming' size='20' color='#333' className='tool-icon'/>
             <AtIcon value='fullscreen' size='20' color='#333' className='tool-icon'/>
          </View>
        </View>

        {/* Stats Row (Following/Fans/Likes) */}
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

      {/* Main Circular Navigation (White Card) */}
      <View className='main-nav-card'>
        {mainNavItems.map((item, index) => (
          <View key={index} className='nav-item' onClick={() => handleItemClick(item.action)}>
             <View className='nav-icon-circle'>
               {/* 这里使用 AtIcon 模拟，实际开发可以用 Image 替换为彩色图标 */}
               <AtIcon value={item.icon} size='24' color='#999' />
             </View>
             <Text className='nav-text'>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* "My Subscription" / Orders Section */}
      <View className='section-card'>
         <View className='section-header'>
            <View className='tab-active'>
               <Text>我的订阅</Text>
            </View>
            <View className='tab-inactive'>
               <Text>动态</Text>
            </View>
            <Text className='section-extra'>3个活动进行中</Text>
         </View>
         
         <View className='scroll-row'>
            {/* 模拟的横向滚动卡片 */}
            {[1, 2, 3, 4].map((i) => (
               <View key={i} className='activity-card'>
                  <View className={`status-tag ${i===4 ? 'ended' : 'active'}`}>
                     <Text>{i===4 ? '已结束' : '进行中'}</Text>
                  </View>
               </View>
            ))}
         </View>
      </View>

      {/* "My Participation" Section */}
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