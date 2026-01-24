import {View, Text, Image, ScrollView} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

const posterImage = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'

const mockOrders = [
  {
    id: '1',
    orderNo: 'ORD1737696000001',
    status: 'paid',
    eventName: 'POWER FLOW成都站',
    eventTime: '2025.01.03-04 星期五 21:30',
    eventLocation: '高新区盛园街道保利星荟云谷5栋1楼',
    poster: posterImage,
    ticketType: '单人票（赠啤酒1瓶）',
    ticketCount: 1,
    totalAmount: 120,
    createTime: '2025-01-24 14:30'
  },
  {
    id: '2',
    orderNo: 'ORD1737609600002',
    status: 'used',
    eventName: '电音狂欢夜',
    eventTime: '2025.01.15 星期三 20:00',
    eventLocation: '武侯区人民南路四段玉林路28号',
    poster: 'https://lanhu-oss-proxy.lanhuapp.com/SketchPng2bf1bf8518557130955cbc32c3282e36ea04ef334da2542d1f7c5fa5e83bac69',
    ticketType: '双人票（赠啤酒2瓶）',
    ticketCount: 2,
    totalAmount: 220,
    createTime: '2025-01-20 16:45'
  },
  {
    id: '3',
    orderNo: 'ORD1737523200003',
    status: 'refunded',
    eventName: 'Hip-Hop之夜',
    eventTime: '2025.01.10 星期五 21:00',
    eventLocation: '锦江区红星路二段95号',
    poster: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/6c2cc88a7b944eb3b55c66ee51532f72_mergeImage.png',
    ticketType: 'VIP畅饮票',
    ticketCount: 1,
    totalAmount: 360,
    createTime: '2025-01-18 10:20'
  },
  {
    id: '4',
    orderNo: 'ORD1737436800004',
    status: 'cancelled',
    eventName: '爵士音乐节',
    eventTime: '2025.01.05 星期日 19:30',
    eventLocation: '青羊区宽窄巷子东广场',
    poster: posterImage,
    ticketType: '单人票',
    ticketCount: 3,
    totalAmount: 360,
    createTime: '2025-01-15 09:15'
  }
]

export default function OrderPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [orders] = useState(mockOrders)

  const tabs = [
    {key: 'all', label: '全部'},
    {key: 'paid', label: '待使用'},
    {key: 'used', label: '已使用'},
    {key: 'refunded', label: '已退款'}
  ]

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders
    return orders.filter(order => order.status === activeTab)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      paid: {label: '待使用', color: '#52c41a', showQR: true, showRefund: true},
      used: {label: '已使用', color: '#999', showQR: false, showRefund: false},
      refunded: {label: '已退款', color: '#ff4d4f', showQR: false, showRefund: false},
      cancelled: {label: '已取消', color: '#999', showQR: false, showRefund: false}
    }
    return configs[status] || configs.paid
  }

  const handleOrderClick = (order) => {
    Taro.navigateTo({
      url: `/pages/order/order-detail/index?orderNo=${order.orderNo}`
    })
  }

  const handleViewQRCode = (e, order) => {
    e.stopPropagation()
    Taro.navigateTo({
      url: `/pages/order/order-detail/index?orderNo=${order.orderNo}`
    })
  }

  const handleRefund = (e) => {
    e.stopPropagation()
    Taro.showModal({
      title: '申请退票',
      content: '确认要申请退票吗？',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({title: '退票申请已提交', icon: 'success'})
        }
      }
    })
  }

  const filteredOrders = getFilteredOrders()

  return (
    <View className='order-page'>
      <View className='page-header'>
        <Text className='page-title'>我的订单</Text>
      </View>

      <View className='tabs-wrapper'>
        <View className='tabs'>
          {tabs.map(tab => (
            <View
              key={tab.key}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text className='tab-label'>{tab.label}</Text>
              {activeTab === tab.key && <View className='tab-indicator'/>}
            </View>
          ))}
        </View>
      </View>

      <ScrollView className='order-list' scrollY>
        {filteredOrders.length === 0 ? (
          <View className='empty-state'>
            <AtIcon value='file-generic' size='80' color='#d9d9d9'/>
            <Text className='empty-text'>暂无订单</Text>
          </View>
        ) : (
          filteredOrders.map(order => {
            const statusConfig = getStatusConfig(order.status)
            return (
              <View
                key={order.id}
                className='order-card'
                onClick={() => handleOrderClick(order)}
              >
                <View className='order-header'>
                  <Text className='order-no'>订单号：{order.orderNo}</Text>
                  <Text className='order-status' style={{color: statusConfig.color}}>
                    {statusConfig.label}
                  </Text>
                </View>

                <View className='order-content'>
                  <Image className='order-poster' src={order.poster} mode='aspectFill'/>
                  <View className='order-info'>
                    <Text className='event-name'>{order.eventName}</Text>
                    <View className='event-detail'>
                      <AtIcon value='clock' size='12' color='#999'/>
                      <Text className='detail-text'>{order.eventTime}</Text>
                    </View>
                    <View className='event-detail'>
                      <AtIcon value='map-pin' size='12' color='#999'/>
                      <Text className='detail-text'>{order.eventLocation}</Text>
                    </View>
                    <View className='ticket-info'>
                      <Text className='ticket-type'>{order.ticketType}</Text>
                      <Text className='ticket-count'>×{order.ticketCount}</Text>
                    </View>
                  </View>
                </View>

                <View className='order-footer'>
                  <View className='price-info'>
                    <Text className='price-label'>实付</Text>
                    <Text className='price-value'>¥{order.totalAmount}</Text>
                  </View>
                  <View className='action-buttons'>
                    {statusConfig.showQR && (
                      <View
                        className='action-btn primary'
                        onClick={(e) => handleViewQRCode(e, order)}
                      >
                        <AtIcon value='image' size='16' color='#fff'/>
                        <Text>查看二维码</Text>
                      </View>
                    )}
                    {statusConfig.showRefund && (
                      <View
                        className='action-btn secondary'
                        onClick={(e) => handleRefund(e)}
                      >
                        <Text>申请退票</Text>
                      </View>
                    )}
                    {!statusConfig.showQR && !statusConfig.showRefund && (
                      <View className='action-btn secondary'>
                        <Text>查看详情</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )
          })
        )}
        <View className='list-footer'>
          <Text className='footer-text'>— 已经到底了 —</Text>
        </View>
      </ScrollView>
    </View>
  )
}
