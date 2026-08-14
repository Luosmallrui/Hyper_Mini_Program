import Taro from '@tarojs/taro'
import { buildVerifierScanRequest, mapVerifierScanErrorCode } from '../../../utils/verifier-scan'
import { request, saveTokens } from '@/utils/request'
import {
  createInitialDraft,
  organizerDistricts,
  organizerPosterSlots,
  organizerTicketSpecs,
  settlementApplyInitialForm,
  todayDateString,
} from './mock'
import type {
  CreateActivityDraft,
  OrganizerAccount,
  OrganizerActivityItem,
  OrganizerActivityLifeStatus,
  OrganizerActivityStatus,
  OrganizerAuditStatus,
  OrganizerBankAccountAudit,
  OrganizerOrderItem,
  OrganizerSalesSummary,
  OrganizerStats,
  OrganizerWithdrawalInfo,
  OrganizerWithdrawRecord,
  SettlementApplyForm,
  TicketSpec,
  VerifierItem,
  VerifyStatus,
  VerifyTicketItem,
} from './types'

const BASE_URL = 'https://www.hypercn.cn'

type ApiResponse<T> = {
  code: number
  msg?: string
  data?: T
}

type ActivityStatusValue = 0 | 1 | 2 | 3 | 4 | number

type AuthTokenResponse = {
  access_token?: string
  refresh_token?: string
  access_expire?: number
  user?: Record<string, unknown>
  need_set_password?: boolean
}

interface ApiOrganizerInfo {
  id: number
  type: 'venue' | 'merchant' | string
  name: string
  logo?: string
  status: number
  level?: string
  service_fee_rate?: number | string
  fee_rate?: number | string
  completed_activity_count?: number
  next_level_required_count?: number
  join_days?: number
  account_info?: ApiWithdrawInfo
}

interface ApiWithdrawInfo {
  bank_account_name?: string
  bank_account_no?: string
  bank_name?: string
  can_withdraw?: boolean
  available_amount?: number
  gross_amount?: number
  refund_amount?: number
  withdraw_amount?: number
  pending_withdraw_amount?: number
  arrival_cycle?: string
  pending_audit?: ApiBankAccountAudit | null
  latest_audit?: ApiBankAccountAudit | null
}

interface ApiBankAccountAudit {
  id?: number | string
  bank_account_name?: string
  bank_account_no?: string
  bank_name?: string
  status?: number
  reject_reason?: string
  reviewed_at?: string
  created_at?: string
  updated_at?: string
}

interface ApiActivityItem {
  id: number | string
  name: string
  poster_list?: string
  start_time?: string
  end_time?: string
  status: ActivityStatusValue
  audit_type?: 'initial' | 're_audit' | string
  reject_reason?: string
  /** 已上架活动存在待审核的修改快照（二审进行中，线上仍展示旧版本） */
  has_pending_revision?: boolean
  pending_revision_reason?: string
}

interface ApiVerifierItem {
  id: number | string
  name: string
  phone: string
  status?: number
  channel?: string
}

interface ApiVerifyOrder {
  order_no?: string
  activity_name?: string
  ticket_spec_name?: string
  quantity?: number
  buyer_name_masked?: string
  buyer_id_card_masked?: string
  poster_list?: string
}

/** 商家订单列表项，字段与 PC 商家端 merchant-orders.ts 一致 */
interface ApiOrganizerOrder {
  order_no?: string
  status?: number
  total_price?: number
  actual_price?: number
  quantity?: number
  buyer_name?: string
  activity_id?: number | string
  activity_name?: string
  ticket_spec_name?: string
  pay_time?: string
  created_at?: string
  withdraw_status?: string
  withdraw_amount?: number
  sales_channel?: string
}

const unwrapApiData = <T>(res: any): T => {
  const body = res?.data as ApiResponse<T> | undefined
  if (!body || Number(body.code) !== 200) {
    const error = new Error(body?.msg || '请求失败') as Error & { code?: number; data?: unknown }
    error.code = Number(body?.code || res?.statusCode || 0)
    error.data = body?.data
    throw error
  }
  return body.data as T
}

const apiRequest = async <T>(options: Taro.request.Option): Promise<T> => {
  const res = await request({
    ...options,
    header: {
      'Content-Type': 'application/json',
      ...(options.header || {}),
    },
  })
  return unwrapApiData<T>(res)
}

const getVerifierHeader = () => {
  const verifierId = Taro.getStorageSync('verifier_id') || Taro.getStorageSync('verifierId')
  return verifierId ? { 'X-Verifier-Id': String(verifierId) } : {}
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatDateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatEventTime = (start?: string, end?: string) => {
  const startText = formatDateTime(start)
  const endText = formatDateTime(end)
  if (startText && endText) return `${startText} - ${endText}`
  return startText || endText || ''
}

const parseDateRangeValue = (value: string) => {
  const matches = value.match(/\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{1,2}(?::\d{1,2})?)?/g) || []
  return {
    start: matches[0] || '',
    end: matches[1] || matches[0] || '',
  }
}

/** 统一为后端要求的 "2006-01-02 15:04:05" 格式：月日补零，缺时间补 00:00:00 */
const ensureTimeSuffix = (dateStr: string): string => {
  if (!dateStr) return ''
  const m = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (!m) return dateStr
  const padPart = (v: string | undefined) => String(v ?? '00').padStart(2, '0')
  return `${m[1]}-${padPart(m[2])}-${padPart(m[3])} ${padPart(m[4])}:${padPart(m[5])}:${padPart(m[6])}`
}

const yuanToFen = (value: string | number) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

const normalizeCount = (value: string | number, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.max(Math.round(num), 0) : fallback
}

