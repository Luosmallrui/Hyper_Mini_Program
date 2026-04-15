import {
  CreateActivityDraft,
  OrganizerActivityItem,
  OrganizerOrderItem,
  OrganizerStats,
  SalesDataItem,
  TicketSpec,
  UploadSlotState,
  VerifierItem,
} from './types'

const posterPowerFlow = 'https://cdn.hypercn.cn/note/2026/02/03/2018529147365625856.jpg'
const posterBadSofa = 'https://cdn.hypercn.cn/note/2026/02/03/2018529148875575296.jpg'
const posterHyper = 'https://cdn.hypercn.cn/note/2026/02/03/2018529173219315712.png'
const avatar = 'https://cdn.hypercn.cn/note/2026/02/03/2018531527209521152.png'

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
    status: 'published',
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
    status: 'published',
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
    status: 'pending',
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
    status: 'removed',
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
    status: 'rejected',
    orders: 0,
    sales: 0,
    subscribers: 0,
    rejectReason: '海报中涉及违规词汇，请重新上传合规海报',
  },
]

export const organizerSalesData: SalesDataItem[] = [
  { id: 'sales-1', label: '活动成交额', value: '¥26,890', trend: '+18.6%' },
  { id: 'sales-2', label: '客单价', value: '¥238', trend: '+4.2%' },
  { id: 'sales-3', label: '转化率', value: '38%', trend: '+9.1%' },
]

export const organizerOrders: OrganizerOrderItem[] = [
  {
    id: 'order-1',
    activityTitle: 'POWER FLOW',
    buyerName: 'Hyper Luna',
    ticketType: '早鸟票',
    amount: 168,
    status: 'paid',
    createdAt: '今天 11:26',
  },
  {
    id: 'order-2',
    activityTitle: 'THE BAD SOFA 沙发派对',
    buyerName: 'HYPER MIKA',
    ticketType: '预售票',
    amount: 228,
    status: 'used',
    createdAt: '今天 10:48',
  },
  {
    id: 'order-3',
    activityTitle: 'POWER FLOW',
    buyerName: 'Yuna 77',
    ticketType: '双人票',
    amount: 520,
    status: 'refunding',
    createdAt: '昨天 23:12',
  },
]

export const organizerVerifiers: VerifierItem[] = [
  {
    id: 'verifier-1',
    name: 'Ariel',
    role: '主核销员',
    status: 'active',
    verifiedCount: 108,
    lastActive: '2 分钟前',
  },
  {
    id: 'verifier-2',
    name: 'Terry',
    role: '票口核销',
    status: 'active',
    verifiedCount: 86,
    lastActive: '15 分钟前',
  },
  {
    id: 'verifier-3',
    name: 'Lime',
    role: '后场核销',
    status: 'inactive',
    verifiedCount: 12,
    lastActive: '昨天 18:20',
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
    helper: '适用于活动详情页展示，比例 5:4，大小 2M 以内',
    fileName: '',
  },
  {
    key: 'detailLong',
    label: '活动详情长图',
    helper: '适用于活动详情页底部长图展示，大小 2M 以内',
    fileName: '',
  },
  {
    key: 'listPoster',
    label: '活动列表及分享图',
    helper: '适用于活动列表及分享页展示，比例 4:3，文件小于 2M',
    fileName: '',
  },
  {
    key: 'wechatGroup',
    label: '活动微信群',
    helper: '适用于活动社群二维码展示，大小 2M 以内',
    fileName: '',
  },
]

export const organizerTicketSpecs: TicketSpec[] = [
  {
    id: 'ticket-1',
    name: '早鸟票',
    enabled: true,
    startAt: '2026-04-10 13:33',
    endAt: '2026-04-11 14:51',
    price: '0',
    stock: '0',
    limit: '0',
    attendees: '1',
  },
  {
    id: 'ticket-2',
    name: '预售票',
    enabled: false,
    startAt: '2026-04-10 13:33',
    endAt: '2026-04-11 14:51',
    price: '0',
    stock: '0',
    limit: '0',
    attendees: '1',
  },
]

export const createInitialDraft = (): CreateActivityDraft => ({
  name: '',
  shareTitle: '',
  dateRange: '',
  realNameRequired: false,
  minorCheckRequired: false,
  summary: '',
  district: organizerDistricts[0],
  address: '天府三街',
  ticketTypeName: '票务类型',
  quickTicketName: '',
  selectedSpecId: organizerTicketSpecs[0].id,
  posterSlots: organizerPosterSlots.map((slot) => ({ ...slot })),
  qualificationFileName: '',
  ticketSpecs: organizerTicketSpecs.map((item) => ({ ...item })),
})
