import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { AtIcon } from 'taro-ui'
import {
  confirmVerifierTicket,
  createVerifier,
  fetchVerifyRecords,
  scanVerifierTicket,
} from '../adapter'
import { VerifyStatus, VerifyTicketItem } from '../types'
import iconBack from '../../../../assets/organizer/icon-back.png'
import { CDN_IMAGES } from '@/utils/cdn'
const powerFlowLogo = CDN_IMAGES.powerFlowLogo
import {
  parseVerifierQrPayload,
  type VerifierScanPayload,
} from '../../../../utils/verifier-scan'
import './index.scss'

const ALLOW_ORGANIZER_DEBUG = false

interface OrganizerVerifyViewProps {
  activityTitle?: string
  verifierName?: string
  initialModalStatus?: VerifyStatus
  initialAddVerifierOpen?: boolean
  initialManualInputOpen?: boolean
  initialScan?: VerifierScanPayload
  onBack: () => void
}

const fallbackCover = powerFlowLogo

const renderTicketCard = (ticket: VerifyTicketItem, onOpenOrder?: (ticket: VerifyTicketItem) => void) => (
  <View
    key={ticket.id}
    className="verify-ticket-card"
    onClick={() => { if (ticket.orderNo || ticket.activityId) onOpenOrder?.(ticket) }}
  >
    <Image className="verify-ticket-cover" src={ticket.cover || fallbackCover} mode="aspectFill" />
    <View className="verify-ticket-info">
      <View className="verify-ticket-row">
        <Text className="verify-ticket-title">{ticket.activityTitle}</Text>
        <Text className="verify-ticket-status">核销成功</Text>
      </View>
      <Text className="verify-ticket-type">{ticket.ticketType} {ticket.quantity}张</Text>
      <Text className="verify-ticket-person">实名信息：{ticket.realName} {ticket.idCard}</Text>
      {!!ticket.buyerPhone && <Text className="verify-ticket-person">手机号：{ticket.buyerPhone}</Text>}
      {!!ticket.verifiedAt && <Text className="verify-ticket-person">核销时间：{ticket.verifiedAt}</Text>}
    </View>
  </View>
)

