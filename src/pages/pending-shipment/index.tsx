import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import './index.less'

export default function PendingShipmentPage() {
  // 订单状态类型
  type OrderStatus = 'all' | 'unpaid' | 'unsent' | 'received' | 'completed'

  // 当前选中的订单状态
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('unsent')

  // 订单状态标签
  const tabs = [
    { id: 'all', title: '全部' },
    { id: 'unpaid', title: '待付款' },
    { id: 'unsent', title: '待发货' },
    { id: 'received', title: '待收货' },
    { id: 'completed', title: '已完成' }
  ]

  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className='pending-shipment-container'>
      {/* 顶部标题栏 */}
      <View className='header'>
        <View className='back-btn' onClick={handleBack}>
          <Text className='back-icon'>‹</Text>
        </View>
        <Text className='title'>我的订单</Text>
      </View>

      {/* 订单状态标签栏 */}
      <ScrollView scrollX className='tabs-container'>
        {tabs.map((tab) => (
          <View
            key={tab.id}
            className={`tab-item ${activeStatus === tab.id ? 'active' : ''}`}
            onClick={() => setActiveStatus(tab.id as OrderStatus)}
          >
            <Text className='tab-text'>{tab.title}</Text>
            {activeStatus === tab.id && <View className='tab-indicator' />}
          </View>
        ))}
      </ScrollView>

      {/* 订单内容区域 */}
      <View className='content'>
        <View className='empty-state'>
          <View className='empty-icon'>📦</View>
          <Text className='empty-text'>暂无订单</Text>
        </View>
      </View>
    </View>
  )
}
