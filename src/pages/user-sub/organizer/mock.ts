import {
  CreateActivityDraft,
  OrganizerAccount,
  OrganizerActivityItem,
  OrganizerStats,
  OrganizerWithdrawalInfo,
  SettlementApplyForm,
  TicketSpec,
  UploadSlotState,
  VerifierItem,
} from './types'
import { CDN_IMAGES } from '@/utils/cdn'
const powerFlowLogo = CDN_IMAGES.powerFlowLogo
const posterPowerFlow = CDN_IMAGES.mockPowerFlowCover
const posterBadSofa = CDN_IMAGES.mockBadSofaCover

const posterHyper = posterBadSofa
const avatar = powerFlowLogo

export const organizerAvatar = avatar

export const organizerStats: OrganizerStats = {
  todayOrders: 8213,
  todaySales: 43,
  totalSubscribers: 72,
}

export const organizerActivities: OrganizerActivityItem[] = [
  {
    id: 'activity-1',
    title: 'POWER FLOW',
    cover: posterPowerFlow,
    publishedAt: '2026-01-01 16:53',
    eventTime: '2025.01.03-04 星期五 21:30-02:30',
    eventStartAt: '2026-04-10',
    eventEndAt: '2026-04-11',
    status: 'published',
    auditStatus: 'approved',
    lifeStatus: 'up',
    orders: 312,
    sales: 26890,
    subscribers: 72,
  },
  {
    id: 'activity-2',
    title: 'THE BAD SOFA 沙发派对',
    cover: posterBadSofa,
    publishedAt: '2026-01-01 16:53',
    eventTime: '2025.01.03-04 星期五 21:30-02:30',
    eventStartAt: '2026-05-01',
    eventEndAt: '2026-05-02',
    status: 'published',
    auditStatus: 'approved',
    lifeStatus: 'up',
    orders: 185,
    sales: 12400,
    subscribers: 43,
  },
  {
    id: 'activity-3',
    title: 'THE BAD SOFA 沙发派对',
    cover: posterBadSofa,
    publishedAt: '2026-01-01 16:53',
    eventTime: '2025.01.03-04 星期五 21:30-02:30',
    eventStartAt: '2026-06-15',
    eventEndAt: '2026-06-16',
    status: 'pending',
    auditStatus: 'pending',
    lifeStatus: 'up',
    orders: 0,
    sales: 0,
    subscribers: 0,
  },
  {
    id: 'activity-4',
    title: 'THE BAD SOFA 沙发派对',
    cover: posterBadSofa,
    publishedAt: '2026-01-01 16:53',
    eventTime: '2025.01.03-04 星期五 21:30-02:30',
    eventStartAt: '2025-01-03',
    eventEndAt: '2025-01-04',
    status: 'removed',
    auditStatus: 'approved',
    lifeStatus: 'down',
    orders: 52,
    sales: 3680,
    subscribers: 18,
  },
  {
    id: 'activity-5',
    title: 'THE BAD SOFA 沙发派对',
    cover: posterHyper,
    publishedAt: '2026-01-01 16:53',
    eventTime: '2025.01.03-04 星期五 21:30-02:30',
    eventStartAt: '2025-01-03',
    eventEndAt: '2025-01-04',
    status: 'rejected',
    auditStatus: 'rejected',
    lifeStatus: 'up',
    orders: 0,
    sales: 0,
    subscribers: 0,
    rejectReason: '海报中涉嫌违法/违规内容',
  },
  {
    id: 'activity-6',
    title: 'HYPER 万圣狂欢夜',
    cover: posterHyper,
    publishedAt: '',
    eventTime: '',
    eventStartAt: '',
    eventEndAt: '',
    status: 'pending',
    auditStatus: 'draft',
    lifeStatus: 'up',
    orders: 0,
    sales: 0,
    subscribers: 0,
  },
  {
    id: 'activity-7',
    title: 'SUMMER BEAT 夏日电音节',
    cover: posterPowerFlow,
    publishedAt: '2025-08-01 10:00',
    eventTime: '2025.08.15 星期六 19:00-23:00',
    eventStartAt: '2025-08-15',
    eventEndAt: '2025-08-15',
    status: 'removed',
    auditStatus: 'approved',
    lifeStatus: 'ended',
    orders: 420,
    sales: 35600,
    subscribers: 95,
  },
]

export const organizerVerifiers: VerifierItem[] = [
  {
    id: 'verifier-1',
    name: '孙痘',
    phone: '13942383274',
    permissionScope: '活动',
    channel: 'wechat',
    inviteStatus: 'pending',
  },
  {
    id: 'verifier-2',
    name: '孙痘',
    phone: '13942383274',
    permissionScope: '活动',
    channel: 'wechat',
    inviteStatus: 'active',
  },
]

