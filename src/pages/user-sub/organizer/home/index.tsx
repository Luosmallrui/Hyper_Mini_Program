import { Image, ScrollView, Text, View } from '@tarojs/components'
import { AtIcon } from 'taro-ui'
import { organizerStats } from '../mock'
import { OrganizerActivityItem } from '../types'

interface OrganizerHomeViewProps {
  activityItems: OrganizerActivityItem[]
  onChangeTab: (tab: 'activities') => void
  onOpenCreateWizard: () => void
  onOpenSales: () => void
  onOpenVerifiers: () => void
  onOpenTicketConfig: () => void
  onOpenDistribution: () => void
}

const QUICK_ACTIONS = [
  { title: '发布活动', desc: '在此处发布最新活动', icon: 'add', onClickKey: 'create' },
  { title: '添加核销员', desc: '快速添加核销员', icon: 'user', onClickKey: 'verifiers', secondary: true },
  { title: '票务配置', desc: '一键配置轻松快捷', icon: 'filter', onClickKey: 'ticket' },
  { title: '分销管理', desc: '加速活动传播', icon: 'share-2', onClickKey: 'distribution' },
] as const

const renderCardHeader = (title: string, actionText?: string, onAction?: () => void) => (
  <View className="organizer-card-header">
    <Text className="organizer-card-title">{title}</Text>
    {actionText ? (
      <View className="organizer-card-action" onClick={onAction}>
        <Text>{actionText}</Text>
      </View>
    ) : null}
  </View>
)

export default function OrganizerHomeView(props: OrganizerHomeViewProps) {
  const { activityItems, onChangeTab, onOpenCreateWizard, onOpenSales, onOpenVerifiers, onOpenTicketConfig, onOpenDistribution } = props
  const publishedActivities = activityItems.filter((item) => item.status === 'published').slice(0, 2)

  const getQuickActionHandler = (key: typeof QUICK_ACTIONS[number]['onClickKey']) => {
    if (key === 'create') return onOpenCreateWizard
    if (key === 'verifiers') return onOpenVerifiers
    if (key === 'ticket') return onOpenTicketConfig
    return onOpenDistribution
  }

  return (
    <ScrollView className="organizer-scroll" scrollY>
      <View className="organizer-section">
        {renderCardHeader('已上架活动', '前往活动中心', () => onChangeTab('activities'))}
        <View className="featured-activity-list">
          {publishedActivities.length > 0 ? publishedActivities.map((item) => (
              <View key={item.id} className="featured-activity-card" onClick={() => onChangeTab('activities')}>
                <Image className="featured-cover" src={item.cover} mode="aspectFill" />
                <View className="featured-content">
                  <Text className="featured-title">{item.title}</Text>
                  <Text className="featured-meta">上架时间：{item.publishedAt}</Text>
                  <Text className="featured-meta">活动时间：{item.eventTime}</Text>
                </View>
                <AtIcon value="chevron-right" size="20" color="#666" />
              </View>
            )) : (
            <View className="featured-empty-card">
              <Text className="featured-empty-text">暂无活动</Text>
            </View>
          )}
        </View>
      </View>

      <View className="organizer-section">
        {renderCardHeader('活动数据', '前往数据中心', onOpenSales)}
        <View className="stats-grid-card">
          <View className="stats-cell">
            <Text className="stats-number">{organizerStats.todayOrders}</Text>
            <Text className="stats-label">今日订单</Text>
          </View>
          <View className="stats-cell">
            <Text className="stats-number">{organizerStats.todaySales}</Text>
            <Text className="stats-label">今日销售</Text>
          </View>
          <View className="stats-cell">
            <Text className="stats-number">{organizerStats.totalSubscribers}</Text>
            <Text className="stats-label">活动订阅量</Text>
          </View>
        </View>
      </View>

      <View className="organizer-section">
        {renderCardHeader('快速配置')}
        <View className="quick-action-list">
          {QUICK_ACTIONS.map((item) => (
            <View key={item.title} className="quick-action-card" onClick={getQuickActionHandler(item.onClickKey)}>
              <View className={`quick-icon-box ${item.secondary ? 'secondary' : ''}`}>
                <AtIcon value={item.icon as any} size="24" color="#fff" />
              </View>
              <View className="quick-action-content">
                <Text className="quick-title">{item.title}</Text>
                <Text className="quick-desc">{item.desc}</Text>
              </View>
              <AtIcon value="chevron-right" size="20" color="#666" />
            </View>
          ))}
        </View>
      </View>

      <View className="organizer-safe-bottom" />
    </ScrollView>
  )
}
