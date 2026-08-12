import {View, Text, Image} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {AtIcon} from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

const posterImage = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg'
const qrCodeImage = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='

type DetailStatus = 'pending' | 'paid' | 'used' | 'refundPending' | 'refunding' | 'refunded' | 'refundRejected' | 'cancelled'

interface RefundReason {
  id: number
  label: string
}

interface RefundProgressState {
  refundNo: string
  statusLabel: string
  reason: string
  updatedAt: string
}

interface OrderDetailState {
  orderNo: string
  activityId: number
  refundNo: string
  status: DetailStatus
  eventName: string
  eventTime: string
  eventLocation: string
  eventPoster: string
  ticketType: string
  ticketPrice: number
  ticketCount: number
  totalAmount: number
  createTime: string
  payTime: string
  expireTime: string
  qrCode: string
  attendee: {
    name: string
    idCard: string
    phone: string
  }
}

const pad = (num: number) => String(num).padStart(2, '0')

const getRemaining = (expireTime?: string, now = Date.now()): number => {
  if (!expireTime) return -1
  const diff = new Date(expireTime).getTime() - now
  return diff > 0 ? Math.floor(diff / 1000) : 0
}

const formatRemaining = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const formatDateTime = (value?: string | null) => {
  if (!value) return ''
  // 已删除/下架活动的起止时间可能是零值（0001-01-01），按后端约定展示为 -
  if (String(value).startsWith('0001-')) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const mapRefundStatus = (refundStatus?: string): DetailStatus | null => {
  switch (String(refundStatus || '')) {
    case '0':
    case 'pending_review':
    case 'reviewing':
      return 'refundPending'
    case '1':
    case 'refunding':
    case 'processing':
      return 'refunding'
    case '2':
    case '3':
    case '4':
    case '5':
    case 'refunded':
    case 'completed':
    case 'success':
      return 'refunded'
    case 'cancelled':
      return null
    case 'rejected':
    case 'failed':
    case '6':
      return 'refundRejected'
    default:
      return null
  }
}

const mapOrderStatus = (status: number, refundStatus?: string): DetailStatus => {
  const mappedRefundStatus = mapRefundStatus(refundStatus)
  if (mappedRefundStatus) return mappedRefundStatus
  switch (status) {
    case 0:
      return 'pending'
    case 1:
      return 'paid'
    case 2:
      return 'used'
    case 3:
      return 'cancelled'
    case 4:
      return 'refunding'
    case 5:
      return 'refunded'
    case 6:
      return 'refundRejected'
    default:
      return 'paid'
  }
}

export default function OrderDetailPage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [orderDetail, setOrderDetail] = useState<OrderDetailState>({
    orderNo: '',
    activityId: 0,
    refundNo: '',
    status: 'paid',
    eventName: 'POWER FLOW成都站',
    eventTime: '2025.01.03-04 星期四 21:30-02:30',
    eventLocation: '高新区盛园街道保利星云湾2栋',
    eventPoster: posterImage,
    ticketType: '单人票（赠啤酒1瓶）',
    ticketPrice: 120,
    ticketCount: 1,
    totalAmount: 120,
    createTime: '',
    payTime: '',
    expireTime: '',
    qrCode: '',
    attendee: {
      name: '刘晨',
      idCard: '221***********2524',
      phone: '138****5678'
    }
  })
  const [refundReasons, setRefundReasons] = useState<RefundReason[]>([])
  const [refundProgress, setRefundProgress] = useState<RefundProgressState | null>(null)
  const [refundLoading, setRefundLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [now, setNow] = useState(Date.now())

  // 待支付倒计时：仅展示，后端负责自动取消
  useEffect(() => {
    if (orderDetail.status !== 'pending') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [orderDetail.status])

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)

    const instance = Taro.getCurrentInstance()
    const orderNo = instance.router?.params?.orderNo || instance.router?.params?.order_no || instance.router?.params?.out_trade_no || ''

    const fetchOrderDetail = async () => {
      if (!orderNo) return
      try {
        const res = await request({
          url: `/api/v1/order/${orderNo}`,
          method: 'GET'
        })
        const detail = res?.data?.data
        if (!detail) return
        const refundNo = String(detail.refund_no || detail.refund?.refund_no || detail.refund_order?.refund_no || '')
        const refundStatus = detail.refund_status || detail.refund?.refund_status || detail.refund_order?.refund_status || detail.refund?.status || detail.refund_order?.status
        setOrderDetail({
          orderNo: detail.order_no || String(orderNo),
          activityId: Number(detail.activity?.id || detail.activity_id || 0),
          refundNo,
          status: mapOrderStatus(Number(detail.status), refundStatus),
          eventName: detail.activity?.name || '票务订单',
          eventTime: detail.activity?.start_time && detail.activity?.end_time
            ? `${formatDateTime(detail.activity.start_time)} - ${formatDateTime(detail.activity.end_time)}`
            : formatDateTime(detail.activity?.start_time),
          eventLocation: detail.activity?.address || '',
          eventPoster: detail.activity?.poster_list || posterImage,
          ticketType: detail.ticket_spec?.name || '票券',
          ticketPrice: Number(((detail.actual_price || detail.total_price || 0) / Math.max(Number(detail.quantity || 1), 1) / 100).toFixed(2)),
          ticketCount: Number(detail.quantity || 1),
          totalAmount: Number(((detail.actual_price || detail.total_price || 0) / 100).toFixed(2)),
          createTime: formatDateTime(detail.created_at),
          payTime: formatDateTime(detail.pay_time),
          expireTime: detail.expire_time || '',
          qrCode: detail.qr_code || '',
          attendee: {
            name: detail.buyer_name || '',
            idCard: detail.buyer_id_card || '',
            phone: detail.buyer_phone || ''
          }
        })
        if (refundNo) {
          void fetchRefundDetail(refundNo)
        }
      } catch (error) {
        console.error('Order detail load failed:', error)
        setOrderDetail(prev => ({ ...prev, orderNo: String(orderNo) }))
      }
    }

    fetchOrderDetail()
  }, [])

  const getStatusConfig = () => {
    const configs = {
      paid: {label: '待使用', color: '#52c41a', icon: 'check-circle'},
      pending: {label: '待支付', color: '#faad14', icon: 'clock'},
      used: {label: '已使用', color: '#9c9c9c', icon: 'check-circle'},
      refundPending: {label: '待审核', color: '#faad14', icon: 'clock'},
      refunding: {label: '退款中', color: '#faad14', icon: 'clock'},
      refunded: {label: '已退款', color: '#ff4d4f', icon: 'close-circle'},
      refundRejected: {label: '已驳回', color: '#ff4d4f', icon: 'close-circle'},
      cancelled: {label: '已取消', color: '#9c9c9c', icon: 'close-circle'}
    }
    return configs[orderDetail.status] || configs.paid
  }

  const normalizeRefundReasons = (source: any): RefundReason[] => {
    const list = Array.isArray(source?.list) ? source.list : Array.isArray(source) ? source : []
    return list
      .map((item: any, index: number) => ({
        id: Number(item?.id || item?.reason_id || index + 1),
        label: String(item?.name || item?.title || item?.reason || item?.label || '其他原因')
      }))
      .filter((item: RefundReason) => item.id > 0 && item.label)
  }

  const loadRefundReasons = async () => {
    if (refundReasons.length > 0) return refundReasons
    const reasonsRes = await request({
      url: '/api/v1/refund/reasons',
      method: 'GET'
    })
    const reasons = normalizeRefundReasons(reasonsRes?.data?.data)
    setRefundReasons(reasons)
    return reasons
  }

  const REFUND_STATUS_MAP: Record<number | string, string> = {
    0: '待审核',
    1: '退款中',
    2: '已退款',
    3: '已退款',
    4: '已退款',
    5: '已退款',
    6: '已驳回',
    7: '已取消',
    pending_review: '待审核',
    reviewing: '待审核',
    refunding: '退款中',
    processing: '退款中',
    refunded: '已退款',
    completed: '已退款',
    success: '已退款',
    rejected: '已驳回',
    failed: '已驳回',
    cancelled: '已取消',
  }

  const fetchRefundDetail = async (refundNo: string) => {
    if (!refundNo) return
    try {
      const res = await request({
        url: `/api/v1/refund/${refundNo}`,
        method: 'GET'
      })
      const detail = res?.data?.data
      if (!detail) return
      console.log('[DEBUG] refund detail:', JSON.stringify(detail))
      const statusValue = detail.status ?? detail.refund_status
      const statusLabel = String(
        detail.status_text || detail.status_label || detail.status_name
        || (statusValue !== undefined ? (REFUND_STATUS_MAP[statusValue] || '') : '')
        || '退款处理中'
      )
      setRefundProgress({
        refundNo,
        statusLabel,
        reason: String(detail.reason || detail.reason_name || detail.reason_text || ''),
        updatedAt: formatDateTime(detail.updated_at || detail.created_at || '')
      })
    } catch (error) {
      console.error('退款详情加载失败:', error)
      setRefundProgress({
        refundNo,
        statusLabel: '退款处理中',
        reason: '',
        updatedAt: ''
      })
    }
  }

  const submitRefund = async (reasonId: number) => {
    if (!orderDetail.orderNo) return
    Taro.showLoading({title: '处理中...'})
    try {
      const res = await request({
        url: '/api/v1/refund/apply',
        method: 'POST',
        data: {
          order_no: orderDetail.orderNo,
          reason_id: reasonId
        }
      })
      const refundNo = String(res?.data?.data?.refund_no || res?.data?.data?.refund?.refund_no || orderDetail.refundNo || '')
      setOrderDetail(prev => ({...prev, status: 'refundPending', refundNo}))
      if (refundNo) {
        void fetchRefundDetail(refundNo)
      } else {
        setRefundProgress({
          refundNo: '',
          statusLabel: '待审核',
          reason: refundReasons.find((item) => item.id === reasonId)?.label || '',
          updatedAt: ''
        })
      }
      Taro.showToast({title: '退款申请已提交', icon: 'success'})
    } catch (error: any) {
      Taro.showToast({title: error?.message || '退款申请失败', icon: 'none'})
    } finally {
      Taro.hideLoading()
    }
  }

  const handleRefund = () => {
    Taro.showModal({
      title: '申请退款',
      content: '确认要申请退款吗？退款后将按平台规则退还款项，请继续选择退款原因。',
      confirmText: '选择原因',
      cancelText: '再想想',
      success: async (res) => {
        if (res.confirm) {
          try {
            setRefundLoading(true)
            const reasons = await loadRefundReasons()
            if (reasons.length === 0) {
              throw new Error('暂无可用退款原因')
            }
            const action = await Taro.showActionSheet({
              itemList: reasons.map((item) => item.label)
            })
            const selectedReason = reasons[action.tapIndex]
            if (selectedReason) {
              await submitRefund(selectedReason.id)
            }
          } catch (error: any) {
            if (!String(error?.errMsg || '').includes('cancel')) {
              Taro.showToast({title: error?.message || '退款原因加载失败', icon: 'none'})
            }
          } finally {
            setRefundLoading(false)
          }
        }
      }
    })
  }

  const handleCancelOrder = () => {
    if (!orderDetail.orderNo) return
    Taro.showModal({
      title: '取消订单',
      content: '确认取消该待支付订单吗？取消后将返还已抵扣积分。',
      confirmText: '取消订单',
      confirmColor: '#ff2e4d',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '取消中...', mask: true})
        try {
          const result = await request({
            url: `/api/v1/order/${encodeURIComponent(orderDetail.orderNo)}/cancel`,
            method: 'POST',
            data: { reason_id: 1 }
          })
          const payload = result?.data
          if (payload?.code !== 200) throw new Error(payload?.msg || '取消失败')
          setOrderDetail(prev => ({...prev, status: 'cancelled'}))
          Taro.showToast({title: '已取消', icon: 'success'})
        } catch (error: any) {
          Taro.showToast({title: error?.message || '取消失败，请重试', icon: 'none'})
        } finally {
          Taro.hideLoading()
        }
      }
    })
  }

  const handleContinuePay = async () => {
    if (!orderDetail.orderNo || paying) return
    setPaying(true)
    Taro.showLoading({title: '准备支付...', mask: true})
    try {
      const res = await request({
        url: '/api/v1/pay/prepay',
        method: 'POST',
        data: { order_no: orderDetail.orderNo }
      })
      const payload = res?.data
      if (payload?.code !== 200) throw new Error(payload?.msg || '获取预支付信息失败')
      const payParams = payload.data || {}
      const missingPayFields = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'].filter((field) => !payParams?.[field])
      if (missingPayFields.length > 0) {
        throw new Error(`微信支付参数缺失：${missingPayFields.join('、')}`)
      }
      await Taro.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as any,
        paySign: payParams.paySign,
        success: () => {
          Taro.showToast({title: '支付成功', icon: 'success'})
          setOrderDetail(prev => ({...prev, status: 'paid'}))
          setTimeout(() => {
            Taro.navigateTo({url: `/pages/order-sub/order-pay-success/index?order_no=${payParams.out_trade_no || orderDetail.orderNo}`})
          }, 700)
        },
        fail: (err) => {
          if (err.errMsg?.includes('cancel')) {
            Taro.showToast({title: '支付已取消', icon: 'none'})
          } else {
            Taro.showModal({title: '支付失败', content: err.errMsg || '支付未完成，您可以稍后继续支付', showCancel: false})
          }
        }
      })
    } catch (error: any) {
      const message = String(error?.errMsg || error?.message || '')
      if (!message.includes('cancel')) {
        if (/过期|已取消|不可支付|状态/.test(message)) {
          setOrderDetail(prev => ({...prev, status: 'cancelled'}))
        }
        Taro.showModal({title: '支付失败', content: error?.message || '系统异常，请稍后重试', showCancel: false})
      }
    } finally {
      setPaying(false)
      Taro.hideLoading()
    }
  }

  const handleCancelRefund = () => {
    if (!orderDetail.refundNo) {
      Taro.showToast({title: '缺少退款单号', icon: 'none'})
      return
    }
    Taro.showModal({
      title: '取消退款',
      content: '确认取消当前退款申请吗？取消后订单将恢复为待使用状态。',
      confirmText: '确认取消',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '处理中...'})
        try {
          await request({
            url: `/api/v1/refund/${orderDetail.refundNo}/cancel`,
            method: 'POST'
          })
          setRefundProgress(null)
          setOrderDetail(prev => ({...prev, status: 'paid', refundNo: ''}))
          Taro.showToast({title: '已取消退款', icon: 'success'})
        } catch (error: any) {
          Taro.showToast({title: error?.message || '取消失败', icon: 'none'})
        } finally {
          Taro.hideLoading()
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
            {orderDetail.status === 'refundPending' && (
              <Text className='status-tip'>退款申请已提交，正在等待审核</Text>
            )}
            {orderDetail.status === 'refunding' && (
              <Text className='status-tip'>退款申请已提交，请留意退款进度</Text>
            )}
            {orderDetail.status === 'refunded' && (
              <Text className='status-tip'>退款已完成，票券不可继续使用</Text>
            )}
            {orderDetail.status === 'pending' && (() => {
              const remaining = getRemaining(orderDetail.expireTime, now)
              return remaining > 0 ? (
                <Text className='status-tip'>请在 <Text style={{ color: '#faad14', fontWeight: 600 }}>{formatRemaining(remaining)}</Text> 内完成支付，逾期将自动取消</Text>
              ) : (
                <Text className='status-tip'>订单已超时，请重新下单</Text>
              )
            })()}
          </View>
        </View>

        {(orderDetail.status === 'refundPending' || orderDetail.status === 'refunding' || orderDetail.status === 'refunded' || refundProgress) && (
          <View className='section-card refund-progress-card'>
            <View className='section-title'>
              <AtIcon value='clock' size='18' color='#cfcfcf'/>
              <Text>退款进度</Text>
            </View>
            <View className='info-row'>
              <Text className='info-label'>退款状态</Text>
              <Text className='info-value'>{refundProgress?.statusLabel || statusConfig.label}</Text>
            </View>
            {!!(refundProgress?.refundNo || orderDetail.refundNo) && (
              <View className='info-row'>
                <Text className='info-label'>退款单号</Text>
                <Text className='info-value mono'>{refundProgress?.refundNo || orderDetail.refundNo}</Text>
              </View>
            )}
            {!!refundProgress?.reason && (
              <View className='info-row'>
                <Text className='info-label'>退款原因</Text>
                <Text className='info-value'>{refundProgress.reason}</Text>
              </View>
            )}
            {!!refundProgress?.updatedAt && (
              <View className='info-row'>
                <Text className='info-label'>更新时间</Text>
                <Text className='info-value'>{refundProgress.updatedAt}</Text>
              </View>
            )}
            {(orderDetail.status === 'refundPending' || orderDetail.status === 'refunding') && !!orderDetail.refundNo && (
              <View className='refund-cancel-btn' onClick={handleCancelRefund}>
                <Text>取消退款申请</Text>
              </View>
            )}
          </View>
        )}

        {orderDetail.status === 'paid' && orderDetail.qrCode && (
          <View className='qrcode-card'>
            <Text className='qrcode-title'>入场二维码</Text>
            <View className='qrcode-wrapper'>
              <Image
                className='qrcode-image'
                src={`${qrCodeImage}${encodeURIComponent(orderDetail.qrCode)}`}
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
            <Image className='event-poster' src={orderDetail.eventPoster || posterImage} mode='aspectFill'/>
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
          <View className={`action-btn danger ${refundLoading ? 'disabled' : ''}`} onClick={handleRefund}>
            <AtIcon value='reload' size='18' color='#ff4d4f'/>
            <Text>{refundLoading ? '处理中' : '申请退款'}</Text>
          </View>
        </View>
      )}

      {orderDetail.status === 'pending' && (
        <View className='bottom-actions'>
          <View className='action-btn secondary' onClick={handleCancelOrder}>
            <AtIcon value='close' size='18' color='#cfcfcf'/>
            <Text>取消订单</Text>
          </View>
          <View className={`action-btn primary ${paying ? 'disabled' : ''}`} onClick={handleContinuePay}>
            <AtIcon value='credit-card' size='18' color='#fff'/>
            <Text>{paying ? '支付中' : '继续支付'}</Text>
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
