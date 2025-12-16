import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/index.scss'
import {useEffect} from 'react'
import {View, Text, Button} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {setTabBarIndex} from '../../store/tabbar'
import './index.less'

export default function UserPage() {
  useEffect(() => {
    setTabBarIndex(3)
  }, [])

  Taro.useDidShow(() => {
    setTabBarIndex(3)
  })

  const stats = [
    {label: '余额', value: '0.00'},
    {label: '赠送金额', value: '0.00', action: '如何获取'},
    {label: '优惠券', value: '0', action: ''},
    {label: '佣金', value: '0.00', action: '如何获取'}
  ];

  const orderItems = [
    {icon: 'bookmark', label: '全部订单'},
    {icon: 'money', label: '待付款'},
    {icon: 'shopping-bag', label: '待发货'},
    {icon: 'shopping-cart', label: '待收货'}
  ];

  const serviceItems = [
    {icon: 'phone', label: '联系客服'},
    {icon: 'camera', label: '扫一扫'},
    {icon: 'money', label: '优惠券'},
    {icon: 'map-pin', label: '收货地址'}
  ];

  const toolItems = [
    {icon: 'credit-card', label: '充值'},
    {icon: 'star', label: '收藏'},
    {icon: 'money', label: '开具发票'},
    {icon: 'edit', label: '问卷调查'}
  ];

  const businessItems = [
    {icon: 'user', label: '商务合作'},
    {icon: 'message', label: '用户反馈'},
    {icon: 'home', label: '站点'},
    {icon: 'user', label: '跑腿员'}
  ];

  const settingItems = [
    {icon: 'settings', label: '设置'},
    {icon: 'user', label: '代理'},
    {icon: 'user', label: '荟长'},
    {icon: 'user', label: '红人申请'}
  ];

  const handleItemClick = (label: string) => {
    if (label === '全部订单') {
      Taro.navigateTo({
        url: '/order/pages/order/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '待付款') {
      Taro.navigateTo({
        url: '/order/pages/pending-payment/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '待发货') {
      Taro.navigateTo({
        url: '/order/pages/pending-shipment/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '待收货') {
      Taro.navigateTo({
        url: '/order/pages/pending-receipt/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '优惠券') {
      Taro.navigateTo({
        url: '/pages/coupon/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '收货地址') {
      Taro.navigateTo({
        url: '/order/pages/address-edit/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '充值') {
      Taro.navigateTo({
        url: '/pages/recharge/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '收藏') {
      Taro.navigateTo({
        url: '/pages/recharge/index'  // 确保这个路径正确 @@@@@@@有问题需要修改
      })
      return
    }
    if (label === '开具发票') {
      Taro.navigateTo({
        url: '/order/pages/InvoiceRecord/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '问卷调查') {
      Taro.navigateTo({
        url: '/pages/survey/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '商务合作') {
      Taro.navigateTo({
        url: '/pages/cooperation/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '用户反馈') {
      Taro.navigateTo({
        url: '/pages/feedback/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '站点') {
      Taro.navigateTo({
        url: '/pages/SiteApplyModal/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '跑腿员') {
      Taro.navigateTo({
        url: '/pages/errand/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '代理') {
      Taro.navigateTo({
        url: '/pages/agency/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '荟长') {
      Taro.navigateTo({
        url: '/pages/president/index'  // 确保这个路径正确
      })
      return
    }
    if (label === '红人申请') {
      Taro.navigateTo({
        url: '/pages/redperson/index'  // 确保这个路径正确
      })
      return
    }
    Taro.showToast({
      title: `点击了${label}`,
      icon: 'none'
    })
  }


  return (
    <View className='user-page'>
      {/* Header */}
      <View className='header'>
        <View className='header-buttons'>
          <Button className='member-btn normal'>普通会员</Button>
          <Button className='member-btn premium'>会员权益</Button>
        </View>

        <View className='user-info'>
          <View className='avatar'>
            <AtIcon value='user' size='32' color='#666'/>
          </View>
          <View className='user-text'>
            <Text className='username'>微信用户</Text>
          </View>
        </View>
      </View>

      {/* VIP Banner */}
      <View className='vip-banner'>
        <View className='vip-content'>
          <View className='vip-left'>
            <View className='vip-icon'>
              <AtIcon value='gift' size='16' color='#374151'/>
            </View>
            <Text className='vip-text'>开通VIP会员，享专属折扣</Text>
          </View>
          <Button className='vip-button'>立即开通</Button>
        </View>
      </View>

      {/* Stats Cards */}
      <View className='stats-container'>
        <View className='stats-grid'>
          {stats.map((stat, index) => (
            <View key={index} className='stat-item'>
              <Text className='stat-value'>{stat.value}</Text>
              <Text className='stat-label'>{stat.label}</Text>
              {stat.action && (
                <Button
                  className='stat-action'
                  onClick={() => handleItemClick(stat.action)}
                >
                  {stat.action}
                </Button>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Order Section */}
      <View className='section-container'>
        <View className='section-grid'>
          {orderItems.map((item, index) => (
            <View
              key={index}
              className='grid-item'
              onClick={() => handleItemClick(item.label)}
            >
              <View className='item-icon'>
                <AtIcon value={item.icon} size='24' color='#6b7280'/>
              </View>
              <Text className='item-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Service Section */}
      <View className='section-container'>
        <View className='section-grid'>
          {serviceItems.map((item, index) => (
            <View
              key={index}
              className='grid-item'
              onClick={() => handleItemClick(item.label)}
            >
              <View className='item-icon'>
                <AtIcon value={item.icon} size='24' color='#6b7280'/>
              </View>
              <Text className='item-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tools Section */}
      <View className='section-container'>
        <View className='section-grid'>
          {toolItems.map((item, index) => (
            <View
              key={index}
              className='grid-item'
              onClick={() => handleItemClick(item.label)}
            >
              <View className='item-icon'>
                <AtIcon value={item.icon} size='24' color='#6b7280'/>
              </View>
              <Text className='item-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Business Section */}
      <View className='section-container'>
        <View className='section-grid'>
          {businessItems.map((item, index) => (
            <View
              key={index}
              className='grid-item'
              onClick={() => handleItemClick(item.label)}
            >
              <View className='item-icon'>
                <AtIcon value={item.icon} size='24' color='#6b7280'/>
              </View>
              <Text className='item-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings Section */}
      <View className='section-container last-section'>
        <View className='section-grid'>
          {settingItems.map((item, index) => (
            <View
              key={index}
              className='grid-item'
              onClick={() => handleItemClick(item.label)}
            >
              <View className='item-icon'>
                <AtIcon value={item.icon} size='24' color='#6b7280'/>
              </View>
              <Text className='item-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
