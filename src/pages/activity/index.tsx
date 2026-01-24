import {View, Text, Image, ScrollView} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useMemo, useState} from 'react'
import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

const heroBg = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPnge4e991c6f61fa48db35927fda9571879ac78f39401f34fee7331ac1ede4da3ae'
const panelBg = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPngeacf5a43f8e5e61293dc16058b03d49843b2a61d439c03d6cbb6a2a8fedac815'
const organizerAvatar = 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/6c2cc88a7b944eb3b55c66ee51532f72_mergeImage.png'
const posterImage = 'https://lanhu-oss-proxy.lanhuapp.com/SketchPng2bf1bf8518557130955cbc32c3282e36ea04ef334da2542d1f7c5fa5e83bac69'
const BASE_URL = 'https://www.hypercn.cn'

const ticketTypes = [
  {id: 'single', label: '单人票（赠啤酒1瓶）', price: 120},
  {id: 'double', label: '双人票（赠啤酒2瓶）', price: 220},
  {id: 'vip', label: '畅饮票（酒水畅饮）', price: 360},
]

export default function ActivityPage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(ticketTypes[0])
  const [ticketCount, setTicketCount] = useState(1)
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)
  }, [])

  const totalPrice = useMemo(() => selectedTicket.price * ticketCount, [selectedTicket, ticketCount])
  const handlePay = async () => {
    if (isPaying) return;

    try {
      setIsPaying(true);
      Taro.showLoading({title: '准备支付...', mask: true});
      const {data: res} = await Taro.request({
        url: `${BASE_URL}/api/v1/pay/prepay`,
        method: 'POST',
        data: {
          openid: "o9Xlk14wugzLZOdwWQ5FwtQOjhxs",
          amount: 1,
          description: "测试商品支付",
          out_trade_no: "test_order_20240124011"
        }
      });

      if (res.code !== 200) {
        throw new Error(res.msg || '获取预支付信息失败');
      }

      const payParams = res.data;

      // 调用微信支付
      await Taro.requestPayment({
        timeStamp: payParams.timestamp,
        nonceStr: payParams.nonce_str,
        package: payParams.package,
        signType: payParams.sign_type as any,
        paySign: payParams.pay_sign,
        success: () => {
          Taro.showToast({title: '支付成功', icon: 'success'});
          // 支付成功后的跳转，比如跳转到订单详情页
          setTimeout(() => {
            Taro.navigateTo({url: '/pages/order-success/index'});
          }, 1500);
        },
        fail: (err) => {
          if (err.errMsg.includes('cancel')) {
            Taro.showToast({title: '支付已取消', icon: 'none'});
          } else {
            Taro.showModal({title: '支付失败', content: err.errMsg, showCancel: false});
          }
        }
      });

    } catch (error) {
      console.error('支付流程出错:', error);
      Taro.showToast({title: error.message || '系统错误', icon: 'none'});
    } finally {
      setIsPaying(false);
      Taro.hideLoading();
    }
  };
  return (
    <View className='activity-page'>
      <View className='hero' style={{backgroundImage: `url(${heroBg})`}}>
        <Image className='status-bar-image' src={posterImage} mode='widthFix'/>
        <View className='custom-nav' style={{
          paddingTop: `${statusBarHeight}px`,
          height: `${navBarHeight}px`,
          paddingRight: `${menuButtonWidth}px`
        }}
        >
          <View className='nav-left' onClick={() => Taro.navigateBack()}>
            <AtIcon value='chevron-left' size='24' color='#fff'/>
          </View>
          <View className='nav-right'>
            <AtIcon value='more' size='18' color='#fff'/>
          </View>
        </View>
      </View>

      <ScrollView className='content-scroll' scrollY>
        <View className='info-panel' style={{backgroundImage: `url(${panelBg})`}}>
          <View className='title-block'>
            <Text className='title'>POWER FLOW成都站</Text>
            <Text className='subtitle'>活动时间：2025.01.03-04 星期五 21:30-02:30</Text>
          </View>

          <View className='location-row'>
            <Text className='location-text'>高新区盛园街道保利星荟5栋1楼</Text>
            <Image className='location-icon'
                   src='https://lanhu-oss-proxy.lanhuapp.com/SketchPng316000f2c1e243cb13f8f16f4b0e0f5612aad100fd961d8166c868613af34ece'
                   mode='aspectFit'
            />
          </View>

          <View className='price-row'>
            <Text className='price'>65¥—128¥</Text>
            <View className='pill muted'>
              <Text>订阅活动</Text>
            </View>
            <View className='pill'>
              <Text>分享活动</Text>
            </View>
          </View>

          <View className='organizer-card'>
            <Image className='organizer-avatar' src={organizerAvatar} mode='aspectFill'/>
            <View className='organizer-info'>
              <Text className='organizer-name'>Pure Loop</Text>
              <Text className='organizer-fans'>5245 粉丝</Text>
            </View>
            <View className='organizer-follow'>
              <Text>已关注</Text>
            </View>
          </View>

          <View className='section-tabs'>
            <Text className='tab active'>活动详情</Text>
            <Text className='tab'>相关活动</Text>
            <Text className='tab'>相关动态</Text>
          </View>

          <Text className='desc'>
            想象一下，嘻哈最根源的韵律之力，接通了电子乐最前沿的高压电流，这就是 Power Flow。
            当这两种力量在同一轨道上交汇、加速、碰撞，便诞生了 Power Flow。它既不属于地下的昏暗，
            也不屈服于主流的浮华。它站在电流与街头的交汇处，构建一个节奏更凶猛、旋律更迷幻、能量更密集的新现实。
          </Text>

          <View className='spacer'/>
        </View>
      </ScrollView>

      <View className='cta-bar'>
        <View className='cta-button' onClick={() => setDrawerOpen(true)}>
          <Text>立即购票</Text>
        </View>
      </View>

      {drawerOpen && (
        <View className='drawer-mask open' onClick={() => setDrawerOpen(false)}>
          <View className='drawer-panel open' onClick={(e) => e.stopPropagation()}>
            <View className='drawer-header'>
              <View className='drawer-title'>
                <Image className='drawer-poster' src={posterImage} mode='aspectFill'/>
                <View className='drawer-info'>
                  <Text className='drawer-name'>POWER FLOW成都站</Text>
                  <Text className='drawer-tag'>有条件退票</Text>
                  <Text className='drawer-time'>时间：2025.01.03-04 星期五 21:30-02:30</Text>
                  <Text className='drawer-place'>地点：高新区盛园街道保利星荟云谷5栋23楼49...</Text>
                  <Text className='drawer-price'>65¥</Text>
                </View>
              </View>
              <View className='drawer-close' onClick={() => setDrawerOpen(false)}>
                <AtIcon value='close' size='16' color='#bbb'/>
              </View>
            </View>

            <View className='ticket-section'>
              <View className='section-row'>
                <Text className='section-title'>票务类型</Text>
                <Text className='section-sub'>（实名购票）</Text>
              </View>
              <View className='ticket-list'>
                {ticketTypes.map(ticket => (
                  <View
                    key={ticket.id}
                    className={`ticket-chip ${selectedTicket.id === ticket.id ? 'active' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <Text>{ticket.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className='count-section'>
              <View className='section-row'>
                <Text className='section-title'>选择数量</Text>
                <Text className='section-sub'>（单人最多限购3张）</Text>
              </View>
              <View className='count-actions'>
                <View className='count-btn' onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}>-</View>
                <View className='count-value'>{ticketCount}</View>
                <View className='count-btn' onClick={() => setTicketCount(ticketCount + 1)}>+</View>
              </View>
            </View>

            <View className='viewer-section'>
              <Text className='section-title'>观演人信息</Text>
              <View className='viewer-item'>
                <Text className='viewer-name'>刘*山 221***********2524</Text>
                <View className='viewer-radio'/>
              </View>
              <View className='viewer-add' onClick={() => Taro.navigateTo({url: '/pages/activity-attendee/index'})}>
                新增观演人
              </View>
            </View>

            <View className='drawer-footer'>
              <View className='total'>
                <Text className='total-label'>合计 ¥{totalPrice}</Text>
                <Text className='total-sub'>共 {ticketCount} 项</Text>
              </View>
              <View className='pay-btn' onClick={handlePay}>立即支付</View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
