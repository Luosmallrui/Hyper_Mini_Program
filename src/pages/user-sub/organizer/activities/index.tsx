import { useEffect, useRef, useState } from 'react'
import { Button, Image, Input, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import activationDouyinQr from '../../../../assets/organizer/activation-douyin-qr.png'
import activationWechatQr from '../../../../assets/organizer/activation-wechat-qr.png'
import { ACTIVITY_TABS, FILTER_AUDIT_OPTIONS, FILTER_LIFE_OPTIONS, CHANNEL_LABEL_MAP } from '../constants'
import {
  deleteVerifier,
  fetchVerifierActivationQr,
  fetchVerifiers,
  updateVerifierStatus,
} from '../adapter'
import {
  ActivityFilterState,
  Channel,
  OrganizerActivityItem,
  OrganizerActivityTab,
  OrganizerAuditStatus,
  OrganizerActivityLifeStatus,
  OrganizerOrderItem,
  OrganizerSalesSummary,
  PageDataState,
  VerifierItem,
} from '../types'

interface OrganizerActivitiesViewProps {
  activityItems: OrganizerActivityItem[]
  activityKeyword: string
  activityTab: OrganizerActivityTab
  filteredActivities: OrganizerActivityItem[]
  orderItems: OrganizerOrderItem[]
  ordersLoading: boolean
  orderWithdrawStatus: string
  onChangeOrderWithdrawStatus: (value: string) => void
  orderSalesChannel: string
  onChangeOrderSalesChannel: (value: string) => void
  salesSummary: OrganizerSalesSummary
  pageState: PageDataState
  onRetry: () => void
  onChangeTab: (tab: OrganizerActivityTab) => void
  onChangeKeyword: (value: string) => void
  onOpenCreateWizard: () => void
  onOpenActivityDetail: (activityId: string) => void
  onEditActivity: (activityId: string) => void
  onRefresh: () => void
  refreshing: boolean
  filterPanelOpen: boolean
  filterState: ActivityFilterState
  onToggleFilterPanel: () => void
  onToggleAudit: (status: OrganizerAuditStatus) => void
  onToggleChannel: (channel: Channel) => void
  onToggleLife: (status: OrganizerActivityLifeStatus) => void
  onResetFilter: () => void
  onApplyFilter: () => void
  getDisplayStatus: (item: OrganizerActivityItem) => { label: string; color: string }
  onOpenCalendar: () => void
  calendarStart: string
  calendarEnd: string
  initialActivationFlowOpen?: boolean
}

const renderCheckbox = (checked: boolean) => (
  <View className={`filter-checkbox ${checked ? 'checked' : ''}`}>
    {checked && <Text style={{ color: '#fff', fontSize: 10, lineHeight: '14px' }}>✓</Text>}
  </View>
)

const renderActivityList = (
  filteredActivities: OrganizerActivityItem[],
  onOpenCreateWizard: () => void,
  onOpenActivityDetail: (activityId: string) => void,
  onEditActivity: (activityId: string) => void,
  getDisplayStatus: (item: OrganizerActivityItem) => { label: string; color: string },
) => {
  if (filteredActivities.length === 0) {
    return (
      <View className="empty-activities">
        <Text className="empty-title">暂无活动</Text>
        <Button className="primary-pill-button" onClick={onOpenCreateWizard}>
          新增活动
        </Button>
      </View>
    )
  }

  return (
    <View className="activity-card-list">
      {filteredActivities.map((item) => {
        const displayStatus = getDisplayStatus(item)
        const isPublishedUp = item.auditStatus === 'approved' && item.lifeStatus === 'up'
        const isRejected = item.auditStatus === 'rejected'
        const hasPendingRevision = Boolean(item.hasPendingRevision)
        return (
          <View
            key={item.id}
            className={`activity-item-card ${isRejected ? 'rejected' : ''} ${isPublishedUp ? 'published' : ''}`}
            onClick={() => onOpenActivityDetail(item.id)}
          >
            <Image className="activity-item-cover" src={item.cover} mode="aspectFill" />
            <View className="activity-item-content">
              <Text className="activity-item-title">{item.title}</Text>
              {isPublishedUp && !hasPendingRevision ? (
                <>
                  <Text className="activity-item-meta">上架时间：{item.publishedAt}</Text>
                  <Text className="activity-item-meta">活动时间：{item.eventTime}</Text>
                </>
              ) : (
                <>
                  <Text className="activity-item-status" style={{ color: displayStatus.color }}>
                    {displayStatus.label}
                  </Text>
                  <Text className="activity-item-meta">
                    {item.auditStatus === 'rejected'
                      ? item.rejectReason ? `原因：${item.rejectReason}` : ''
                      : hasPendingRevision && item.pendingRevisionReason
                        ? `原因：${item.pendingRevisionReason}`
                        : item.eventTime ? `活动时间：${item.eventTime}` : item.publishedAt ? `上架时间：${item.publishedAt}` : ''}
                  </Text>
                </>
              )}
            </View>
            {isPublishedUp || isRejected ? (
              <View
                className="activity-edit-pill"
                onClick={(event) => {
                  event.stopPropagation()
                  if (isRejected) onOpenActivityDetail(item.id)
                  else onEditActivity(item.id)
                }}
              >
                <Text className="activity-edit-text">编辑</Text>
              </View>
            ) : (
              <View style={{ paddingRight: 12, alignSelf: 'center' }}>
                <AtIcon value="chevron-right" size={17} color="#8A8A8A" />
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const formatYuanAmount = (value: number) => {
  const normalized = Number.isFinite(value) ? value : 0
  const text = Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2)
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const renderSalesView = (salesSummary: OrganizerSalesSummary) => (
  <View className="data-panel">
    <View className="sales-summary-grid">
      <View className="sales-summary-card">
        <Text className="sales-summary-label">活动成交额</Text>
        <Text className="sales-summary-value">¥{formatYuanAmount(salesSummary.totalSales)}</Text>
      </View>
      <View className="sales-summary-card">
        <Text className="sales-summary-label">客单价</Text>
        <Text className="sales-summary-value">¥{formatYuanAmount(salesSummary.averageOrderValue)}</Text>
      </View>
      <View className="sales-summary-card">
        <Text className="sales-summary-label">转化率</Text>
        <Text className="sales-summary-value">{((salesSummary.conversionRate || 0) * 100).toFixed(2)}%</Text>
        <Text className="sales-summary-sub">浏览 {salesSummary.viewCount || 0} · 访客 {salesSummary.visitorCount || 0}</Text>
      </View>
    </View>
    <View className="data-list-card">
      <Text className="data-list-title">活动销售排行</Text>
      {salesSummary.activityRanking.map((item, index) => (
        <View key={item.activityId || item.title} className="data-list-row">
          <Text className="data-list-rank">0{index + 1}</Text>
          <View className="data-list-main">
            <Text className="data-list-name">{item.title}</Text>
            <Text className="data-list-sub">销售额 ¥{formatYuanAmount(item.sales)}</Text>
          </View>
          <Text className="data-list-side">{item.orders} 单 · 转化 {((item.conversionRate || 0) * 100).toFixed(1)}%</Text>
        </View>
      ))}
    </View>
  </View>
)

const renderSalesEmpty = () => (
  <View className="empty-activities">
    <Text className="empty-title">暂无活动</Text>
    <Button className="primary-pill-button">新增活动</Button>
  </View>
)

const renderOrdersEmpty = () => (
  <View className="empty-activities">
    <Text className="empty-title">暂无订单</Text>
  </View>
)

const WITHDRAW_STATUS_OPTIONS = [
  { value: '', label: '提现状态' },
  { value: 'available', label: '可提现' },
  { value: 'pending_withdraw', label: '提现审核中' },
  { value: 'withdrawn', label: '已提现' },
]

const SALES_CHANNEL_OPTIONS = [
  { value: '', label: '销售渠道' },
  { value: 'wechat', label: '微信' },
  { value: 'douyin', label: '抖音' },
  { value: 'web', label: '网页' },
  { value: 'other', label: '其他' },
]

const SALES_CHANNEL_LABELS: Record<string, string> = {
  wechat: '微信',
  douyin: '抖音',
  web: '网页',
  other: '其他',
}

const WITHDRAW_STATUS_LABELS: Record<string, string> = {
  available: '可提现',
  pending_withdraw: '提现审核中',
  withdrawn: '已提现',
  unavailable: '不可提现',
}

const ORDER_STATUS_LABELS: Record<OrganizerOrderItem['status'], string> = {
  paid: '已支付',
  used: '已核销',
  refunding: '退款中',
  pending: '待支付',
  cancelled: '已取消',
}

const renderOrdersView = (orders: OrganizerOrderItem[], onOpenOrder: (item: OrganizerOrderItem) => void) => (
  <View className="data-panel">
    {orders.map((item) => (
      <View key={item.id} className="order-card-v2" onClick={() => onOpenOrder(item)}>
        <View className="order-card-v2-top">
          <Text className="order-title-v2">{item.activityTitle || '活动订单'}</Text>
          <Text className="order-amount-v2">¥{item.amount}</Text>
        </View>
        <View className="order-card-v2-mid">
          <Text className="order-ticket-v2">{item.ticketType}{item.quantity ? ` ×${item.quantity}` : ''}</Text>
          <Text className={`order-status-badge ${item.status}`}>{ORDER_STATUS_LABELS[item.status]}</Text>
        </View>
        <View className="order-card-v2-meta">
          <Text className="order-meta-text">{item.buyerName}</Text>
          {!!item.salesChannel && (
            <Text className="order-meta-text"> · {SALES_CHANNEL_LABELS[item.salesChannel] || item.salesChannel}</Text>
          )}
          {!!item.createdAt && <Text className="order-meta-text"> · {item.createdAt}</Text>}
        </View>
        <View className="order-card-v2-bottom">
          {item.withdrawStatus ? (
            <Text className="order-withdraw-chip">
              {WITHDRAW_STATUS_LABELS[item.withdrawStatus] || item.withdrawStatus}
              {typeof item.withdrawAmount === 'number' && item.withdrawAmount > 0
                ? ` ¥${formatYuanAmount(item.withdrawAmount / 100)}`
                : ''}
            </Text>
          ) : <View />}
          <Text className="order-no-v2">订单号 {item.id}</Text>
        </View>
      </View>
    ))}
  </View>
)

const renderOrderDetailRow = (label: string, value: string, extra?: any) => (
  <View className="order-detail-row">
    <Text className="order-detail-label">{label}</Text>
    <View className="order-detail-value-wrap">
      <Text className="order-detail-value">{value}</Text>
      {extra}
    </View>
  </View>
)

/** 订单详情底部弹层：完整字段 + 复制订单号 + 跳活动详情 */
const renderOrderDetailModal = (
  order: OrganizerOrderItem,
  onClose: () => void,
  onOpenActivity: (order: OrganizerOrderItem) => void,
) => (
  <View className="order-detail-overlay" onClick={onClose}>
    <View
      className="order-detail-card"
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <View className="order-detail-header">
        <Text className="order-detail-title">订单详情</Text>
        <Text className="order-detail-close" onClick={onClose}>×</Text>
      </View>

      {order.poster ? (
        <Image className="order-detail-poster" src={order.poster} mode="aspectFill" />
      ) : null}

      {renderOrderDetailRow('活动名称', order.activityTitle || '活动订单')}
      {renderOrderDetailRow('票券', `${order.ticketType}${order.quantity ? ` ×${order.quantity}` : ''}`)}
      {renderOrderDetailRow('实付金额', `¥${order.amount}`)}
      {renderOrderDetailRow('订单状态', ORDER_STATUS_LABELS[order.status])}
      {renderOrderDetailRow('买家', order.buyerName)}
      {!!order.buyerPhone && renderOrderDetailRow('手机号', order.buyerPhone)}
      {!!order.salesChannel && renderOrderDetailRow('销售渠道', SALES_CHANNEL_LABELS[order.salesChannel] || order.salesChannel)}
      {!!order.createdAt && renderOrderDetailRow('支付时间', order.createdAt)}
      {!!order.verifiedAt && renderOrderDetailRow('核销时间', order.verifiedAt)}
      {!!order.withdrawStatus && renderOrderDetailRow(
        '提现状态',
        `${WITHDRAW_STATUS_LABELS[order.withdrawStatus] || order.withdrawStatus}${typeof order.withdrawAmount === 'number' && order.withdrawAmount > 0 ? ` ¥${formatYuanAmount(order.withdrawAmount / 100)}` : ''}`,
      )}
      {renderOrderDetailRow(
        '订单号',
        order.id,
        <Text
          className="order-detail-copy"
          onClick={() => {
            Taro.setClipboardData({
              data: order.id,
              success: () => Taro.showToast({ title: '已复制', icon: 'success' }),
            })
          }}
        >
          复制
        </Text>,
      )}

      {!!order.activityId && (
        <View className="order-detail-activity-btn" onClick={() => onOpenActivity(order)}>
          <Text className="order-detail-activity-btn-text">查看活动详情</Text>
        </View>
      )}
    </View>
  </View>
)
const renderActivationDownloadIcon = () => (
  <View className="activation-download-icon">
    <View className="activation-download-stem" />
    <View className="activation-download-arrow" />
    <View className="activation-download-tray" />
  </View>
)

const renderActivationQrBlock = (src: string, label: string) => (
  <View className="activation-qr-block">
    <Image className="activation-qr-image" src={src} mode="aspectFit" />
    <View className="activation-qr-caption">
      <Text>{label}</Text>
      {renderActivationDownloadIcon()}
    </View>
  </View>
)

const renderActivationFlowModal = (
  verifier: VerifierItem,
  activationQr: { wechatQrUrl: string; douyinQrUrl: string } | null,
  activationQrLoading: boolean,
  onClose: () => void,
) => (
  <View className="activation-flow-overlay" onClick={onClose}>
    <View
      className="activation-flow-card"
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <View className="activation-flow-header">
        <Text className="activation-flow-title">激活核销员</Text>
        <Text className="activation-flow-close" onClick={onClose}>×</Text>
      </View>
      {/* 接口返回图片 URL 时优先展示；若返回的是 scene/深链文本（非图片地址）则回退到静态示例图 */}
      {renderActivationQrBlock(activationQr?.wechatQrUrl || activationWechatQr, '微信二维码')}
      {renderActivationQrBlock(activationQr?.douyinQrUrl || activationDouyinQr, '抖音二维码')}
      <Text className="activation-flow-desc">
        {activationQrLoading
          ? '激活码加载中...'
          : `请下载链接或二维码并联系核销员分别使用微信及抖音扫码，输入对应手机号（${verifier.phone}）完成激活。`}
      </Text>
      <View className="activation-flow-done" onClick={onClose}>
        <Text>完成</Text>
      </View>
    </View>
  </View>
)

const renderVerifierView = (
  verifiers: VerifierItem[],
  loading: boolean,
  onOpenActivationFlow: (item: VerifierItem) => void,
  onToggleStatus: (item: VerifierItem) => void,
  onDelete: (item: VerifierItem) => void,
) => {
  if (loading) {
    return (
      <View className="empty-activities">
        <Text className="empty-title">加载中...</Text>
      </View>
    )
  }
  if (verifiers.length === 0) {
    return (
      <View className="empty-activities">
        <Text className="empty-title">暂无核销员</Text>
      </View>
    )
  }
  return (
    <View className="data-panel">
      {verifiers.map((item) => {
        // 名字与手机号相同（注册时未填名字）时不重复展示
        const displayName = item.name && item.name !== item.phone ? item.name : '核销员'
        return (
          <View key={item.id} className="verifier-card-new">
            <View className="verifier-card-head">
              <View className="verifier-head-main">
                <Text className="verifier-name">{displayName}</Text>
                <Text className="verifier-phone">{item.phone || '-'}</Text>
                {!!item.createdAt && <Text className="verifier-created">添加于 {item.createdAt}</Text>}
              </View>
              <View className={`verifier-status-badge ${item.inviteStatus}`}>
                <View className="verifier-status-dot" />
                <Text className="verifier-status-badge-text">{item.inviteStatus === 'active' ? '已激活' : '未激活'}</Text>
              </View>
            </View>

            <View className="verifier-chip-row">
              <View className="verifier-chip">
                <Text className="verifier-chip-text">权限范围 · {item.permissionScope}</Text>
              </View>
              <View className={`channel-capsule ${item.channel}`}>
                <Text>{CHANNEL_LABEL_MAP[item.channel]}</Text>
              </View>
              {typeof item.verifiedCount === 'number' && (
                <View className="verifier-chip">
                  <Text className="verifier-chip-text">累计核销 {item.verifiedCount}</Text>
                </View>
              )}
            </View>

            <View className="verifier-card-actions">
              <Text
                className="verifier-action-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleStatus(item)
                }}
              >
                {item.inviteStatus === 'active' ? '停用' : '启用'}
              </Text>
              <Text
                className="verifier-action-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenActivationFlow(item)
                }}
              >
                激活流程
              </Text>
              <Text
                className="verifier-action-btn danger"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(item)
                }}
              >
                删除
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default function OrganizerActivitiesView(props: OrganizerActivitiesViewProps) {
  const {
    activityKeyword,
    activityTab,
    filteredActivities,
    orderItems,
    ordersLoading,
    orderWithdrawStatus,
    onChangeOrderWithdrawStatus,
    orderSalesChannel,
    onChangeOrderSalesChannel,
    salesSummary,
    pageState,
    onRetry,
    onChangeTab,
    onChangeKeyword,
    onOpenCreateWizard,
    onOpenActivityDetail,
    onEditActivity,
    onRefresh,
    refreshing,
    filterPanelOpen,
    filterState,
    onToggleFilterPanel,
    onToggleAudit,
    onToggleLife,
    onResetFilter,
    onApplyFilter,
    getDisplayStatus,
    onOpenCalendar,
    calendarStart,
    calendarEnd,
    initialActivationFlowOpen,
  } = props
  const [activationVerifier, setActivationVerifier] = useState<VerifierItem | null>(null)
  const [detailOrder, setDetailOrder] = useState<OrganizerOrderItem | null>(null)
  const [verifiers, setVerifiers] = useState<VerifierItem[]>([])
  const [verifiersLoading, setVerifiersLoading] = useState(false)
  const [activationQr, setActivationQr] = useState<{ wechatQrUrl: string; douyinQrUrl: string } | null>(null)
  const [activationQrLoading, setActivationQrLoading] = useState(false)
  const hasOpenedInitialActivation = useRef(false)

  const loadVerifiers = async () => {
    setVerifiersLoading(true)
    try {
      const list = await fetchVerifiers()
      setVerifiers(list)
    } catch {
      Taro.showToast({ title: '核销员列表加载失败', icon: 'none' })
    } finally {
      setVerifiersLoading(false)
    }
  }

  // 订单详情弹层：跳转活动详情页（已下架活动由详情页展示下架态）
  const handleOpenOrderActivity = (order: OrganizerOrderItem) => {
    if (!order.activityId) return
    setDetailOrder(null)
    Taro.navigateTo({ url: `/pages/activity/index?id=${order.activityId}` })
  }

  const handleOpenActivationFlow = (item: VerifierItem) => {    setActivationVerifier(item)
    setActivationQr(null)
    setActivationQrLoading(true)
    fetchVerifierActivationQr(item.id)
      .then(setActivationQr)
      .catch(() => {
        // 获取失败或非图片地址时保持静态示例图兜底
      })
      .finally(() => setActivationQrLoading(false))
  }

  const handleToggleVerifierStatus = async (item: VerifierItem) => {
    const nextStatus = item.inviteStatus === 'active' ? 0 : 1
    try {
      await updateVerifierStatus(item.id, nextStatus)
      Taro.showToast({ title: nextStatus === 1 ? '核销员已启用' : '核销员已停用', icon: 'none' })
      void loadVerifiers()
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '状态更新失败，请重试', icon: 'none' })
    }
  }

  const handleDeleteVerifier = (item: VerifierItem) => {
    Taro.showModal({
      title: '删除核销员',
      content: `确定删除核销员「${item.name}」吗？`,
      confirmText: '删除',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteVerifier(item.id)
          Taro.showToast({ title: '核销员已删除', icon: 'none' })
          void loadVerifiers()
        } catch (error: any) {
          Taro.showToast({ title: error?.message || '删除失败，请重试', icon: 'none' })
        }
      },
    })
  }

  useEffect(() => {
    if (activityTab !== 'verifiers') return
    void loadVerifiers()
  }, [activityTab])

  useEffect(() => {
    if (!initialActivationFlowOpen || hasOpenedInitialActivation.current || activityTab !== 'verifiers') return
    if (verifiersLoading || verifiers.length === 0) return
    const firstVerifier = verifiers[0]
    hasOpenedInitialActivation.current = true
    handleOpenActivationFlow(firstVerifier)
  }, [activityTab, initialActivationFlowOpen, verifiers, verifiersLoading])

  const hasFilterSelection = (
    filterState.auditStatuses.length > 0 ||
    filterState.lifeStatuses.length > 0 ||
    Boolean(filterState.startAt || filterState.endAt)
  )
  // 实时订单只展示已支付链路：待支付/已取消不展示
  const visibleOrders = orderItems.filter(
    (item) => item.status === 'paid' || item.status === 'used' || item.status === 'refunding',
  )
  const showFAB = (
    activityTab === 'mine' && filteredActivities.length > 0
  ) && !filterPanelOpen
  const renderActivityTopTabs = () => (
    <View className="activity-top-tabs-strip">
      {ACTIVITY_TABS.map((item) => (
        <View
          key={item.key}
          className={`activity-top-tab-cell ${activityTab === item.key ? 'active' : ''}`}
          onClick={() => onChangeTab(item.key)}
        >
          <Text className="activity-top-tab-label">{item.label}</Text>
        </View>
      ))}
    </View>
  )

  return (
    <View className="organizer-panel organizer-activity-panel">
      {renderActivityTopTabs()}

      {/* Toolbar - varies by tab */}
      {activityTab === 'mine' && (
        <View className="toolbar-row">
          <View className="filter-chip" onClick={onToggleFilterPanel}>
            <Image className="filter-funnel-image" src={require('@/assets/icons/filter-funnel.svg')} mode="aspectFit" />
          </View>
          <View className="search-box">
            <AtIcon value="search" size={16} color="#A8AFBD" />
            <Input
              className="search-input"
              placeholder="搜索活动"
              placeholderClass="search-input-placeholder"
              value={activityKeyword}
              onInput={(event) => onChangeKeyword(event.detail.value)}
            />
          </View>
        </View>
      )}

      {activityTab === 'sales' && (
        <View className="toolbar-row">
          <View className="search-box">
            <AtIcon value="search" size={16} color="#A8AFBD" />
            <Input
              className="search-input"
              placeholder="搜索活动"
              placeholderClass="search-input-placeholder"
            />
          </View>
        </View>
      )}

      {activityTab === 'orders' && (
        <View className="toolbar-row">
          <Picker
            mode="selector"
            range={SALES_CHANNEL_OPTIONS.map((item) => item.label)}
            onChange={(event) => {
              const index = Number(event.detail.value)
              const option = SALES_CHANNEL_OPTIONS[index]
              if (option) onChangeOrderSalesChannel(option.value)
            }}
          >
            <View className="dropdown-shell">
              <Text className="dropdown-text">
                {(SALES_CHANNEL_OPTIONS.find((item) => item.value === orderSalesChannel) || SALES_CHANNEL_OPTIONS[0]).label}
              </Text>
              <AtIcon value="chevron-down" size={16} color="#A0A0A0" />
            </View>
          </Picker>
          <Picker
            mode="selector"
            range={WITHDRAW_STATUS_OPTIONS.map((item) => item.label)}
            onChange={(event) => {
              const index = Number(event.detail.value)
              const option = WITHDRAW_STATUS_OPTIONS[index]
              if (option) onChangeOrderWithdrawStatus(option.value)
            }}
          >
            <View className="dropdown-shell">
              <Text className="dropdown-text">
                {(WITHDRAW_STATUS_OPTIONS.find((item) => item.value === orderWithdrawStatus) || WITHDRAW_STATUS_OPTIONS[0]).label}
              </Text>
              <AtIcon value="chevron-down" size={16} color="#A0A0A0" />
            </View>
          </Picker>
        </View>
      )}

      {activityTab === 'orders' && (
        <View className="toolbar-row">
          <View className="search-box">
            <AtIcon value="search" size={16} color="#A8AFBD" />
            <Input
              className="search-input"
              placeholder="搜索订单"
              placeholderClass="search-input-placeholder"
            />
          </View>
        </View>
      )}

      {/* Filter Panel */}
      {filterPanelOpen && activityTab === 'mine' && (
        <View className="activity-filter-overlay">
          <View className="filter-panel">
            <View className="filter-panel-header">
              <Text className="filter-panel-title">{hasFilterSelection ? '筛选' : '筛选（多选）'}</Text>
              <Text className="filter-panel-close" onClick={onToggleFilterPanel}>关闭</Text>
            </View>

            <View className="filter-section">
              <Text className="filter-section-title">{hasFilterSelection ? '审核状态（多选）' : '审核状态'}</Text>
              {FILTER_AUDIT_OPTIONS.map((opt) => (
                <View key={opt.key} className="filter-checkbox-row" onClick={() => onToggleAudit(opt.key)}>
                  {renderCheckbox(filterState.auditStatuses.includes(opt.key))}
                  <Text className="filter-checkbox-label">{opt.label}</Text>
                </View>
              ))}
            </View>

            <View className="filter-section">
              <Text className="filter-section-title">活动状态（多选）</Text>
              {FILTER_LIFE_OPTIONS.map((opt) => (
                <View key={opt.key} className="filter-checkbox-row" onClick={() => onToggleLife(opt.key)}>
                  {renderCheckbox(filterState.lifeStatuses.includes(opt.key))}
                  <Text className="filter-checkbox-label">{opt.label}</Text>
                </View>
              ))}
            </View>

            <View className="filter-section">
              <Text className="filter-section-title">时间</Text>
              <View className="filter-time-row">
                <View className="filter-time-input" onClick={onOpenCalendar}>
                  <Text className={`filter-time-text ${calendarStart ? 'has-value' : ''}`}>
                    {calendarStart && calendarEnd ? `${calendarStart} · ${calendarEnd}` : '开始时间-结束时间'}
                  </Text>
                  <AtIcon value="calendar" size={16} color="#8A8A8A" />
                </View>
              </View>
            </View>

            <View className="filter-footer">
              <View className="filter-reset-btn" onClick={onResetFilter}>
                <Text>重制</Text>
              </View>
              <View className="filter-apply-btn" onClick={onApplyFilter}>
                <Text>应用</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Content area */}
      <ScrollView
        className="organizer-scroll activity-scroll"
        scrollY
        refresherEnabled={activityTab === 'mine'}
        refresherTriggered={refreshing}
        refresherBackground="#000000"
        refresherDefaultStyle="white"
        onRefresherRefresh={onRefresh}
      >
        {pageState === 'loading' && activityTab === 'mine' && (
          <View className="page-state-center" style={{ paddingTop: '200rpx' }}>
            <View className="page-loading-spinner" />
            <Text className="page-state-text">加载中...</Text>
          </View>
        )}
        {pageState === 'error' && activityTab === 'mine' && (
          <View className="page-state-center" style={{ paddingTop: '200rpx' }}>
            <AtIcon value="alert-circle" size={48} color="#FF3150" />
            <Text className="page-state-text">加载失败</Text>
            <Button className="retry-button" onClick={onRetry}>重试</Button>
          </View>
        )}
        {(pageState === 'loaded' || pageState === 'empty' || activityTab !== 'mine') && (
          <>
            {activityTab === 'mine' && renderActivityList(filteredActivities, onOpenCreateWizard, onOpenActivityDetail, onEditActivity, getDisplayStatus)}
            {activityTab === 'sales' && (filteredActivities.length === 0 ? renderSalesEmpty() : renderSalesView(salesSummary))}
            {activityTab === 'orders' && (
              ordersLoading && visibleOrders.length === 0 ? (
                <View className="empty-activities">
                  <Text className="empty-title">加载中...</Text>
                </View>
              ) : visibleOrders.length === 0 ? renderOrdersEmpty() : renderOrdersView(visibleOrders, setDetailOrder)
            )}
            {activityTab === 'verifiers' && renderVerifierView(verifiers, verifiersLoading, handleOpenActivationFlow, handleToggleVerifierStatus, handleDeleteVerifier)}
          </>
        )}
        <View className="organizer-safe-bottom large" />
      </ScrollView>

      {activationVerifier && renderActivationFlowModal(activationVerifier, activationQr, activationQrLoading, () => setActivationVerifier(null))}
      {detailOrder && renderOrderDetailModal(detailOrder, () => setDetailOrder(null), handleOpenOrderActivity)}

      {/* FAB */}
      {showFAB && (
        <View className="floating-plus-button" onClick={onOpenCreateWizard}>
          <AtIcon value="add" size={22} color="#fff" />
        </View>
      )}
    </View>
  )
}