export const organizerAccount: OrganizerAccount = {
  name: 'POWER FLOW',
  logo: avatar,
  verified: true,
  daysSinceJoined: 210,
  level: 'LV1',
  serviceFeeRate: '5%',
}

export const organizerWithdrawalInfo: OrganizerWithdrawalInfo = {
  payeeName: '孙痘痘',
  accountNumber: '2397219579123912745',
  bankName: '子金黄银行',
}

export const settlementApplyInitialForm: SettlementApplyForm = {
  name: '',
  logo: '',
  province: '',
  city: '',
  district: '',
  type: 'party',
}

export const mockVerifyRecords = [
  {
    id: 'record-1',
    activityTitle: 'POWER FLOW',
    ticketType: '早鸟票',
    quantity: 1,
    realName: '孙*豆',
    idCard: '220*** *** ***232',
    cover: posterPowerFlow,
    status: 'verified' as const,
    verifiedAt: '2026-05-26 14:30',
  },
  {
    id: 'record-2',
    activityTitle: 'POWER FLOW',
    ticketType: '普通票',
    quantity: 2,
    realName: '陈*丽',
    idCard: '510*** *** ***345',
    cover: posterPowerFlow,
    status: 'verified' as const,
    verifiedAt: '2026-05-26 14:18',
  },
  {
    id: 'record-3',
    activityTitle: 'THE BAD SOFA 沙发派对',
    ticketType: 'VIP票',
    quantity: 1,
    realName: '王*芳',
    idCard: '330*** *** ***789',
    cover: posterBadSofa,
    status: 'verified' as const,
    verifiedAt: '2026-05-26 13:56',
  },
]

export const organizerDistricts = ['武侯区', '锦江区', '成华区', '高新区']

export const organizerDateOptions = [
  '2026-04-10 13:33 ~ 2026-04-11 14:51',
  '2026-05-01 20:00 ~ 2026-05-02 02:00',
  '2026-06-15 18:30 ~ 2026-06-16 01:30',
]

export const organizerScheduleOptions = [
  '2026-04-10 13:33',
  '2026-04-11 14:51',
  '2026-05-01 20:00',
  '2026-05-02 02:00',
]

export const organizerPosterSlots: UploadSlotState[] = [
  {
    key: 'detailPoster',
    label: '活动详情页海报',
    helper: '适用于活动详情页展示，竖图比例4:5，大小2M及以下',
    fileName: '',
  },
  {
    key: 'detailLong',
    label: '活动详情长图',
    helper: '适用于活动详情页展示，全宽长图无需裁剪，大小2M及以下\n显示在购票页面底部',
    fileName: '',
  },
  {
    key: 'listPoster',
    label: '活动列表及分享图',
    helper: '适用于活动列表及分享页展示，比例4:3文件大小2M以下',
    fileName: '',
  },
]

/** 今天日期（补零格式），票务售卖时间默认今天起售 */
export const todayDateString = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const initialDateRange = () => {
  // 活动日期默认选择今天作为开始日期（补零，后端要求 "2006-01-02" 格式）
  const today = todayDateString()
  return `${today} · ${today}`
}

export const organizerTicketSpecs: TicketSpec[] = [
  {
    id: 'ticket-1',
    name: '早鸟票',
    enabled: true,
    startAt: todayDateString(),
    endAt: todayDateString(),
    price: '0',
    stock: '0',
    limit: '0',
    attendees: '1',
  },
  {
    id: 'ticket-2',
    name: '预售票',
    enabled: false,
    startAt: todayDateString(),
    endAt: todayDateString(),
    price: '0',
    stock: '0',
    limit: '0',
    attendees: '1',
  },
]

export const createInitialDraft = (): CreateActivityDraft => ({
  type: 'party',
  name: '',
  shareTitle: '',
  dateRange: initialDateRange(),
  businessHours: '',
  realNameRequired: false,
  minorCheckRequired: false,
  summary: '',
  district: organizerDistricts[0],
  address: '天府三街',
  locationName: '天府三街',
  latitude: 30.5539,
  longitude: 104.0676,
  ticketTypeName: '票务类型',
  quickTicketName: '',
  selectedSpecId: organizerTicketSpecs[0].id,
  posterSlots: organizerPosterSlots.map((slot) => ({ ...slot })),
  qualificationFileName: '',
  ticketSpecs: organizerTicketSpecs.map((item) => ({ ...item })),
  uploads: {},
  channels: ['wechat'],
  tagIds: [],
})