const mapActivityStatus = (status: ActivityStatusValue): {
  status: OrganizerActivityStatus
  auditStatus: OrganizerAuditStatus
  lifeStatus: OrganizerActivityLifeStatus
} => {
  switch (Number(status)) {
    case 0:
      return { status: 'pending', auditStatus: 'draft', lifeStatus: 'up' }
    case 1:
    case 2:
      return { status: 'pending', auditStatus: 'pending', lifeStatus: 'up' }
    case 3:
      return { status: 'published', auditStatus: 'approved', lifeStatus: 'up' }
    case 4:
      return { status: 'rejected', auditStatus: 'rejected', lifeStatus: 'up' }
    default:
      return { status: 'pending', auditStatus: 'pending', lifeStatus: 'up' }
  }
}

const getActivityName = (item: ApiActivityItem) => String(item?.name || '').trim()

const isRenderableActivityItem = (item: ApiActivityItem) => {
  const name = getActivityName(item)
  return Boolean(name) && name !== '未命名活动'
}

const mapActivityItem = (item: ApiActivityItem): OrganizerActivityItem => {
  const mappedStatus = mapActivityStatus(item.status)
  return {
    id: String(item.id),
    title: getActivityName(item),
    cover: item.poster_list || '',
    publishedAt: mappedStatus.status === 'published' ? formatDateTime(item.start_time) : '',
    eventTime: formatEventTime(item.start_time, item.end_time),
    eventStartAt: item.start_time || '',
    eventEndAt: item.end_time || '',
    ...mappedStatus,
    auditType: item.audit_type === 're_audit' ? 're_audit' : 'initial',
    hasPendingRevision: Boolean(item.has_pending_revision),
    pendingRevisionReason: item.pending_revision_reason || '',
    orders: 0,
    sales: 0,
    subscribers: 0,
    rejectReason: item.reject_reason || '',
  }
}

const formatFeeRate = (value?: number | string) => {
  if (typeof value === 'number') {
    const percent = value > 0 && value < 1 ? value * 100 : value
    return `${Number(percent.toFixed(2))}%`
  }
  const normalized = String(value || '').trim()
  if (!normalized) return '0%'
  if (normalized.endsWith('%')) return normalized
  const numeric = Number(normalized)
  if (Number.isFinite(numeric)) {
    const percent = numeric > 0 && numeric < 1 ? numeric * 100 : numeric
    return `${Number(percent.toFixed(2))}%`
  }
  return normalized
}

const mapAccount = (item: ApiOrganizerInfo): OrganizerAccount => ({
  name: item?.name || 'POWER FLOW',
  logo: item?.logo || '',
  verified: Number(item?.status) === 2,
  daysSinceJoined: Number(item?.join_days || 0),
  level: item?.level || 'LV1',
  serviceFeeRate: formatFeeRate(item?.service_fee_rate ?? item?.fee_rate),
})

const mapBankAudit = (item?: ApiBankAccountAudit | null): OrganizerBankAccountAudit | null => {
  if (!item) return null
  return {
    id: Number(item.id || 0),
    payeeName: item.bank_account_name || '',
    accountNumber: item.bank_account_no || '',
    bankName: item.bank_name || '',
    status: Number(item.status ?? 0),
    rejectReason: item.reject_reason || '',
    reviewedAt: item.reviewed_at || '',
    createdAt: item.created_at || '',
    updatedAt: item.updated_at || '',
  }
}

const mapWithdrawal = (item?: ApiWithdrawInfo | null): OrganizerWithdrawalInfo => ({
  payeeName: item?.bank_account_name || '',
  accountNumber: item?.bank_account_no || '',
  bankName: item?.bank_name || '',
  canWithdraw: Boolean(item?.can_withdraw),
  availableAmount: Number(item?.available_amount || 0),
  grossAmount: Number(item?.gross_amount || 0),
  withdrawAmount: Number(item?.withdraw_amount || 0),
  pendingWithdrawAmount: Number(item?.pending_withdraw_amount || 0),
  arrivalCycle: item?.arrival_cycle || '',
  pendingAudit: mapBankAudit(item?.pending_audit),
  latestAudit: mapBankAudit(item?.latest_audit),
})

const mapVerifier = (item: ApiVerifierItem): VerifierItem => ({
  id: String(item.id),
  name: item.name || '',
  phone: item.phone || '',
  permissionScope: '活动',
  channel: item.channel === 'douyin' ? 'douyin' : 'wechat',
  inviteStatus: Number(item.status) === 1 ? 'active' : 'pending',
})

const extractOrderNoFromQr = (qrCode: string) => {
  const match = qrCode.match(/^TICKET:([^:]+):/)
  return match?.[1] || ''
}

const mapVerifyTicket = (item: Partial<ApiVerifyOrder>, id: string, qrCode = ''): VerifyTicketItem => ({
  id,
  orderNo: item.order_no || extractOrderNoFromQr(qrCode),
  activityTitle: item.activity_name || '票务订单',
  ticketType: item.ticket_spec_name || '票券',
  quantity: Number(item.quantity || 1),
  realName: item.buyer_name_masked || '-',
  idCard: item.buyer_id_card_masked || '',
  cover: item.poster_list || '',
  status: 'verified',
  verifiedAt: formatDateTime(new Date().toISOString()),
})

/** 后端订单状态：0 待支付 / 1 待使用 / 2 已使用 / 3 已取消 / 4 退款中 / 5 已退款 / 6 退款拒绝 */
const mapOrganizerOrderStatus = (status?: number): OrganizerOrderItem['status'] => {
  switch (Number(status)) {
    case 1:
      return 'paid'
    case 2:
      return 'used'
    case 4:
    case 5:
    case 6:
      return 'refunding'
    case 3:
      return 'cancelled'
    default:
      return 'pending'
  }
}

const mapOrganizerOrder = (item: ApiOrganizerOrder, index: number): OrganizerOrderItem => ({
  id: item.order_no || `order-${index}`,
  activityId: item.activity_id === undefined || item.activity_id === null ? '' : String(item.activity_id),
  activityTitle: item.activity_name || '',
  buyerName: item.buyer_name || '-',
  ticketType: item.ticket_spec_name || '',
  amount: Number(item.actual_price || 0) / 100,
  status: mapOrganizerOrderStatus(item.status),
  createdAt: formatDateTime(item.pay_time || item.created_at),
  withdrawStatus: item.withdraw_status,
  withdrawAmount: typeof item.withdraw_amount === 'number' ? item.withdraw_amount : undefined,
  salesChannel: item.sales_channel,
})

