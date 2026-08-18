import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { AtIcon } from 'taro-ui'
import { OrganizerActivityItem, OrganizerStats, PageDataState } from '../types'
import iconCouponWhite from '../../../../assets/organizer/icon-coupon-white.png'
import iconHomeSmileWhite from '../../../../assets/organizer/icon-home-smile-white.png'
import iconCollageWhite from '../../../../assets/organizer/icon-collage-white.png'
import iconAccountWhite from '../../../../assets/organizer/icon-account-white.png'

interface OrganizerHomeViewProps {
  activityItems: OrganizerActivityItem[]
  stats: OrganizerStats
  pageState: PageDataState
  onRetry: () => void
  onChangeTab: (tab: 'activities') => void
  onOpenCreateWizard: () => void
  onOpenSales: () => void
  onOpenVerifiers: () => void
  onOpenAddVerifier?: () => void
  onOpenTicketConfig: () => void
  onOpenVerify?: () => void
  followerCount: number
  onOpenFollowers: () => void
}

const QUICK_ACTIONS = [
  { title: '发布活动', desc: '在此处发布最新活动', iconSrc: iconHomeSmileWhite, action: 'create' as const },
  { title: '订单核销', desc: '扫码核销现场订单', iconSrc: iconCouponWhite, action: 'verify' as const },
  { title: '添加核销员', desc: '快速添加核销员', iconSrc: iconAccountWhite, action: 'verifiers' as const },
  { title: '票务配置', desc: '一键配置轻松快捷', iconSrc: iconCollageWhite, action: 'ticket' as const },
]

const formatStatValue = (val: number) => String(Math.round(val))
const formatSalesValue = (val: number) => (Number(val) || 0).toFixed(2)

export default function OrganizerHomeView(props: OrganizerHomeViewProps) {
  const { activityItems, stats, pageState, onRetry, onChangeTab, onOpenCreateWizard, onOpenSales, onOpenVerifiers, onOpenTicketConfig, followerCount, onOpenFollowers } = props
  const publishedActivities = activityItems.filter((item) => item.status === 'published').slice(0, 2)

  const getQuickActionHandler = (action: typeof QUICK_ACTIONS[number]['action']) => {
    switch (action) {
      case 'create': return onOpenCreateWizard
      case 'verify': return props.onOpenVerify || onOpenVerifiers
      case 'verifiers': return props.onOpenAddVerifier || props.onOpenVerify || onOpenVerifiers
      case 'ticket': return onOpenTicketConfig
    }
  }

  if (pageState === 'loading') {
    return (
      <View className="organizer-scroll home-scroll page-state-center">
        <View className="page-loading-spinner" />
        <Text className="page-state-text">加载中...</Text>
      </View>
    )
  }

  if (pageState === 'error') {
    return (
      <View className="organizer-scroll home-scroll page-state-center">
        <AtIcon value="alert-circle" size={48} color="#FF3150" />
        <Text className="page-state-text">加载失败</Text>
        <Button className="retry-button" onClick={onRetry}>重试</Button>
      </View>
    )
  }

  return (
    <ScrollView className="organizer-scroll home-scroll" scrollY>
      {/* 已上架活动 */}
      <View className="organizer-section">
        <View className="organizer-card-header">
          <Text className="organizer-card-title">已上架活动</Text>
          <Text className="organizer-card-link" onClick={() => onChangeTab('activities')}>前往活动中心</Text>
        </View>
        {publishedActivities.length > 0 ? (
          <View className="featured-activity-list">
            {publishedActivities.map((item) => (
              <View key={item.id} className="featured-activity-card" onClick={() => onChangeTab('activities')}>
                <View className="featured-cover">
                  <Image className="featured-cover-img" src={item.cover} mode="aspectFill" />
                </View>
                <View className="featured-content">
                  <Text className="featured-title">{item.title}</Text>
                  <Text className="featured-meta">上架时间：{item.publishedAt}</Text>
                  {item.eventTime ? <Text className="featured-meta">活动时间：{item.eventTime}</Text> : null}
                </View>
                <AtIcon value="chevron-right" size={18} color="#666" />
              </View>
            ))}
          </View>
        ) : (
          <View className="home-featured-empty">
            <Text className="home-featured-empty-text">暂无活动</Text>
          </View>
        )}
      </View>

      {/* 活动数据 */}
      <View className="organizer-section">
        <View className="organizer-card-header">
          <Text className="organizer-card-title">活动数据</Text>
          <Text className="organizer-card-link" onClick={onOpenSales}>前往数据中心</Text>
        </View>
        <View className="home-stat-card">
          <View className="home-stat-grid">
            <View className="home-stat-cell">
              <Text className="home-stat-value">{formatStatValue(stats.todayOrders)}</Text>
              <Text className="home-stat-label">今日订单</Text>
            </View>
            <View className="home-stat-cell">
              <Text className="home-stat-value">{formatSalesValue(stats.todaySales)}</Text>
              <Text className="home-stat-label">今日销售</Text>
            </View>
            <View className="home-stat-cell">
              <Text className="home-stat-value">{formatStatValue(stats.totalSubscribers)}</Text>
              <Text className="home-stat-label">活动订阅量</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 粉丝 */}
      <View className="organizer-section">
        <View className="organizer-card-header">
          <Text className="organizer-card-title">粉丝</Text>
          <Text className="organizer-card-link" onClick={onOpenFollowers}>查看粉丝列表</Text>
        </View>
        <View className="home-fans-card" onClick={onOpenFollowers}>
          <View className="home-fans-info">
            <Text className="home-fans-label">粉丝总数</Text>
            <Text className="home-fans-value">{formatStatValue(followerCount)}</Text>
          </View>
          <AtIcon value="chevron-right" size={18} color="#666" />
        </View>
      </View>

      {/* 快速配置 */}
      <View className="organizer-section">
        <Text className="organizer-card-title" style={{ marginBottom: '20rpx', color: '#A0A0A0' }}>快速配置</Text>
        <View className="quick-action-list">
          {QUICK_ACTIONS.map((item) => (
              <View key={item.title} className="home-quick-card" onClick={getQuickActionHandler(item.action)}>
                <View className="home-quick-icon-box">
                  <Image className="home-quick-icon-img" src={item.iconSrc} mode="aspectFit" />
                </View>
              <View className="home-quick-content">
                <Text className="home-quick-title">{item.title}</Text>
                <Text className="home-quick-desc">{item.desc}</Text>
              </View>
              <AtIcon value="chevron-right" size={18} color="#666" />
            </View>
          ))}
        </View>
      </View>

      <View className="organizer-safe-bottom" />
    </ScrollView>
  )
}
