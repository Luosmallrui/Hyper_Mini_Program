export type OrganizerDashboardView =
  | 'home'
  | 'activities'
  | 'more'
  | 'account'
  | 'createWizard'
  | 'verify'
  | 'verifyRecords'
  | 'settlementApply'
  | 'settlementPending'
  | 'auditPending'
  | 'auditRejected'
  | 'accountStopped'
  | 'nonMerchant'

export type OrganizerDashboardTab = Exclude<OrganizerDashboardView, 'createWizard' | 'verify' | 'verifyRecords' | 'settlementApply' | 'settlementPending' | 'auditPending' | 'auditRejected' | 'accountStopped' | 'nonMerchant'>

export type VerifyStatus =
  | 'recognized'
  | 'success'
  | 'failed'
  | 'orderNotFound'
  | 'wrongActivity'
  | 'alreadyVerified'
  | 'orderCancelled'
  | 'invalidQr'
  | 'notVerifiableTime'

export interface VerifyTicketItem {
  id: string
  orderNo?: string
  activityTitle: string
  ticketType: string
  quantity: number
  realName: string
  idCard: string
  cover: string
  status: 'verified' | 'unverified'
  verifiedAt?: string
}

export type VerifyRecordsState = 'loading' | 'loaded' | 'empty' | 'error'

export interface SettlementApplyForm {
  name: string
  logo: string
  province: string
  city: string
  district: string
  /** 入驻类型：venue 场地 / party 派对（创建活动时按该类型锁定，向导内不可切换） */
  type: 'party' | 'venue'
}

export type OrganizerActivityTab = 'mine' | 'sales' | 'orders' | 'verifiers'

export type OrganizerActivityStatus = 'published' | 'pending' | 'removed' | 'rejected'

export type OrganizerAuditStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type OrganizerActivityLifeStatus = 'up' | 'down' | 'ended'

export type Channel = 'wechat' | 'douyin'

export type MoreInnerTab = 'collections' | 'lottery'

export type ActivityViewMode = 'grid' | 'list'

export interface ActivityFilterState {
  auditStatuses: OrganizerAuditStatus[]
  channels: Channel[]
  lifeStatuses: OrganizerActivityLifeStatus[]
  startAt: string
  endAt: string
}

export interface OrganizerActivityItem {
  id: string
  title: string
  cover: string
  publishedAt: string
  eventTime: string
  eventStartAt: string
  eventEndAt: string
  status: OrganizerActivityStatus
  auditStatus: OrganizerAuditStatus
  /** 审核类型：initial 首次审核 / re_audit 修改后二次审核 */
  auditType?: 'initial' | 're_audit'
  /** 已上架活动存在待审核的修改快照（二审进行中，线上仍展示旧版本） */
  hasPendingRevision?: boolean
  pendingRevisionReason?: string
  lifeStatus: OrganizerActivityLifeStatus
  orders: number
  sales: number
  subscribers: number
  rejectReason?: string
}

export interface OrganizerStats {
  todayOrders: number
  todaySales: number
  totalSubscribers: number
}

export interface OrganizerOrderItem {
  id: string
  activityId: string
  activityTitle: string
  buyerName: string
  ticketType: string
  /** 成交金额，单位元 */
  amount: number
  status: 'paid' | 'refunding' | 'used' | 'pending' | 'cancelled'
  createdAt: string
  /** 提现状态：available 可提现 / pending_withdraw 提现审核中 / withdrawn 已提现 / unavailable 不可提现 */
  withdrawStatus?: string
  /** 已被提现单分配的金额（分） */
  withdrawAmount?: number
  /** 销售渠道：wechat/douyin/web/other */
  salesChannel?: string
}

export interface VerifierItem {
  id: string
  name: string
  phone: string
  permissionScope: string
  channel: Channel
  inviteStatus: 'pending' | 'active'
  qrCodeUrl?: string
}

export interface OrganizerActivitySalesRank {
  activityId: string
  title: string
  /** 销售额，单位元 */
  sales: number
  orders: number
  /** 累计 PV */
  viewCount?: number
  /** 累计 UV */
  visitorCount?: number
  /** 转化率（0-1 小数） */
  conversionRate?: number
}