export interface DashboardData {
  activities: OrganizerActivityItem[]
  stats: OrganizerStats
}

export interface DashboardQueryParams {
  mode?: 'default' | 'empty'
}

export interface ActivityQueryParams {
  keyword?: string
  auditStatuses?: string[]
  lifeStatuses?: string[]
  channels?: string[]
  startAt?: string
  endAt?: string
}

export interface OrganizerAuditStatusData {
  applicationId: number
  organizerId: number
  type: string
  status: number
  enabled: number
  rejectReason: string
  submittedAt: string
  reviewedAt: string
}

export interface OrganizerApplyResult {
  applicationId: number
  status: number
  submittedAt: string
}

type ApiOrganizerAuditStatus = {
  application_id?: number | string
  organizer_id?: number | string
  type?: string
  status?: number | string
  enabled?: number | string
  reject_reason?: string
  submitted_at?: string
  reviewed_at?: string
}

const normalizeOrganizerAuditStatus = (status?: number | string) => {
  const normalized = Number(status ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

export const fetchOrganizerAuditStatus = async (): Promise<OrganizerAuditStatusData> => {
  const data = await apiRequest<ApiOrganizerAuditStatus>({
    url: '/api/v1/organizer/audit-status',
    method: 'GET',
  })
  return {
    applicationId: Number(data?.application_id || 0),
    organizerId: Number(data?.organizer_id || 0),
    type: data?.type || '',
    status: normalizeOrganizerAuditStatus(data?.status),
    enabled: Number(data?.enabled ?? 1),
    rejectReason: data?.reject_reason || '',
    submittedAt: data?.submitted_at || '',
    reviewedAt: data?.reviewed_at || '',
  }
}

export const loginOrganizerPassword = async (phone: string, password: string): Promise<void> => {
  const data = await apiRequest<AuthTokenResponse>({
    url: '/api/v1/auth/login-password',
    method: 'POST',
    data: { phone, password },
  })

  if (!data?.access_token) {
    throw new Error('登录响应缺少访问凭证')
  }

  saveTokens(data.access_token, data.refresh_token, data.access_expire)
  if (data.user) {
    const nextUser = {
      ...data.user,
      is_merchant: true,
      merchant_status: 'approved',
    }
    Taro.setStorageSync('userInfo', nextUser)
    Taro.eventCenter.trigger('USER_INFO_UPDATED', nextUser)
  }
}

export const fetchActivities = async (params: ActivityQueryParams = {}): Promise<OrganizerActivityItem[]> => {
  // 后端确认（docs/backend_fix_requests_20260810_response_20260813.md §3.1）：
  // 不传 status 时返回当前商家全部状态的活动（含草稿/待审核/已驳回），无需分组查询
  const data = await apiRequest<{ list?: ApiActivityItem[]; total?: number }>({
    url: '/api/v1/activity/my-list',
    method: 'GET',
    data: { page: 1, size: 50 },
  })
  let list = (Array.isArray(data?.list) ? data.list : [])
    .filter(isRenderableActivityItem)
    .map(mapActivityItem)

  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter((item) => item.title.toLowerCase().includes(keyword))
  }
  if (params.auditStatuses?.length) {
    list = list.filter((item) => params.auditStatuses?.includes(item.auditStatus))
  }
  if (params.lifeStatuses?.length) {
    list = list.filter((item) => params.lifeStatuses?.includes(item.lifeStatus))
  }
  if (params.startAt) {
    list = list.filter((item) => !item.eventStartAt || item.eventStartAt >= params.startAt!)
  }
  if (params.endAt) {
    list = list.filter((item) => !item.eventStartAt || item.eventStartAt <= params.endAt!)
  }

  return list
}

export const fetchDashboard = async (_params: DashboardQueryParams = {}): Promise<DashboardData> => {
  const activities = await fetchActivities()
  return {
    activities,
    stats: {
      todayOrders: 0,
      todaySales: 0,
      totalSubscribers: activities.reduce((sum, item) => sum + (item.subscribers || 0), 0),
    },
  }
}

export const fetchOrders = async (params: { withdrawStatus?: string; salesChannel?: string } = {}): Promise<OrganizerOrderItem[]> => {
  const query = [
    params.withdrawStatus ? `withdraw_status=${encodeURIComponent(params.withdrawStatus)}` : '',
    params.salesChannel ? `sales_channel=${encodeURIComponent(params.salesChannel)}` : '',
  ].filter(Boolean).join('&')
  const data = await apiRequest<{ list?: ApiOrganizerOrder[]; total?: number }>({
    url: `/api/v1/organizer/orders?page=1&size=100${query ? `&${query}` : ''}`,
    method: 'GET',
  })
  return (Array.isArray(data?.list) ? data.list : []).map(mapOrganizerOrder)
}

/** 销售数据汇总（后端聚合接口），见 docs/frontend_api_updates_20260810_back.md 第 2 节。
 *  后端口径：只统计 status 1（待使用）/2（已使用）订单；金额字段单位分。 */
export const fetchSalesSummary = async (): Promise<OrganizerSalesSummary> => {
  const data = await apiRequest<{
    total_amount?: number
    order_count?: number
    average_order_amount?: number
    view_count?: number
    visitor_count?: number
    paid_order_count?: number
    conversion_rate?: number
    activity_ranks?: Array<{
      activity_id?: number | string
      activity_name?: string
      order_count?: number
      total_amount?: number
      view_count?: number
      visitor_count?: number
      conversion_rate?: number
    }>
  }>({
    url: '/api/v1/organizer/orders/summary',
    method: 'GET',
  })
  return {
    totalSales: Number(data?.total_amount || 0) / 100,
    orderCount: Number(data?.order_count || 0),
    averageOrderValue: Math.round(Number(data?.average_order_amount || 0) / 100),
    viewCount: Number(data?.view_count || 0),
    visitorCount: Number(data?.visitor_count || 0),
    conversionRate: Number(data?.conversion_rate || 0),
    activityRanking: (Array.isArray(data?.activity_ranks) ? data.activity_ranks : [])
      .map((item) => ({
        activityId: String(item?.activity_id ?? ''),
        title: String(item?.activity_name || '未命名活动'),
        sales: Number(item?.total_amount || 0) / 100,
        orders: Number(item?.order_count || 0),
        viewCount: Number(item?.view_count || 0),
        visitorCount: Number(item?.visitor_count || 0),
        conversionRate: Number(item?.conversion_rate || 0),
      }))
      .sort((a, b) => b.sales - a.sales),
  }
}

export const fetchVerifiers = async (): Promise<VerifierItem[]> => {
  const data = await apiRequest<{ list?: ApiVerifierItem[] }>({
    url: '/api/v1/organizer/verifiers',
    method: 'GET',
    data: { page: 1, size: 50 },
  })
  return (Array.isArray(data?.list) ? data.list : []).map(mapVerifier)
}

export const createVerifier = async (payload: { name: string; phone: string }): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: '/api/v1/organizer/verifier',
    method: 'POST',
    data: payload,
  })
}

