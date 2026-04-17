import { OrganizerActivityStatus, OrganizerActivityTab, OrganizerDashboardTab } from './types'

export const BOTTOM_TABS: Array<{ key: OrganizerDashboardTab; label: string; icon: string }> = [
  { key: 'home', label: '首页', icon: 'home' },
  { key: 'activities', label: '活动', icon: 'map-pin' },
  { key: 'more', label: '更多', icon: 'menu' },
  { key: 'account', label: '账户', icon: 'user' },
]

export const ACTIVITY_TABS: Array<{ key: OrganizerActivityTab; label: string }> = [
  { key: 'activities', label: '我的活动' },
  { key: 'sales', label: '销售数据' },
  { key: 'orders', label: '实时订单' },
  { key: 'verifiers', label: '核销管理' },
]

export const STEP_TITLES = ['活动信息', '场地设定', '上传海报', '票券配置', '活动资质']

export const STATUS_LABELS: Record<OrganizerActivityStatus, string> = {
  published: '已上架',
  pending: '审核中...',
  removed: '已下架',
  rejected: '审核未通过',
}

export const STATUS_CLASS: Record<OrganizerActivityStatus, string> = {
  published: 'published',
  pending: 'pending',
  removed: 'removed',
  rejected: 'rejected',
}
