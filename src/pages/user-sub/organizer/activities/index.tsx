import { Button, Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { AtIcon } from 'taro-ui'
import { ACTIVITY_TABS, STATUS_CLASS, STATUS_LABELS } from '../constants'
import { organizerOrders, organizerSalesData, organizerVerifiers } from '../mock'
import { OrganizerActivityItem, OrganizerActivityStatus, OrganizerActivityTab } from '../types'

interface OrganizerActivitiesViewProps {
  activityItems: OrganizerActivityItem[]
  activityKeyword: string
  activityFilter: 'all' | OrganizerActivityStatus
  activityTab: OrganizerActivityTab
  filteredActivities: OrganizerActivityItem[]
  onChangeKeyword: (value: string) => void
  onChangeTab: (tab: OrganizerActivityTab) => void
  onCycleFilter: () => void
  onOpenCreateWizard: () => void
}

const renderActivityList = (
  filteredActivities: OrganizerActivityItem[],
  onOpenCreateWizard: () => void,
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
      {filteredActivities.map((item) => (
        <View key={item.id} className="activity-item-card">
          <Image className="activity-item-cover" src={item.cover} mode="aspectFill" />
          <View className="activity-item-content">
            <Text className="activity-item-title">{item.title}</Text>
            <Text className="activity-item-meta">上架时间：{item.publishedAt}</Text>
            <Text className="activity-item-meta">
              {item.status === 'published' ? `活动时间：${item.eventTime}` : STATUS_LABELS[item.status]}
            </Text>
            {item.rejectReason ? <Text className="activity-item-reason">原因：{item.rejectReason}</Text> : null}
          </View>
          <View className={`activity-status-badge ${STATUS_CLASS[item.status]}`}>
            <Text>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const renderSalesView = (activityItems: OrganizerActivityItem[]) => (
  <View className="data-panel">
    <View className="sales-summary-grid">
      {organizerSalesData.map((item) => (
        <View key={item.id} className="sales-summary-card">
          <Text className="sales-summary-label">{item.label}</Text>
          <Text className="sales-summary-value">{item.value}</Text>
          <Text className="sales-summary-trend">{item.trend}</Text>
        </View>
      ))}
    </View>
    <View className="data-list-card">
      <Text className="data-list-title">活动销售排行</Text>
      {activityItems
        .filter((item) => item.status === 'published')
        .map((item, index) => (
          <View key={item.id} className="data-list-row">
            <Text className="data-list-rank">0{index + 1}</Text>
            <View className="data-list-main">
              <Text className="data-list-name">{item.title}</Text>
              <Text className="data-list-sub">销售额 ¥{item.sales}</Text>
            </View>
            <Text className="data-list-side">{item.orders} 单</Text>
          </View>
        ))}
    </View>
  </View>
)

const renderOrdersView = () => (
  <View className="data-panel">
    {organizerOrders.map((item) => (
      <View key={item.id} className="order-card">
        <View className="order-card-main">
          <Text className="order-title">{item.activityTitle}</Text>
          <Text className="order-sub">{item.buyerName} · {item.ticketType}</Text>
          <Text className="order-sub">{item.createdAt}</Text>
        </View>
        <View className="order-card-side">
          <Text className="order-amount">¥{item.amount}</Text>
          <Text className={`order-status ${item.status}`}>
            {item.status === 'paid' ? '已支付' : item.status === 'used' ? '已核销' : '退款中'}
          </Text>
        </View>
      </View>
    ))}
  </View>
)

const renderVerifierView = () => (
  <View className="data-panel">
    {organizerVerifiers.map((item) => (
      <View key={item.id} className="verifier-card">
        <View className="verifier-avatar">
          <Text>{item.name.slice(0, 1)}</Text>
        </View>
        <View className="verifier-main">
          <Text className="verifier-name">{item.name}</Text>
          <Text className="verifier-sub">{item.role} · 已核销 {item.verifiedCount} 单</Text>
          <Text className="verifier-sub">最近活跃 {item.lastActive}</Text>
        </View>
        <View className={`verifier-status ${item.status}`}>
          <Text>{item.status === 'active' ? '在线' : '离线'}</Text>
        </View>
      </View>
    ))}
  </View>
)

export default function OrganizerActivitiesView(props: OrganizerActivitiesViewProps) {
  const {
    activityItems,
    activityKeyword,
    activityTab,
    filteredActivities,
    onChangeKeyword,
    onChangeTab,
    onCycleFilter,
    onOpenCreateWizard,
  } = props

  return (
    <View className="organizer-panel">
      <View className="top-tab-row">
        {ACTIVITY_TABS.map((item) => (
          <View
            key={item.key}
            className={`top-tab-item ${activityTab === item.key ? 'active' : ''}`}
            onClick={() => onChangeTab(item.key)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="toolbar-row">
        <View className="filter-chip" onClick={onCycleFilter}>
          <AtIcon value="filter" size="18" color="#fff" />
        </View>
        <View className="search-box">
          <AtIcon value="search" size="16" color="#8d8d8d" />
          <Input
            className="search-input"
            placeholder="搜索活动"
            placeholderClass="search-input-placeholder"
            value={activityKeyword}
            onInput={(event) => onChangeKeyword(event.detail.value)}
          />
        </View>
      </View>

      <ScrollView className="organizer-scroll activity-scroll" scrollY>
        {activityTab === 'activities' && renderActivityList(filteredActivities, onOpenCreateWizard)}
        {activityTab === 'sales' && renderSalesView(activityItems)}
        {activityTab === 'orders' && renderOrdersView()}
        {activityTab === 'verifiers' && renderVerifierView()}
        <View className="organizer-safe-bottom large" />
      </ScrollView>

      <View className="floating-plus-button" onClick={onOpenCreateWizard}>
        <AtIcon value="add" size="26" color="#fff" />
      </View>
    </View>
  )
}