export const updateVerifierStatus = async (id: string, status: number): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: `/api/v1/organizer/verifier/${id}/status`,
    method: 'PATCH',
    data: { status },
  })
}

export const deleteVerifier = async (id: string): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: `/api/v1/organizer/verifier/${id}`,
    method: 'DELETE',
  })
}

interface ApiVerifierActivationQr {
  wechat_qr_url?: string
  wechat_qr?: string
  douyin_qr?: string
}

/** 只接受 http(s) 图片地址；若后端返回的是 scene/深链文本则返回空串，由页面回退到静态示例图 */
const pickQrImageUrl = (...values: Array<string | undefined>) =>
  values.find((value) => /^https?:\/\//.test(String(value || '').trim())) || ''

export const fetchVerifierActivationQr = async (id: string): Promise<{
  wechatQrUrl: string
  douyinQrUrl: string
}> => {
  const data = await apiRequest<ApiVerifierActivationQr>({
    url: `/api/v1/organizer/verifier/${id}/activation-qr`,
    method: 'GET',
  })
  return {
    wechatQrUrl: pickQrImageUrl(data?.wechat_qr_url, data?.wechat_qr),
    douyinQrUrl: pickQrImageUrl(data?.douyin_qr),
  }
}

export const fetchVerifierActivationInfo = async (version: string): Promise<{
  organizerName: string
  verifierId?: string
}> => {
  const data = await apiRequest<{ organizer_name?: string; verifier_id?: string | number }>({
    url: `/api/v1/verifier/activation-info?v=${encodeURIComponent(version)}`,
    method: 'GET',
  })
  const organizerName = String(data?.organizer_name || '').trim()
  if (!organizerName) throw new Error('主办方信息无效')
  const verifierId = data?.verifier_id
  return {
    organizerName,
    verifierId: verifierId === undefined || verifierId === null || verifierId === '' ? undefined : String(verifierId),
  }
}

export const activateVerifier = async (payload: { phone: string; verifierId?: string }): Promise<{
  verifierId?: string
  status?: string
}> => {
  const numericVerifierId = Number(payload.verifierId)
  const data = await apiRequest<{ verifier_id?: string | number; id?: string | number; status?: string }>({
    url: '/api/v1/verifier/activate',
    method: 'POST',
    data: {
      phone: payload.phone,
      channel: 'wechat',
      // 扫码场景传 verifier_id；拿不到时不传该字段，后端兼容仅 phone 的旧调用
      ...(payload.verifierId
        ? { verifier_id: Number.isFinite(numericVerifierId) ? numericVerifierId : payload.verifierId }
        : {}),
    },
  })
  const verifierId = data?.verifier_id ?? data?.id
  if (verifierId) {
    Taro.setStorageSync('verifier_id', String(verifierId))
    Taro.setStorageSync('verifierId', String(verifierId))
  }
  return {
    verifierId: verifierId ? String(verifierId) : undefined,
    status: data?.status,
  }
}

export const fetchAccount = async (): Promise<OrganizerAccount> => {
  try {
    const data = await apiRequest<ApiOrganizerInfo>({
      url: '/api/v1/organizer/info',
      method: 'GET',
    })
    return mapAccount(data)
  } catch (error) {
    // /organizer/info 当前后端 500（sql 参数错误），用 /organizer/profile 兜底名称与 logo
    const profile = await fetchOrganizerProfile().catch(() => null)
    if (profile) {
      return {
        name: profile.name || 'POWER FLOW',
        logo: profile.logo || '',
        // 能进入管理后台的主办方即已通过入驻审核（status=2），兜底按已认证展示
        verified: true,
        daysSinceJoined: 0,
        level: 'LV1',
        serviceFeeRate: '',
      }
    }
    throw error
  }
}

/** 更新主办方基本信息（名称/logo），与 PC 商家端一致走 /organizer/basic */
export const updateOrganizerBasic = async (payload: { name?: string; logo?: string }): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: '/api/v1/organizer/basic',
    method: 'PUT',
    data: payload,
  })
}

/** 主办方资料（名称/logo/省市区），用于编辑回显与认证信息展示。
 *  /organizer/info 目前不可用（后端 500），资料一律改从 /organizer/profile 读取。 */
export const fetchOrganizerProfile = async (): Promise<{ name: string; logo: string; province: string; city: string; district: string; businessHours: string }> => {
  const data = await apiRequest<{ name?: string; logo?: string; province?: string; city?: string; district?: string; business_hours?: string }>({
    url: '/api/v1/organizer/profile',
    method: 'GET',
  })
  return {
    name: data?.name || '',
    logo: data?.logo || '',
    province: data?.province || '',
    city: data?.city || '',
    district: data?.district || '',
    businessHours: data?.business_hours || '',
  }
}

