import { OrganizerActivityStatus, OrganizerActivityTab, OrganizerAuditStatus, OrganizerActivityLifeStatus, OrganizerDashboardTab, Channel, MoreInnerTab } from './types'
import tabHome from '../../../assets/organizer/tab-home.png'
import tabHomeActive from '../../../assets/organizer/tab-home-active.png'
import tabActivity from '../../../assets/organizer/tab-activity.png'
import tabActivityActive from '../../../assets/organizer/tab-activity-active.png'
import tabMore from '../../../assets/organizer/tab-more.png'
import tabMoreActive from '../../../assets/organizer/tab-more-active.png'
import tabAccount from '../../../assets/organizer/tab-account.png'
import tabAccountActive from '../../../assets/organizer/tab-account-active.png'

export const BOTTOM_TABS: Array<{ key: OrganizerDashboardTab; label: string; icon: string; iconSrc?: string; activeIconSrc?: string }> = [
  { key: 'home', label: '首页', icon: 'home', iconSrc: tabHome, activeIconSrc: tabHomeActive },
  { key: 'activities', label: '活动', icon: 'map-pin', iconSrc: tabActivity, activeIconSrc: tabActivityActive },
  { key: 'more', label: '更多', icon: 'menu', iconSrc: tabMore, activeIconSrc: tabMoreActive },
  { key: 'account', label: '账户', icon: 'user', iconSrc: tabAccount, activeIconSrc: tabAccountActive },
]

export const ACTIVITY_TABS: Array<{ key: OrganizerActivityTab; label: string }> = [
  { key: 'mine', label: '我的活动' },
  { key: 'sales', label: '销售数据' },
  { key: 'orders', label: '实时订单' },
  { key: 'verifiers', label: '核销管理' },
]

export const MORE_TABS: Array<{ key: MoreInnerTab; label: string }> = [
  { key: 'collections', label: '活动合集' },
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

export const AUDIT_STATUS_LABELS: Record<OrganizerAuditStatus, string> = {
  draft: '待发布',
  pending: '审核中',
  approved: '通过',
  rejected: '未通过',
}

export const LIFE_STATUS_LABELS: Record<OrganizerActivityLifeStatus, string> = {
  up: '上架',
  down: '下架',
  ended: '结束',
}

export const FILTER_AUDIT_OPTIONS: Array<{ key: OrganizerAuditStatus; label: string }> = [
  { key: 'draft', label: '待发布' },
  { key: 'pending', label: '审核中' },
  { key: 'approved', label: '通过' },
  { key: 'rejected', label: '未通过' },
]

export const FILTER_CHANNEL_OPTIONS: Array<{ key: Channel; label: string }> = [
  { key: 'wechat', label: '微信小程序' },
  { key: 'douyin', label: '抖音小程序' },
]

export const FILTER_LIFE_OPTIONS: Array<{ key: OrganizerActivityLifeStatus; label: string }> = [
  { key: 'up', label: '上架' },
  { key: 'down', label: '下架' },
  { key: 'ended', label: '结束' },
]

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export const DISPLAY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  'draft-up': { label: '待发布', color: '#747474' },
  // pending / 修改审核中 / 修改被驳回 文案由 getDisplayStatus 处理（含 hasPendingRevision），此处仅作兜底
  'pending-up': { label: '审核中', color: '#A0A0A0' },
  'approved-up': { label: '已上架', color: '#35D34A' },
  'approved-down': { label: '已下架', color: '#747474' },
  'approved-ended': { label: '已结束', color: '#747474' },
  'pending-down': { label: '审核中', color: '#A0A0A0' },
  'rejected-up': { label: '审核未通过', color: '#FF3150' },
  'rejected-down': { label: '审核未通过', color: '#FF3150' },
  'rejected-ended': { label: '审核未通过', color: '#FF3150' },
}

export const CHANNEL_LABEL_MAP: Record<Channel, string> = {
  wechat: '微信',
  douyin: '抖音',
}
