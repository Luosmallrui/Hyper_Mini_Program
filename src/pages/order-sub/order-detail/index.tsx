import {View, Text, Image} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

const posterImage = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'
const qrCodeImage = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ORDER_'

export default function OrderDetailPage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [orderDetail, setOrderDetail] = useState({
    orderNo: '',
    status: 'paid', // paid: 已支付 used: 已使用 refunded: 已退款 cancelled: 已取消
    eventName: 'POWER FLOW成都站',
    eventTime: '2025.01.03-04 星期四 21:30-02:30',
    eventLocation: '高新区盛园街道保利星云湾2栋',
    ticketType: '单人票（赠啤酒1瓶）',
    ticketPrice: 120,
    ticketCount: 1,
    totalAmount: 120,
    createTime: '',
    payTime: '',
    attendee: {
      name: '刘晨',
      idCard: '221***********2524',
      phone: '138****5678'
    }
  })

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)

    const instance = Taro.getCurrentInstance()
    const orderNo = instance.router?.params?.orderNo || `ORD${Date.now()}`

    const now = new Date()
    const payTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const createDate = new Date(now.getTime() - 5 * 60 * 1000)
    const createTime = `${createDate.getFullYear()}-${String(createDate.getMonth() + 1).padStart(2, '0')}-${String(createDate.getDate()).padStart(2, '0')} ${String(createDate.getHours()).padStart(2, '0')}:${String(createDate.getMinutes()).padStart(2, '0')}`

    setOrderDetail(prev => ({
      ...prev,
      orderNo,
      createTime,
      payTime
    }))
  }, [])

  const getStatusConfig = () => {
    const configs = {
      paid: {label: '待使用', color: '#52c41a', icon: 'check-circle'},
      used: {label: '已使用', color: '#9c9c9c', icon: 'check-circle'},
      refunded: {label: '已退款', color: '#ff4d4f', icon: 'close-circle'},
      cancelled: {label: '已取消', color: '#9c9c9c', icon: 'close-circle'}
    }
    return configs[orderDetail.status] || configs.paid
  }

  const handleRefund = () => {
    Taro.showModal({
      title: '申请退款',
      content: '确认要申请退款吗？退款后将按平台规则退还款项。',
      confirmText: '确认退款',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '处理中...'})
          setTimeout(() => {
            Taro.hideLoading()
            Taro.showToast({title: '退款申请已提交', icon: 'success'})
            setOrderDetail(prev => ({...prev, status: 'refunded'}))
          }, 1500)
        }
      }
    })
  }

  const handleSaveQRCode = () => {
    Taro.showToast({title: '长按二维码保存', icon: 'none'})
  }

  const handleContact = () => {
    Taro.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n工作时间：09:00-21:00',
      showCancel: false
    })
  }

  const statusConfig = getStatusConfig()

  return (
    <View className='order-detail-page'>
      <View className='custom-navbar' style={{ top: 0, height: `${statusBarHeight + navBarHeight}px` }}>
        <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
        <View className='navbar-content' style={{ height: `${navBarHeight}px` }}>
          <View className='back-button' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='22' color='#fff'/>
          </View>
          <Text className='navbar-title'>订单详情</Text>
          <View className='navbar-right' />
        </View>
      </View>

      <View className='page-body' style={{ marginTop: `${statusBarHeight + navBarHeight}px` }}>
        <View className='status-card' style={{backgroundColor: `${statusConfig.color}15`}}>
          <View className='status-icon' style={{color: statusConfig.color}}>
            <AtIcon value={statusConfig.icon} size='48' color={statusConfig.color}/>
          </View>
          <View className='status-info'>
            <Text className='status-label' style={{color: statusConfig.color}}>{statusConfig.label}</Text>
            {orderDetail.status === 'paid' && (
              <Text className='status-tip'>请在活动开始前出示二维码入场</Text>
            )}
            {orderDetail.status === 'used' && (
              <Text className='status-tip'>您已成功入场，祝您观演愉快</Text>
            )}
          </View>
        </View>

        {orderDetail.status === 'paid' && (
          <View className='qrcode-card'>
            <Text className='qrcode-title'>入场二维码</Text>
            <View className='qrcode-wrapper'>
              <Image
                className='qrcode-image'
                src={`${qrCodeImage}${orderDetail.orderNo}`}
                mode='aspectFit'
                onClick={handleSaveQRCode}
                showMenuByLongpress
              />
            </View>
            <Text className='qrcode-tip'>请在活动现场出示此二维码</Text>
          </View>
        )}

        <View className='section-card'>
          <View className='section-title'>
            <AtIcon value='file-generic' size='18' color='#cfcfcf'/>
            <Text>活动信息</Text>
          </View>
          <View className='event-block'>
            <Image className='event-poster' src={posterImage} mode='aspectFill'/>
            <View className='event-info'>
              <Text className='event-name'>{orderDetail.eventName}</Text>
              <View className='event-row'>
                <AtIcon value='clock' size='14' color='#8f8f8f'/>
                <Text className='event-text'>{orderDetail.eventTime}</Text>
              </View>
              <View className='event-row'>
                <AtIcon value='map-pin' size='14' color='#8f8f8f'/>
                <Text className='event-text'>{orderDetail.eventLocation}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className='section-card'>
          <View className='section-title'>
            <AtIcon value='bookmark' size='18' color='#cfcfcf'/>
            <Text>票务信息</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>票务类型</Text>
            <Text className='info-value'>{orderDetail.ticketType}</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>票价</Text>
            <Text className='info-value'>￥{orderDetail.ticketPrice}</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>数量</Text>
            <Text className='info-value'>x{orderDetail.ticketCount}</Text>
          </View>
          <View className='info-row total'>
            <Text className='info-label'>实付金额</Text>
            <Text className='info-value price'>￥{orderDetail.totalAmount}</Text>
          </View>
        </View>

        <View className='section-card'>
          <View className='section-title'>
            <AtIcon value='user' size='18' color='#cfcfcf'/>
            <Text>观演人信息</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>姓名</Text>
            <Text className='info-value'>{orderDetail.attendee.name}</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>证件号</Text>
            <Text className='info-value'>{orderDetail.attendee.idCard}</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>手机号</Text>
            <Text className='info-value'>{orderDetail.attendee.phone}</Text>
          </View>
        </View>

        <View className='section-card'>
          <View className='section-title'>
            <AtIcon value='list' size='18' color='#cfcfcf'/>
            <Text>订单信息</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>订单编号</Text>
            <View className='info-value-wrapper'>
              <Text className='info-value mono'>{orderDetail.orderNo}</Text>
              <View
                className='copy-icon'
                onClick={() => {
                  Taro.setClipboardData({
                    data: orderDetail.orderNo,
                    success: () => Taro.showToast({title: '已复制', icon: 'success'})
                  })
                }}
              >
                <AtIcon value='copy' size='14' color='#8f8f8f'/>
              </View>
            </View>
          </View>
          <View className='info-row'>
            <Text className='info-label'>下单时间</Text>
            <Text className='info-value'>{orderDetail.createTime}</Text>
          </View>
          <View className='info-row'>
            <Text className='info-label'>支付时间</Text>
            <Text className='info-value'>{orderDetail.payTime}</Text>
          </View>
        </View>
      </View>

      {orderDetail.status === 'paid' && (
        <View className='bottom-actions'>
          <View className='action-btn secondary' onClick={handleContact}>
            <AtIcon value='phone' size='18' color='#cfcfcf'/>
            <Text>联系客服</Text>
          </View>
          <View className='action-btn danger' onClick={handleRefund}>
            <AtIcon value='reload' size='18' color='#ff4d4f'/>
            <Text>申请退款</Text>
          </View>
        </View>
      )}

      {orderDetail.status === 'used' && (
        <View className='bottom-actions single'>
          <View className='action-btn secondary' onClick={handleContact}>
            <AtIcon value='phone' size='18' color='#cfcfcf'/>
            <Text>联系客服</Text>
          </View>
        </View>
      )}
    </View>
  )
}