/** 更新主办方经营时间（场地类型创建时同步回主办方资料） */
export const updateOrganizerBusinessHours = async (businessHours: string): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: '/api/v1/organizer/profile',
    method: 'PUT',
    data: { business_hours: businessHours },
  })
}

/** 内容/优惠标签（发布向导多选），见 docs/frontend_integration_today_11_items_20260812.md §8 */
export interface ContentTagItem {
  id: number
  name: string
}

export const fetchContentTags = async (): Promise<ContentTagItem[]> => {
  const data = await apiRequest<{ list?: Array<{ id?: number | string; name?: string }> }>({
    url: '/api/v1/content-tags',
    method: 'GET',
  })
  return (Array.isArray(data?.list) ? data.list : [])
    .map((item) => ({ id: Number(item?.id) || 0, name: String(item?.name || '') }))
    .filter((item) => item.id > 0 && !!item.name)
}

/** 更新主办方区域，与 PC 商家端一致走 /organizer/profile */
export const updateOrganizerRegion = async (payload: { province: string; city: string; district: string }): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: '/api/v1/organizer/profile',
    method: 'PUT',
    data: payload,
  })
}

/** 当前登录账号绑定的手机号（修改密码流程用） */
export const fetchAuthPhone = async (): Promise<string> => {
  const data = await apiRequest<{ phone?: string }>({
    url: '/api/v1/auth/profile',
    method: 'GET',
  })
  return data?.phone || ''
}

export const sendAuthCode = async (phone: string): Promise<void> => {
  await apiRequest<unknown>({
    url: '/api/v1/auth/send-code',
    method: 'POST',
    data: { phone },
  })
}

export const resetAuthPassword = async (payload: { phone: string; code: string; password: string }): Promise<void> => {
  await apiRequest<unknown>({
    url: '/api/v1/auth/reset-password',
    method: 'POST',
    data: payload,
  })
}

export const fetchWithdrawalInfo = async (): Promise<OrganizerWithdrawalInfo> => {
  const data = await apiRequest<ApiWithdrawInfo>({
    url: '/api/v1/organizer/withdraw-info',
    method: 'GET',
  })
  return mapWithdrawal(data)
}

export const updateWithdrawalInfo = async (payload: OrganizerWithdrawalInfo): Promise<OrganizerWithdrawalInfo> => {
  await apiRequest<{ success?: boolean }>({
    url: '/api/v1/organizer/withdraw-info',
    method: 'PUT',
    data: {
      bank_account_name: payload.payeeName,
      bank_account_no: payload.accountNumber,
      bank_name: payload.bankName,
    },
  })
  return fetchWithdrawalInfo()
}

interface ApiWithdrawFlowItem {
  id?: number | string
  flow_no?: string
  status?: number
  total_amount?: number
  arrival_time?: string
  reason?: string
  bank_account?: {
    account_holder?: string
    bank_name?: string
    sub_branch?: string
    account_number?: string
  }
  create_time?: string
}

const mapWithdrawRecord = (item: ApiWithdrawFlowItem): OrganizerWithdrawRecord => ({
  id: String(item?.id ?? ''),
  flowNo: item?.flow_no || '',
  status: Number(item?.status ?? 0),
  totalAmount: Number(item?.total_amount ?? 0),
  reason: item?.reason || '',
  accountHolder: item?.bank_account?.account_holder || '',
  bankName: item?.bank_account?.bank_name || '',
  createTime: item?.create_time || '',
  arrivalTime: item?.arrival_time || '',
})

export const fetchWithdrawRecords = async (
  page = 1,
  pageSize = 20,
): Promise<{ list: OrganizerWithdrawRecord[]; total: number }> => {
  const data = await apiRequest<{
    flow_list?: ApiWithdrawFlowItem[]
    total_items?: number
  }>({
    url: `/api/v1/organizer/bank/withdraw/flow/list?page=${page}&page_size=${pageSize}`,
    method: 'GET',
  })
  return {
    list: (Array.isArray(data?.flow_list) ? data.flow_list : []).map(mapWithdrawRecord),
    total: Number(data?.total_items || 0),
  }
}

/** amount 单位为分 */
export const applyWithdraw = async (payload: { amount: number; remark?: string }): Promise<number> => {
  const data = await apiRequest<{ id?: number | string }>({
    url: '/api/v1/organizer/withdraws',
    method: 'POST',
    data: {
      amount: payload.amount,
      ...(payload.remark ? { remark: payload.remark } : {}),
    },
  })
  return Number(data?.id || 0)
}

/** 与 PC 商家端提现记录状态文案保持一致（MerchantFeaturePages.tsx） */
export const getWithdrawStatusLabel = (status: number): string => {
  if (status === 0) return '待审核'
  if (status === 1) return '待打款'
  if (status === 2) return '已打款'
  if (status === 3) return '已驳回'
  return '未知'
}

export const getSettlementApplyInitialForm = (): SettlementApplyForm => ({
  ...settlementApplyInitialForm,
})

export const submitSettlementApply = async (payload: SettlementApplyForm): Promise<OrganizerApplyResult> => {
  const data = await apiRequest<{
    application_id?: number | string
    status?: number | string
    submitted_at?: string
  }>({
    url: '/api/v1/organizer/apply',
    method: 'POST',
    data: {
      name: payload.name,
      logo: payload.logo,
      province: payload.province,
      city: payload.city,
      district: payload.district,
      type: payload.type,
    },
  })
  return {
    applicationId: Number(data?.application_id || 0),
    status: normalizeOrganizerAuditStatus(data?.status || 1),
    submittedAt: data?.submitted_at || new Date().toISOString(),
  }
}

