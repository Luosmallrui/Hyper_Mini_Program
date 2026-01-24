import {View, Text, Image} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

const posterImage = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'

export default function OrderSuccessPage() {
  const [orderInfo, setOrderInfo] = useState({
    orderNo: '',
    eventName: 'POWER FLOW成都站',
    eventTime: '2025.01.03-04 星期五 21:30-02:30',
    ticketType: '单人票（赠啤酒1瓶）',
    ticketCount: 1,
    totalAmount: 120,
    payTime: ''
  })

  useEffect(() => {
    // 可以从路由参数或全局状态获取订单信息
    const now = new Date()
    const payTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    setOrderInfo(prev => ({
      ...prev,
      orderNo: `ORD${Date.now()}`,
      payTime
    }))
  }, [])

  const handleViewOrder = () => {
    // 跳转到订单详情页
    Taro.navigateTo({
      url: `/pages/order-detail/index?orderNo=${orderInfo.orderNo}`
    })
  }

  const handleBackHome = () => {
    // 返回首页或活动列表
    Taro.switchTab({
      url: '/pages/index/index'
    }).catch(() => {
      // 如果不是 tabbar 页面，使用 reLaunch
      Taro.reLaunch({
        url: '/pages/index/index'
      })
    })
  }

  return (
    <View className='order-success-page'>
      <View className='success-header'>
        <View className='success-icon-wrapper'>
          <AtIcon value='check-circle' size='64' color='#52c41a'/>
        </View>
        <Text className='success-title'>支付成功</Text>
        <Text className='success-subtitle'>您的订单已支付成功，请准时参加活动</Text>
      </View>

      <View className='order-card'>
        <View className='order-header'>
          <Text className='order-label'>订单编号</Text>
          <View className='order-no-wrapper'>
            <Text className='order-no'>{orderInfo.orderNo}</Text>
            <View
              className='copy-btn'
              onClick={() => {
                Taro.setClipboardData({
                  data: orderInfo.orderNo,
                  success: () => {
                    Taro.showToast({title: '已复制', icon: 'success'})
                  }
                })
              }}
            >
              <AtIcon value='copy' size='14' color='#1890ff'/>
            </View>
          </View>
        </View>

        <View className='order-divider'/>

        <View className='event-info'>
          <Image className='event-poster' src={posterImage} mode='aspectFill'/>
          <View className='event-details'>
            <Text className='event-name'>{orderInfo.eventName}</Text>
            <Text className='event-time'>{orderInfo.eventTime}</Text>
          </View>
        </View>

        <View className='order-divider'/>

        <View className='order-items'>
          <View className='order-item'>
            <Text className='item-label'>票务类型</Text>
            <Text className='item-value'>{orderInfo.ticketType}</Text>
          </View>
          <View className='order-item'>
            <Text className='item-label'>购买数量</Text>
            <Text className='item-value'>×{orderInfo.ticketCount}</Text>
          </View>
          <View className='order-item'>
            <Text className='item-label'>支付时间</Text>
            <Text className='item-value'>{orderInfo.payTime}</Text>
          </View>
          <View className='order-item total'>
            <Text className='item-label'>实付金额</Text>
            <Text className='item-value price'>¥{orderInfo.totalAmount}</Text>
          </View>
        </View>
      </View>

      <View className='tips-card'>
        <View className='tips-title'>
          <AtIcon value='alert-circle' size='16' color='#faad14'/>
          <Text>温馨提示</Text>
        </View>
        <View className='tips-content'>
          <Text className='tip-item'>• 请凭订单二维码入场，建议提前截图保存</Text>
          <Text className='tip-item'>• 活动开始前30分钟可入场</Text>
          <Text className='tip-item'>• 如需退票，请在活动开始前24小时申请</Text>
        </View>
      </View>

      <View className='action-buttons'>
        <View className='action-btn secondary' onClick={handleBackHome}>
          <Text>返回首页</Text>
        </View>
        <View className='action-btn primary' onClick={handleViewOrder}>
          <Text>查看订单</Text>
        </View>
      </View>
    </View>
  )
}