export interface OrganizerSalesSummary {
  /** 成交额（元），status 为已支付/已核销订单的 actual_price 合计 */
  totalSales: number
  /** 成交单数 */
  orderCount: number
  /** 客单价（元，取整），无订单时为 0 */
  averageOrderValue: number
  /** 按活动聚合的销售排行（销售额降序，仅含有成交订单的活动） */
  activityRanking: OrganizerActivitySalesRank[]
  /** 累计浏览量 PV */
  viewCount?: number
  /** 累计访客数 UV */
  visitorCount?: number
  /** 转化率（0-1 小数）：曾成功支付订单数 / UV */
  conversionRate?: number
}

export interface TicketSpec {
  id: string
  /** 后端票券原始 int64 id（字符串形式保存/比较/提交，绝不转成 JS number）；前端新增票券无此值 */
  sourceId?: string
  name: string
  enabled: boolean
  startAt: string
  endAt: string
  price: string
  stock: string
  limit: string
  attendees: string
}

export interface UploadSlotState {
  key: string
  label: string
  helper: string
  fileName: string
  filePath?: string
}

export interface CreateActivityDraft {
  /** 编辑目标活动 ID；新建时为 undefined */
  id?: string
  /** 编辑前的原始审核状态（0草稿/1待审核/2审核中/3已上架/4审核未通过）；新建时为 undefined */
  originalStatus?: number
  /** 编辑回填时的原始详情草稿，用于字段级 diff（只提交用户实际改动的字段） */
  originalDraft?: CreateActivityDraft
  /** 省份/城市（向导不展示，编辑回填时保留原值，避免提交空串清空） */
  province?: string
  city?: string
  type: 'party' | 'venue'
  name: string
  shareTitle: string
  dateRange: string
  /** 场地类型的经营时间，如 "19:30-次日02:30"（派对类型不用） */
  businessHours: string
  realNameRequired: boolean
  minorCheckRequired: boolean
  summary: string
  district: string
  address: string
  locationName: string
  latitude?: number
  longitude?: number
  ticketTypeName: string
  quickTicketName: string
  selectedSpecId: string
  posterSlots: UploadSlotState[]
  qualificationFileName: string
  ticketSpecs: TicketSpec[]
  uploads: Record<string, string>
  channels: Channel[]
  /** 优惠标签 ID 多选（/content-tags），派对绑定活动、场地绑定主办方 */
  tagIds: number[]
}

export interface CalendarPanelState {
  currentYear: number
  currentMonth: number
  selectingEnd: boolean
  startDate: string | null
  endDate: string | null
}

export interface OrganizerAccount {
  name: string
  logo: string
  verified: boolean
  daysSinceJoined: number
  level: string
  serviceFeeRate: string
}

export interface OrganizerWithdrawalInfo {
  payeeName: string
  accountNumber: string
  bankName: string
  canWithdraw?: boolean
  /** 以下为金额字段，单位均为分 */
  availableAmount?: number
  grossAmount?: number
  withdrawAmount?: number
  pendingWithdrawAmount?: number
  arrivalCycle?: string
  pendingAudit?: OrganizerBankAccountAudit | null
  latestAudit?: OrganizerBankAccountAudit | null
}

export interface OrganizerWithdrawRecord {
  id: string
  flowNo: string
  status: number
  /** 提现金额，单位分 */
  totalAmount: number
  reason: string
  accountHolder: string
  bankName: string
  createTime: string
  arrivalTime: string
}

export interface OrganizerBankAccountAudit {
  id: number
  payeeName: string
  accountNumber: string
  bankName: string
  status: number
  rejectReason: string
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

export interface CropModalState {
  open: boolean
  slotKey: string
  cropWidth: number
  cropHeight: number
  uploading: boolean
}

/** Page-level data state for state-machine (idle/loading/loaded/empty/error). */
export type PageDataState = 'idle' | 'loading' | 'loaded' | 'empty' | 'error'