export const uploadOrganizerAsset = async (filePath: string, type: string): Promise<string> => {
  if (!filePath) return ''
  const isWechatTempFile = /^https?:\/\/tmp\//.test(filePath) || /^wxfile:\/\//.test(filePath)
  if (/^https?:\/\//.test(filePath) && !isWechatTempFile) return filePath

  const accessToken = Taro.getStorageSync('access_token')
  const res = await Taro.uploadFile({
    url: `${BASE_URL}/api/v1/upload`,
    filePath,
    name: 'file',
    formData: { type },
    header: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
  let data: any = res.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      data = null
    }
  }
  if (Number(data?.code) !== 200 || !data?.data?.url) {
    throw new Error(data?.msg || '上传失败')
  }
  return data.data.url
}

/** 活动详情原始字段（GET /api/v1/activity/:id），仅取编辑回填所需的字段 */
interface ActivityDetailRaw {
  id: number | string
  name?: string
  type?: 'party' | 'venue' | string
  share_title?: string
  description?: string
  start_time?: string
  end_time?: string
  business_hours?: string
  real_name_mode?: number
  minor_check?: number
  province?: string
  city?: string
  district?: string
  address?: string
  latitude?: number
  longitude?: number
  poster_detail?: string
  poster_long?: string
  poster_list?: string
  poster_wechat?: string
  qualification_doc?: string
  status?: number
  audit_type?: 'initial' | 're_audit' | string
  reject_reason?: string
  has_pending_revision?: boolean
  pending_revision_reason?: string
  tag_ids?: Array<number | string>
  tags?: Array<{ id?: number | string; name?: string }>
  ticket_specs?: Array<{
    id?: number | string
    name?: string
    is_enabled?: number
    sale_start?: string
    sale_end?: string
    price?: number
    stock?: number
    purchase_limit?: number
    max_attendees?: number
  }>
}

/** 仅取 "YYYY-MM-DD" 日期部分（活动/票券时间可能带时分秒） */
const formatDateOnly = (value?: string) => {
  const match = String(value || '').match(/^\d{4}-\d{1,2}-\d{1,2}/)
  return match ? match[0] : ''
}

/** 分 -> 元字符串（票券价格后端按分存储，向导按元字符串编辑） */
const fenToYuanText = (cents?: number) => {
  const yuan = Number(cents || 0) / 100
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2)
}

/** 把活动详情映射为可编辑草稿，供编辑向导全量回填 */
const mapActivityDetailToDraft = (detail: ActivityDetailRaw): CreateActivityDraft => {
  const base = createInitialDraft()
  const isVenue = detail.type === 'venue'
  const startDate = formatDateOnly(detail.start_time)
  const endDate = formatDateOnly(detail.end_time)

  const posterSlots = organizerPosterSlots.map((slot) => {
    const urlMap: Record<string, string | undefined> = {
      detailPoster: detail.poster_detail,
      detailLong: detail.poster_long,
      listPoster: detail.poster_list,
    }
    const url = urlMap[slot.key] || ''
    // 已有海报为 http(s) 地址：fileName 用于展示，filePath 用于提交（http 地址会原样回传，不重复上传）
    return { ...slot, fileName: url, filePath: url }
  })

  const ticketSpecs: CreateActivityDraft['ticketSpecs'] = (Array.isArray(detail.ticket_specs) ? detail.ticket_specs : [])
    .map((spec, index) => ({
      id: String(spec.id || `ticket-${index + 1}`),
      // 后端票券 int64 id 以字符串保存（后端已保证返回字符串），更新/删除时原样传回，不转 JS number
      sourceId: spec.id === undefined || spec.id === null ? undefined : String(spec.id),
      name: spec.name || '',
      enabled: Number(spec.is_enabled ?? 1) === 1,
      startAt: formatDateTime(spec.sale_start),
      endAt: formatDateTime(spec.sale_end),
      price: fenToYuanText(spec.price),
      stock: String(spec.stock ?? 0),
      limit: String(spec.purchase_limit ?? 0),
      attendees: String(spec.max_attendees ?? 1),
    }))

  const tagIds = (detail.tag_ids || (Array.isArray(detail.tags) ? detail.tags.map((tag) => tag.id) : []))
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)

  return {
    ...base,
    id: String(detail.id),
    originalStatus: detail.status,
    province: detail.province || '',
    city: detail.city || '',
    type: isVenue ? 'venue' : 'party',
    name: detail.name || '',
    shareTitle: detail.share_title || '',
    dateRange: !isVenue && startDate && endDate ? `${startDate} · ${endDate}` : '',
    businessHours: detail.business_hours || '',
    realNameRequired: Number(detail.real_name_mode ?? 0) === 1,
    minorCheckRequired: Number(detail.minor_check ?? 0) === 1,
    summary: detail.description || '',
    district: detail.district || base.district,
    address: detail.address || '',
    locationName: detail.address || '',
    latitude: typeof detail.latitude === 'number' ? detail.latitude : base.latitude,
    longitude: typeof detail.longitude === 'number' ? detail.longitude : base.longitude,
    posterSlots,
    qualificationFileName: detail.qualification_doc || '',
    ticketSpecs: isVenue ? [] : ticketSpecs,
    tagIds,
  }
}

/** 拉取单个活动完整详情并映射为可编辑草稿（编辑已上架/被驳回/草稿活动用） */
export const fetchActivityDetail = async (id: string | number): Promise<CreateActivityDraft> => {
  const detail = await apiRequest<ActivityDetailRaw>({
    url: `/api/v1/activity/${id}`,
    method: 'GET',
  })
  return mapActivityDetailToDraft(detail)
}

/** 是否后端票券：编辑回填的票券带原始 sourceId（字符串），前端新增票券无此值 */
const hasTicketSourceId = (spec: TicketSpec) => !!spec.sourceId

const ticketSpecEquals = (a: TicketSpec, b: TicketSpec) =>
  a.name === b.name &&
  a.enabled === b.enabled &&
  a.startAt === b.startAt &&
  a.endAt === b.endAt &&
  a.price === b.price &&
  a.stock === b.stock &&
  a.limit === b.limit &&
  a.attendees === b.attendees