export default function OrganizerVerifyView(props: OrganizerVerifyViewProps) {
  const { initialAddVerifierOpen = false, initialManualInputOpen = false, initialModalStatus, initialScan, onBack } = props
  const [verifiedTickets, setVerifiedTickets] = useState<VerifyTicketItem[]>([])
  const [verifiedLoading, setVerifiedLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(Boolean(initialModalStatus))
  const [modalStatus, setModalStatus] = useState<VerifyStatus>(initialModalStatus || 'recognized')
  const [scannedTicket, setScannedTicket] = useState<VerifyTicketItem | null>(null)
  const [statusBarHeight, setStatusBarHeight] = useState(44)
  const [addVerifierOpen, setAddVerifierOpen] = useState(initialAddVerifierOpen)
  const [newVerifierName, setNewVerifierName] = useState('')
  const [newVerifierPhone, setNewVerifierPhone] = useState('')
  const [manualInputOpen, setManualInputOpen] = useState(initialManualInputOpen)
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const initialScanHandledRef = useRef('')

  const resetVerifierForm = () => {
    setNewVerifierName('')
    setNewVerifierPhone('')
  }

  const loadVerifiedTickets = async () => {
    setVerifiedLoading(true)
    try {
      const list = await fetchVerifyRecords()
      setVerifiedTickets(list)
    } catch (error: any) {
      setVerifiedTickets([])
      Taro.showToast({ title: error?.message || '核销记录加载失败', icon: 'none' })
    } finally {
      setVerifiedLoading(false)
    }
  }

  useEffect(() => {
    try {
      const sysInfo = Taro.getWindowInfo()
      setStatusBarHeight(sysInfo.statusBarHeight || 44)
    } catch (_) {
      setStatusBarHeight(44)
    }
    void loadVerifiedTickets()
  }, [])

  useEffect(() => {
    if (initialModalStatus) {
      setModalStatus(initialModalStatus)
      setModalVisible(true)
    } else {
      setModalVisible(false)
      setScannedTicket(null)
    }
    setAddVerifierOpen(initialAddVerifierOpen)
    setManualInputOpen(initialManualInputOpen)
  }, [initialAddVerifierOpen, initialManualInputOpen, initialModalStatus])

  const visibleTickets = verifiedTickets.slice(0, 4)
  const verifiedCount = verifiedTickets.length

  // 点击已核销卡片：优先跳订单详情（后端已固定返回 order_no），缺失时回退活动详情
  const handleOpenTicketOrder = (ticket: VerifyTicketItem) => {
    if (ticket.orderNo) {
      Taro.navigateTo({ url: `/pages/order-sub/order-detail/index?orderNo=${encodeURIComponent(ticket.orderNo)}&role=verifier` })
      return
    }
    if (ticket.activityId) {
      Taro.navigateTo({ url: `/pages/activity/index?id=${ticket.activityId}` })
    }
  }

  const processScanPayload = async (payload: VerifierScanPayload) => {
    const result = await scanVerifierTicket(payload)
    setScannedTicket(result.ticket ? { ...result.ticket, status: 'unverified' } : null)
    setModalStatus(result.status || (result.success ? 'recognized' : 'failed'))
    setModalVisible(true)
  }

  useEffect(() => {
    if (!initialScan) return
    const scanKey = `${initialScan.activityId || ''}:${initialScan.qrCode}`
    if (initialScanHandledRef.current === scanKey) return
    initialScanHandledRef.current = scanKey
    setScanning(true)
    Taro.showLoading({ title: '识别中...', mask: true })
    processScanPayload(initialScan)
      .catch((error: any) => {
        Taro.showToast({ title: error?.message || '券码识别失败，请重试', icon: 'none' })
      })
      .finally(() => {
        setScanning(false)
        Taro.hideLoading()
      })
  }, [initialScan])

  const handleScanCode = async () => {
    if (scanning) return
    setScanning(true)
    try {
      const res = await Taro.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode', 'barCode'],
      })
      const payload = parseVerifierQrPayload(res.result)
      if (!payload) {
        Taro.showModal({
          title: '二维码无法核销',
          content: '未识别到有效的 HYPER 入场二维码，请重新扫描订单详情页中的入场码。',
          showCancel: false,
          confirmText: '我知道了',
        })
        return
      }
      await processScanPayload(payload)
    } catch (error: any) {
      const message = String(error?.errMsg || '')
      if (!message.includes('cancel')) {
        Taro.showToast({ title: error?.message || '扫码失败，请重试', icon: 'none' })
      }
    } finally {
      setScanning(false)
    }
  }

  const handleManualVerify = async () => {
    if (!manualCode.trim()) {
      Taro.showToast({ title: '请输入券码', icon: 'none' })
      return
    }
    try {
      const payload = parseVerifierQrPayload(manualCode.trim())
      if (!payload) {
        Taro.showToast({ title: '请输入有效的 TICKET 券码', icon: 'none' })
        return
      }
      await processScanPayload(payload)
      setManualInputOpen(false)
      setManualCode('')
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '核销失败，请重试', icon: 'none' })
    }
  }

  const handleDismissModal = () => {
    setModalVisible(false)
    setScannedTicket(null)
  }

  const handleContinueVerify = () => {
    setModalVisible(false)
    setScannedTicket(null)
    void handleScanCode()
  }

  const handleConfirmRecognized = async () => {
    if (!scannedTicket?.orderNo) {
      Taro.showToast({ title: '订单号缺失，无法核销', icon: 'none' })
      return
    }
    Taro.showLoading({ title: '核销中...', mask: true })
    try {
      await confirmVerifierTicket(scannedTicket.orderNo)
      setModalStatus('success')
      await loadVerifiedTickets()
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '核销失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const handleAddVerifier = async () => {
    if (!newVerifierName.trim()) { Taro.showToast({ title: '请输入核销人员姓名', icon: 'none' }); return }
    if (!newVerifierPhone.trim() || newVerifierPhone.length < 11) { Taro.showToast({ title: '请输入正确的手机号', icon: 'none' }); return }
    Taro.showLoading({ title: '提交中...', mask: true })
    try {
      await createVerifier({ name: newVerifierName.trim(), phone: newVerifierPhone.trim() })
      setAddVerifierOpen(false)
      resetVerifierForm()
      Taro.showToast({ title: '添加成功', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '添加失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const handleClearVerifierForm = () => {
    resetVerifierForm()
  }

  const getModalConfig = () => {
    switch (modalStatus) {
      case 'recognized':
        return {
          icon: 'check-circle', iconColor: '#FFFFFF', title: '识别成功', subtitle: '',
          description: '', buttonText: '确认核销', buttonAction: handleConfirmRecognized, showCancel: false, showTicketStatus: false,
        }
      case 'success':
        return {
          icon: 'check-circle', iconColor: '#FFFFFF', title: '核销成功', subtitle: '',
          description: '', buttonText: '继续核销', buttonAction: handleContinueVerify, showCancel: true, showTicketStatus: true,
        }
      case 'orderNotFound':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '未找到对应订单',
          description: '请确认扫描的是订单详情页中的入场二维码。', buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
      case 'wrongActivity':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '票券不属于当前活动',
          description: '请切换到票券所属活动后重新核销。',
          buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
      case 'alreadyVerified':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '该票券已核销',
          description: '该订单已经完成核销，不能重复操作。',
          buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
      case 'orderCancelled':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '订单已取消或退款',
          description: '该票券当前不可核销。',
          buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
      case 'invalidQr':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '票券不是待使用状态',
          description: '当前订单状态不支持核销。',
          buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
      case 'notVerifiableTime':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '尚未进入核销时间',
          description: '距活动开始超过 24 小时，请在可核销时间内操作。',
          buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
      case 'failed':
        return {
          icon: '', iconColor: '', title: '预检失败', subtitle: '暂时无法核销',
          description: '请稍后重试或联系平台客服。',
          buttonText: '我知道了', buttonAction: handleDismissModal, showCancel: false, showTicketStatus: false,
        }
    }
  }

  const modalConfig = getModalConfig()

  return (
    <View className="verify-page">
      {/* Gradient background layer */}
      <View className="verify-bg-gradient" />

      {/* Status bar */}
      <View className="verify-status-bar" style={{ height: `${statusBarHeight}px` }} />

      {/* Navigation */}
      <View className="verify-nav-box">
        <View className="verify-nav-row">
          <View className="verify-nav-back" onClick={onBack}>
            <Image className="verify-nav-back-img" src={iconBack} mode="aspectFit" />
          </View>
          <Text className="verify-nav-title">订单核销</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="verify-scroll" scrollY enhanced showScrollbar={false}>
        {/* Section header */}
        <View className="verify-section-header">
          <Text className="verify-section-title">已核销（{verifiedCount}）</Text>
          <Text className="verify-section-more">查看更多</Text>
        </View>

        {/* Verified ticket list */}
        {verifiedLoading ? (
          <Text style={{ display: 'block', color: '#747474', padding: '32rpx 40rpx' }}>加载中...</Text>
        ) : visibleTickets.length > 0 ? (
          visibleTickets.map((ticket) => renderTicketCard(ticket, handleOpenTicketOrder))
        ) : (
          <Text style={{ display: 'block', color: '#747474', padding: '32rpx 40rpx' }}>暂无核销记录</Text>
        )}

        <View className="verify-safe-bottom" />
      </ScrollView>

      <View className="verify-bottom-scan-wrap">
        <View className={`verify-scanner-area ${scanning ? 'disabled' : ''}`} onClick={handleScanCode}>
          <View className="verify-scan-glyph">
            <View className="verify-scan-corner tl" />
            <View className="verify-scan-corner tr" />
            <View className="verify-scan-corner bl" />
            <View className="verify-scan-corner br" />
            <View className="verify-scan-line" />
          </View>
        </View>
      </View>

      {/* Success/Failure Modal */}
      {modalVisible && (
        <View className="verify-modal-overlay verify-result-modal-overlay" onClick={handleDismissModal}>
          <View className={`verify-modal-card ${modalStatus}`} onClick={(e) => e.stopPropagation()}>
            {modalConfig.icon ? (
              <View className="verify-modal-icon-row">
                <AtIcon value={modalConfig.icon as any} size={30} color={modalConfig.iconColor} />
                <Text className="verify-modal-title">{modalConfig.title}</Text>
              </View>
            ) : (
              <View className="verify-modal-title-group">
                <Text className="verify-modal-title">{modalConfig.title}</Text>
                <Text className="verify-modal-subtitle">{modalConfig.subtitle}</Text>
              </View>
            )}

            {modalConfig.description ? (
              <Text className="verify-modal-desc">{modalConfig.description}</Text>
            ) : (
              scannedTicket && (
                <View className="verify-modal-ticket">
                  <Image className="verify-ticket-cover" src={scannedTicket.cover} mode="aspectFill" />
                  <View className="verify-ticket-info">
                    <View className="verify-ticket-row">
                      <Text className="verify-ticket-title">{scannedTicket.activityTitle}</Text>
                      {modalConfig.showTicketStatus && <Text className="verify-ticket-status" style={{ marginTop: 0 }}>核销成功</Text>}
                    </View>
                    <Text className="verify-ticket-type">{scannedTicket.ticketType} {scannedTicket.quantity}张</Text>
                    <Text className="verify-ticket-person">实名信息：{scannedTicket.realName} {scannedTicket.idCard}</Text>
                  </View>
                </View>
              )
            )}

            <View className="verify-modal-btn" onClick={modalConfig.buttonAction}>
              <Text className="verify-modal-btn-text">{modalConfig.buttonText}</Text>
            </View>

            {modalConfig.showCancel && (
              <Text className="verify-modal-cancel" onClick={handleDismissModal}>取消</Text>
            )}
          </View>
        </View>
      )}

      {/* Add Verifier Modal */}
      {addVerifierOpen && (
        <View className="verify-modal-overlay" style={{ zIndex: 200 }} onClick={() => setAddVerifierOpen(false)}>
          <View className="add-verifier-card" onClick={(e) => e.stopPropagation()}>
            <View className="add-verifier-header">
              <Text className="add-verifier-title">新增核销员</Text>
              <Text className="add-verifier-close" onClick={() => setAddVerifierOpen(false)}>关闭</Text>
            </View>

            <Text className="add-verifier-label">所属主办方</Text>
            <Text className="add-verifier-org">PURE LOOP</Text>

            <Text className="add-verifier-label">核销人员姓名</Text>
            <View className="add-verifier-input-shell">
              <Input
                className="add-verifier-input"
                placeholder="请输入"
                placeholderClass="dark-placeholder"
                value={newVerifierName}
                onInput={(e) => setNewVerifierName(e.detail.value)}
              />
            </View>

            <Text className="add-verifier-label">手机号</Text>
            <View className="add-verifier-input-shell">
              <Input
                className="add-verifier-input"
                type="number"
                maxlength={11}
                placeholder="请输入"
                placeholderClass="dark-placeholder"
                value={newVerifierPhone}
                onInput={(e) => setNewVerifierPhone(e.detail.value)}
              />
            </View>

            <View className="add-verifier-btns">
              <View className="add-verifier-clear-btn" onClick={handleClearVerifierForm}>
                <Text className="add-verifier-clear-text">清空</Text>
              </View>
              <View className="add-verifier-submit-btn" onClick={handleAddVerifier}>
                <Text className="add-verifier-submit-text">提交</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Manual Input Dialog */}
      {manualInputOpen && (
        <View className="verify-modal-overlay" style={{ zIndex: 200 }} onClick={() => setManualInputOpen(false)}>
          <View className="add-verifier-card" onClick={(e) => e.stopPropagation()}>
            <View className="add-verifier-header">
              <Text className="add-verifier-title">手动输入券码</Text>
              <Text className="add-verifier-close" onClick={() => setManualInputOpen(false)}>关闭</Text>
            </View>

            <Text className="add-verifier-label">请输入券码</Text>
            {ALLOW_ORGANIZER_DEBUG && (
              <Text style={{ fontSize: '22rpx', color: '#747474', marginTop: '8rpx', marginBottom: '8rpx' }}>
                测试券码: 成功任意码 / invalid / reverify / expired
              </Text>
            )}
            <View className="add-verifier-input-shell">
              <Input
                className="add-verifier-input"
                placeholder="请输入券码"
                placeholderClass="dark-placeholder"
                value={manualCode}
                onInput={(e) => setManualCode(e.detail.value)}
              />
            </View>

            <View className="add-verifier-btns">
              <View className="add-verifier-clear-btn" onClick={() => setManualCode('')}>
                <Text className="add-verifier-clear-text">清空</Text>
              </View>
              <View className="add-verifier-submit-btn" onClick={handleManualVerify}>
                <Text className="add-verifier-submit-text">核销</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