/** 组装单个票券的提交载荷；id 为字符串 int64，更新时原样带上，新增时省略 */
const buildTicketSpecPayload = (spec: TicketSpec) => ({
  ...(hasTicketSourceId(spec) ? { id: spec.sourceId } : {}),
  name: spec.name,
  is_enabled: spec.enabled ? 1 : 0,
  sale_start: ensureTimeSuffix(spec.startAt),
  sale_end: ensureTimeSuffix(spec.endAt),
  price: yuanToFen(spec.price),
  stock: normalizeCount(spec.stock),
  purchase_limit: normalizeCount(spec.limit),
  max_attendees: normalizeCount(spec.attendees, 1),
})

/** 编辑票券 diff：新增/变更批量走 POST /activity/:id/ticket-specs（body 为 { specs: [...] }，带 id=更新，不带 id=新增）；删除逐条走 DELETE /ticket-spec/:id */
const syncTicketSpecs = async (
  activityId: number,
  current: CreateActivityDraft['ticketSpecs'],
  original: CreateActivityDraft['ticketSpecs'],
) => {
  // 新增/变更
  const specsToSave: ReturnType<typeof buildTicketSpecPayload>[] = []
  for (const spec of current) {
    if (hasTicketSourceId(spec)) {
      const prev = original.find((s) => hasTicketSourceId(s) && s.sourceId === spec.sourceId)
      if (prev && ticketSpecEquals(spec, prev)) continue // 未变更
      specsToSave.push(buildTicketSpecPayload(spec)) // 变更（带原始 id）
    } else {
      specsToSave.push(buildTicketSpecPayload(spec)) // 新增（不带 id）
    }
  }
  if (specsToSave.length > 0) {
    await apiRequest<{ success?: boolean }>({
      url: `/api/v1/activity/${activityId}/ticket-specs`,
      method: 'POST',
      data: { specs: specsToSave },
    })
  }

  // 删除：原始里被移除的旧票券
  for (const prev of original) {
    if (!hasTicketSourceId(prev)) continue
    const stillExists = current.some((s) => hasTicketSourceId(s) && s.sourceId === prev.sourceId)
    if (!stillExists) {
      await apiRequest<{ success?: boolean }>({
        url: `/api/v1/ticket-spec/${prev.sourceId}`,
        method: 'DELETE',
      })
    }
  }
}

export const submitActivityDraft = async (draft: CreateActivityDraft): Promise<number> => {
  const range = parseDateRangeValue(draft.dateRange)
  // 场地类型为长期展示，不选活动日期：按“长期有效”提交（今天 ~ 2099-12-31）
  const isVenue = draft.type === 'venue'
  // 编辑已有活动：所有 step 都携带 activity_id；后端在 status=3 被修改时自动转为 status=1（二次审核）
  const editingId = draft.id ? Number(draft.id) : undefined
  const orig = draft.originalDraft
  const isEdit = editingId !== undefined && !!orig

  // 后端以“字段是否出现在请求体”判断是否修改（不比较新旧值），
  // 因此编辑时必须做字段级 diff，只提交用户实际改动的字段；新建则全量提交。
  const changed = (current: unknown, previous: unknown) => {
    if (!isEdit) return true
    return JSON.stringify(current ?? null) !== JSON.stringify(previous ?? null)
  }

  const startTime = isVenue ? ensureTimeSuffix(todayDateString()) : ensureTimeSuffix(range.start)
  const endTime = isVenue ? '2099-12-31 23:59:59' : ensureTimeSuffix(range.end)

  // Step 1：基础资料
  const step1Fields: Record<string, unknown> = {}
  if (changed(draft.type, orig?.type)) step1Fields.type = draft.type
  if (changed(draft.name, orig?.name)) step1Fields.name = draft.name
  if (changed(draft.shareTitle, orig?.shareTitle)) step1Fields.share_title = draft.shareTitle
  if (isVenue) {
    if (changed(draft.businessHours.trim(), orig?.businessHours?.trim())) step1Fields.business_hours = draft.businessHours.trim()
  } else {
    const origStart = orig ? ensureTimeSuffix(parseDateRangeValue(orig.dateRange).start) : undefined
    if (changed(startTime, origStart)) {
      step1Fields.start_time = startTime
      step1Fields.end_time = endTime
    }
    if (changed(draft.realNameRequired, orig?.realNameRequired)) step1Fields.real_name_mode = draft.realNameRequired ? 1 : 0
    if (changed(draft.minorCheckRequired, orig?.minorCheckRequired)) step1Fields.minor_check = draft.minorCheckRequired ? 1 : 0
  }
  if (changed(draft.tagIds, orig?.tagIds ?? [])) step1Fields.tag_ids = draft.tagIds
  if (changed(draft.summary, orig?.summary)) step1Fields.description = draft.summary

  let activityId: number
  if (editingId) {
    activityId = editingId
    if (Object.keys(step1Fields).length > 0) {
      await apiRequest<{ activity_id: number }>({
        url: '/api/v1/activity/create',
        method: 'POST',
        data: { activity_id: activityId, step: 1, ...step1Fields },
      })
    }
  } else {
    const step1 = await apiRequest<{ activity_id: number }>({
      url: '/api/v1/activity/create',
      method: 'POST',
      data: { step: 1, ...step1Fields },
    })
    activityId = step1.activity_id
  }

  // Step 2：地址
  const step2Fields: Record<string, unknown> = {}
  if (changed(draft.province || '', orig?.province || '')) step2Fields.province = draft.province || ''
  if (changed(draft.city || '', orig?.city || '')) step2Fields.city = draft.city || ''
  if (changed(draft.district, orig?.district)) step2Fields.district = draft.district
  const addressValue = draft.address || draft.locationName
  const origAddressValue = orig ? orig.address || orig.locationName : undefined
  if (changed(addressValue, origAddressValue)) step2Fields.address = addressValue
  if (changed(draft.latitude, orig?.latitude)) step2Fields.latitude = draft.latitude
  if (changed(draft.longitude, orig?.longitude)) step2Fields.longitude = draft.longitude
  if (!isEdit || Object.keys(step2Fields).length > 0) {
    await apiRequest<{ activity_id: number }>({
      url: '/api/v1/activity/create',
      method: 'POST',
      data: { activity_id: activityId, step: 2, ...step2Fields },
    })
  }

  // Step 3：海报（逐槽位 diff，仅上传/提交变化的槽位；清空槽位提交空串）
  const posterApiKeyMap: Record<string, string> = {
    detailPoster: 'poster_detail',
    detailLong: 'poster_long',
    listPoster: 'poster_list',
  }
  const posterFields: Record<string, string> = {}
  for (const slot of draft.posterSlots) {
    const apiKey = posterApiKeyMap[slot.key]
    if (!apiKey) continue
    const origSlot = orig?.posterSlots?.find((s) => s.key === slot.key)
    const currentPath = slot.filePath || ''
    const prevPath = origSlot?.filePath || ''
    if (!isEdit || currentPath !== prevPath) {
      posterFields[apiKey] = currentPath ? await uploadOrganizerAsset(currentPath, apiKey) : ''
    }
  }
  if (!isEdit || Object.keys(posterFields).length > 0) {
    await apiRequest<{ activity_id: number }>({
      url: '/api/v1/activity/create',
      method: 'POST',
      data: {
        activity_id: activityId,
        step: 3,
        poster_detail: posterFields.poster_detail || '',
        poster_long: posterFields.poster_long || '',
        poster_list: posterFields.poster_list || '',
        poster_wechat: posterFields.poster_wechat || '',
      },
    })
  }

  // 场地不支持票券配置：跳过，后端对场地收到非空 ticket_specs 会直接拒绝
  // 票券：新建走 step4 全量创建；编辑走专用接口 diff（step4 是旧兼容入口，缺失票券不会自动删除）
  if (!isVenue) {
    if (editingId) {
      await syncTicketSpecs(activityId, draft.ticketSpecs, orig?.ticketSpecs ?? [])
    } else {
      await apiRequest<{ activity_id: number }>({
        url: '/api/v1/activity/create',
        method: 'POST',
        data: {
          activity_id: activityId,
          step: 4,
          ticket_specs: draft.ticketSpecs.map((item) => ({
            name: item.name,
            is_enabled: item.enabled ? 1 : 0,
            sale_start: ensureTimeSuffix(item.startAt),
            sale_end: ensureTimeSuffix(item.endAt),
            price: yuanToFen(item.price),
            stock: normalizeCount(item.stock),
            purchase_limit: normalizeCount(item.limit),
            max_attendees: normalizeCount(item.attendees, 1),
          })),
        },
      })
    }
  }

  // Step 5：资质（仅 http 地址会提交，与既有逻辑一致）
  const qualificationDoc = /^https?:\/\//.test(draft.qualificationFileName) ? draft.qualificationFileName : ''
  if (!isEdit || qualificationDoc !== (orig?.qualificationFileName || '')) {
    await apiRequest<{ activity_id: number }>({
      url: '/api/v1/activity/create',
      method: 'POST',
      data: { activity_id: activityId, step: 5, qualification_doc: qualificationDoc },
    })
  }

  // 已上架（status=3）活动被修改后，后端会自动转为 status=1（二次审核），无需再显式提交审核；
  // 草稿（0）/审核未通过（4）编辑后仍需 submit-audit 进入/回到待审核。
  const isSecondaryReview = editingId !== undefined && draft.originalStatus === 3
  if (!isSecondaryReview) {
    await apiRequest<{ success?: boolean }>({
      url: `/api/v1/activity/${activityId}/submit-audit`,
      method: 'POST',
    })
  }

  return activityId
}

export const fetchVerifyRecords = async (): Promise<VerifyTicketItem[]> => {
  const data = await apiRequest<{ list?: Array<Partial<ApiVerifyOrder> & { id?: string | number; verified_at?: string }> }>({
    url: '/api/v1/verifier/verified-list?page=1&size=50',
    method: 'GET',
    header: getVerifierHeader(),
  })
  return (Array.isArray(data?.list) ? data.list : []).map((item, index) => ({
    ...mapVerifyTicket(item, String(item.id || `verified-${index}`)),
    verifiedAt: formatDateTime(item.verified_at) || '',
  }))
}

export const scanVerifierTicket = async (payload: { qrCode: string; activityId?: string | number }): Promise<{
  success: boolean
  ticket?: VerifyTicketItem
  status?: VerifyStatus
}> => {
  const data = await apiRequest<{ success?: boolean; error_code?: string; order?: ApiVerifyOrder }>({
    url: '/api/v1/verifier/scan',
    method: 'POST',
    data: buildVerifierScanRequest({
      qrCode: payload.qrCode,
      ...(Number(payload.activityId) > 0 ? { activityId: Number(payload.activityId) } : {}),
    }),
    header: getVerifierHeader(),
  })

  if (data?.success) {
    return {
      success: true,
      status: 'recognized',
      ticket: mapVerifyTicket(data.order || {}, `scan-${Date.now()}`, payload.qrCode),
    }
  }

  return { success: false, status: mapVerifierScanErrorCode(data?.error_code) }
}

export const confirmVerifierTicket = async (orderNo: string): Promise<void> => {
  await apiRequest<{ success?: boolean }>({
    url: '/api/v1/verifier/confirm',
    method: 'POST',
    data: { order_no: orderNo },
    header: getVerifierHeader(),
  })
}

export const getDistricts = () => [...organizerDistricts]
export const getTicketSpecs = () => organizerTicketSpecs.map((s: TicketSpec) => ({ ...s }))
export const getInitialDraft = () => createInitialDraft()
