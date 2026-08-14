import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Editor, Image, Input, Map as TaroMap, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import OrganizerActivitiesView from './activities'
import OrganizerAccountView from './account'
import { BOTTOM_TABS, STEP_TITLES, DISPLAY_STATUS_MAP } from './constants'
import OrganizerHomeView from './home'
import OrganizerVerifyView from './verify'
import {
  createInitialDraft,
  organizerActivities,
  organizerTicketSpecs,
} from './mock'
import {
  createVerifier,
  fetchActivityDetail,
  fetchContentTags,
  fetchDashboard,
  fetchOrders,
  fetchOrganizerAuditStatus,
  fetchOrganizerProfile,
  fetchSalesSummary,
  fetchVerifyRecords,
  getSettlementApplyInitialForm,
  loginOrganizerPassword,
  submitActivityDraft,
  submitSettlementApply as submitSettlementApplyRequest,
  updateOrganizerBusinessHours,
  uploadOrganizerAsset,
  type ContentTagItem,
} from './adapter'
import OrganizerMoreView from './more'
import mapPinFallbackIcon from '../../../assets/icons/map-pin-fallback.png'
import iconBack from '../../../assets/organizer/icon-back.png'
import auditUrgeQrCode from '../../../assets/organizer/audit-urge-qrcode.png'
import { CHENGDU_CITY, CHENGDU_DISTRICTS, CHENGDU_PROVINCE, fetchChengduDistricts } from '../../../utils/chengdu-region'
import { reverseGeocode, searchByKeyword, type POIItem } from '../../../utils/qqmap'
import {
  PENDING_VERIFIER_SCAN_KEY,
  type VerifierScanPayload,
} from '../../../utils/verifier-scan'
import {
  ActivityFilterState,
  Channel,
  CreateActivityDraft,
  OrganizerActivityItem,
  OrganizerActivityTab,
  OrganizerAuditStatus,
  OrganizerActivityLifeStatus,
  OrganizerDashboardTab,
  OrganizerDashboardView,
  OrganizerOrderItem,
  OrganizerSalesSummary,
  OrganizerStats,
  PageDataState,
  SettlementApplyForm,
  TicketSpec,
  VerifyRecordsState,
  VerifyStatus,
  VerifyTicketItem,
} from './types'
import './index.scss'

const ALLOW_ORGANIZER_DEBUG = false

const getOrganizerRoleOverride = (params: Record<string, unknown>) => {
  const rawRole = getStringParam(params.mockUserRole || params.userRole || params.adminRole)
  return rawRole === 'organizer' ? rawRole : ''
}

const isMerchantUser = (user: any, roleOverride = '') => {
  if (roleOverride === 'organizer') return true
  return Boolean(user?.is_merchant || user?.merchant_id)
}

const createActivityFromDraft = (draft: CreateActivityDraft): OrganizerActivityItem => ({
  id: `draft-${Date.now()}`,
  title: draft.name,
  cover: draft.posterSlots[0]?.fileName ? organizerActivities[0].cover : organizerActivities[1].cover,
  publishedAt: '刚刚保存',
  eventTime: draft.dateRange || '待设置活动时间',
  eventStartAt: '',
  eventEndAt: '',
  status: 'pending',
  auditStatus: 'draft',
  lifeStatus: 'up',
  orders: 0,
  sales: 0,
  subscribers: 0,
})

const getDisplayStatus = (item: OrganizerActivityItem): { label: string; color: string } => {
  if (item.status === 'rejected') {
    return { label: '审核未通过', color: '#FF3150' }
  }
  // 已上架活动的二次审核：线上仍展示旧版本（status=3），但存在待审核修改快照
  if (item.hasPendingRevision) {
    return item.pendingRevisionReason
      ? { label: '修改被驳回', color: '#FF9500' }
      : { label: '修改审核中', color: '#A0A0A0' }
  }
  if (item.auditStatus === 'pending') {
    return { label: '审核中', color: '#A0A0A0' }
  }
  const key = `${item.auditStatus}-${item.lifeStatus}`
  return DISPLAY_STATUS_MAP[key] || { label: '未知', color: '#747474' }
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay()
const formatDate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
/** 场地经营时间：解析 "19:30-次日02:30" 这类字符串为起止时刻 */
const parseBusinessHours = (value: string) => {
  const m = String(value || '').match(/(\d{1,2}:\d{2})\s*[-~—]\s*(?:次日)?(\d{1,2}:\d{2})/)
  return { start: m?.[1] || '19:30', end: m?.[2] || '02:30' }
}
const formatBusinessHours = (start: string, end: string) => `${start}-${end <= start ? '次日' : ''}${end}`

const formatCalendarDisplayDate = (date: string | null) => {
  if (!date) return ''
  const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) return date
  return `${match[1]}-${Number(match[2])}-${Number(match[3])}`
}
const parseDateRangeValue = (value: string) => {
  const matches = value.match(/\d{4}-\d{1,2}-\d{1,2}/g) || []
  return {
    start: matches[0] || '',
    end: matches[1] || matches[0] || '',
  }
}

const CROP_DIMENSIONS: Record<string, { width: number; height: number }> = {
  detailPoster: { width: 500, height: 625 },
  detailLong: { width: 375, height: 600 },
  listPoster: { width: 600, height: 450 },
}

const ORGANIZER_MAP_KEY = 'Y7YBZ-3UUEN-Z3KFC-SH4QG-LH5RT-IAB4S'
const DEFAULT_LOCATION = {
  latitude: 30.5539,
  longitude: 104.0676,
}
type LocationAdminInfo = {
  province?: string
  city?: string
  district?: string
}
type CalendarTarget = 'filter' | 'dateRange' | 'scheduleRange' | 'customRange'
type OrganizerMockMode = 'default' | 'empty'

const DASHBOARD_TABS: OrganizerDashboardTab[] = ['home', 'activities', 'more', 'account']

const isDashboardTab = (view: OrganizerDashboardView): view is OrganizerDashboardTab =>
  DASHBOARD_TABS.includes(view as OrganizerDashboardTab)

const createDevPrefillDraft = (): CreateActivityDraft => {
  return createInitialDraft()
}

const getStringParam = (value: unknown) => Array.isArray(value) ? value[0] : typeof value === 'string' ? value : ''

const getMockModeFromParams = (params: Record<string, unknown>): OrganizerMockMode =>
  getStringParam(params.adminMockMode || params.mockMode) === 'empty' ? 'empty' : 'default'

const getDebugStepFromParams = (params: Record<string, unknown>) => {
  const rawStep = Number(getStringParam(params.step || params.wizardStep))
  if (!Number.isFinite(rawStep)) return 1
  return Math.min(Math.max(Math.round(rawStep), 1), 5)
}

const getActivityTabFromParams = (params: Record<string, unknown>): OrganizerActivityTab => {
  const rawTab = getStringParam(params.activityTab || params.tab)
  return rawTab === 'sales' || rawTab === 'orders' || rawTab === 'verifiers' ? rawTab : 'mine'
}

const getVerifyStatusFromParams = (params: Record<string, unknown>): VerifyStatus | undefined => {
  const rawStatus = getStringParam(params.verifyModal || params.modalStatus)
  if (rawStatus === 'recognized' || rawStatus === 'success' || rawStatus === 'failed' || rawStatus === 'invalidCode' || rawStatus === 'reverify') {
    return rawStatus
  }
  return undefined
}

type EditorTool =
  | { key: 'undo' | 'redo' | 'clear'; label: string; action: 'command' }
  | { key: 'bold' | 'italic' | 'underline' | 'strike' | 'align' | 'list' | 'fontSize' | 'color'; label: string; action: 'format'; value?: string }

const EDITOR_TOOL_ROWS: EditorTool[][] = [
  [
    { key: 'undo', label: '↶', action: 'command' },
    { key: 'redo', label: '↷', action: 'command' },
    { key: 'bold', label: 'B', action: 'format' },
    { key: 'italic', label: 'I', action: 'format' },
    { key: 'underline', label: 'U', action: 'format' },
    { key: 'strike', label: 'S', action: 'format' },
    { key: 'align', label: '靠左', action: 'format', value: 'left' },
    { key: 'align', label: '居中', action: 'format', value: 'center' },
    { key: 'align', label: '靠右', action: 'format', value: 'right' },
  ],
  [
    { key: 'list', label: '•', action: 'format', value: 'bullet' },
    { key: 'list', label: '1.', action: 'format', value: 'ordered' },
    { key: 'color', label: 'A', action: 'format', value: '#ffffff' },
    { key: 'fontSize', label: '默认字号', action: 'format', value: '16px' },
    { key: 'clear', label: '⌫', action: 'command' },
  ],
]

const EDITOR_FONT_SIZES: { label: string; value: string }[] = [
  { label: '小 (12px)', value: '12px' },
  { label: '默认 (16px)', value: '16px' },
  { label: '大 (20px)', value: '20px' },
  { label: '特大 (24px)', value: '24px' },
  { label: '超大 (32px)', value: '32px' },
]

const EDITOR_COLORS: { label: string; value: string }[] = [
  { label: '白色', value: '#ffffff' },
  { label: '红色', value: '#ff3b30' },
  { label: '橙色', value: '#ff9500' },
  { label: '绿色', value: '#34c759' },
  { label: '蓝色', value: '#007aff' },
  { label: '紫色', value: '#af52de' },
]

export default function OrganizerPage() {
  const calendarApplyCallbackRef = useRef<((value: string) => void) | null>(null)
  const editorContextRef = useRef<any>(null)
  // 编辑回填时待注入富文本编辑器的 HTML（编辑器就绪后再 setContents）
  const pendingEditorHtmlRef = useRef('')
  const locationRequestSeqRef = useRef(0)
  const mapContextRef = useRef<any>(null)
  const mapRegionChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dashboardView, setDashboardView] = useState<OrganizerDashboardView>('home')
  // auditPending 视图被入驻审核和活动发布两条流程复用，用该状态区分来源，
  // 决定结果页文案和主按钮去向。
  const [auditPendingSource, setAuditPendingSource] = useState<'settlement' | 'activity'>('settlement')
  const [verifyActivityTitle, setVerifyActivityTitle] = useState('')
  const [viewHistory, setViewHistory] = useState<OrganizerDashboardTab[]>([])
  const [wizardReturnView, setWizardReturnView] = useState<OrganizerDashboardTab>('activities')
  const [moreCreateOpen, setMoreCreateOpen] = useState(false)
  const [moreCloseCreateSignal, setMoreCloseCreateSignal] = useState(0)
  const [homeAddVerifierOpen, setHomeAddVerifierOpen] = useState(false)
  const [homeVerifierName, setHomeVerifierName] = useState('')
  const [homeVerifierPhone, setHomeVerifierPhone] = useState('')
  // 当前主办方名称（新增核销员弹窗展示）
  const [organizerName, setOrganizerName] = useState('')

  const [organizerBusinessHours, setOrganizerBusinessHours] = useState('')
  // 入驻类型（audit-status 返回）：创建活动只能按该类型发布，向导里不可切换
  const [organizerType, setOrganizerType] = useState<'party' | 'venue'>('party')

  useEffect(() => {
    fetchOrganizerProfile()
      .then((profile) => {
        setOrganizerName(profile.name)
        setOrganizerBusinessHours(profile.businessHours)
      })
      .catch(() => {})
  }, [])
  const [verifyInitialModalStatus, setVerifyInitialModalStatus] = useState<VerifyStatus | undefined>()
  const [verifyInitialAddVerifierOpen, setVerifyInitialAddVerifierOpen] = useState(false)
  const [verifyInitialManualInputOpen, setVerifyInitialManualInputOpen] = useState(false)
  const [verifyInitialScan, setVerifyInitialScan] = useState<VerifierScanPayload | undefined>()
  const [settlementForm, setSettlementForm] = useState<SettlementApplyForm>(getSettlementApplyInitialForm())
  const [settlementDistricts, setSettlementDistricts] = useState<string[]>(CHENGDU_DISTRICTS)
  // 发布向导场地设定的区县选项（后台区县树，兜底内置成都列表）
  const [districtOptions, setDistrictOptions] = useState<string[]>(CHENGDU_DISTRICTS)
  // 场地地址 POI 搜索建议
  const [addressSuggestions, setAddressSuggestions] = useState<POIItem[]>([])
  const addressSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressJustPickedRef = useRef(false)
  const [settlementSubmitting, setSettlementSubmitting] = useState(false)
  const [settlementLogoUploading, setSettlementLogoUploading] = useState(false)
  const [organizerLoginPhone, setOrganizerLoginPhone] = useState('')
  const [organizerLoginPassword, setOrganizerLoginPassword] = useState('')
  const [organizerLoginSubmitting, setOrganizerLoginSubmitting] = useState(false)
  const [verifyRecordsState, setVerifyRecordsState] = useState<VerifyRecordsState>('loading')
  const [verifyRecords, setVerifyRecords] = useState<VerifyTicketItem[]>([])
  const [navMetrics, setNavMetrics] = useState({
    statusBarHeight: 20,
    navBarHeight: 44,
    menuButtonRightGap: 92,
  })

  // Page data state machine
  const [pageState, setPageState] = useState<PageDataState>('idle')
  const [homeStats, setHomeStats] = useState<OrganizerStats>({ todayOrders: 0, todaySales: 0, totalSubscribers: 0 })
  const [activityTab, setActivityTab] = useState<OrganizerActivityTab>('mine')
  const [activityKeyword, setActivityKeyword] = useState('')
  const [activityRefreshing, setActivityRefreshing] = useState(false)
  const [activityItems, setActivityItems] = useState<OrganizerActivityItem[]>([])
  const [orderItems, setOrderItems] = useState<OrganizerOrderItem[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  // 实时订单的提现状态筛选：'' 全部 / available / pending_withdraw / withdrawn
  const [orderWithdrawStatus, setOrderWithdrawStatus] = useState('')
  // 实时订单的销售渠道筛选：'' 全部 / wechat / douyin / web / other
  const [orderSalesChannel, setOrderSalesChannel] = useState('')
  const EMPTY_SALES_SUMMARY: OrganizerSalesSummary = { totalSales: 0, orderCount: 0, averageOrderValue: 0, activityRanking: [] }
  const [salesSummaryData, setSalesSummaryData] = useState<OrganizerSalesSummary | null>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardScrollTop, setWizardScrollTop] = useState(0)
  const [draft, setDraft] = useState<CreateActivityDraft>(createInitialDraft())
  // 发布向导的优惠标签选项（/content-tags，进入向导时拉取一次）
  const [contentTags, setContentTags] = useState<ContentTagItem[]>([])
  // 提交审核成功后的"扫码催审"弹窗
  const [urgeAuditModalOpen, setUrgeAuditModalOpen] = useState(false)

  // Reset wizard scroll position on step change or entering wizard
  useEffect(() => {
    if (dashboardView === 'createWizard') {
      setWizardScrollTop(1)
      const timer = setTimeout(() => setWizardScrollTop(0), 20)
      fetchChengduDistricts().then(setDistrictOptions).catch(() => {})
      fetchContentTags().then(setContentTags).catch(() => {})
      return () => clearTimeout(timer)
    }
  }, [wizardStep, dashboardView])

  useEffect(() => () => {
    if (mapRegionChangeTimerRef.current) {
      clearTimeout(mapRegionChangeTimerRef.current)
    }
  }, [])
  const [editorFormats, setEditorFormats] = useState<Record<string, string | boolean>>({})

  // Filter panel state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [filterState, setFilterState] = useState<ActivityFilterState>({
    auditStatuses: [],
    channels: [],
    lifeStatuses: [],
    startAt: '',
    endAt: '',
  })
  const [appliedFilter, setAppliedFilter] = useState<ActivityFilterState>({
    auditStatuses: [],
    channels: [],
    lifeStatuses: [],
    startAt: '',
    endAt: '',
  })

  // Calendar panel state
  const now = new Date()
  const [calendarPanelOpen, setCalendarPanelOpen] = useState(false)
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth())
  const [calendarStart, setCalendarStart] = useState<string | null>(null)
  const [calendarEnd, setCalendarEnd] = useState<string | null>(null)
  // 票券售卖时间的时刻部分（HH:mm），仅 scheduleRange 使用
  const [calendarStartTime, setCalendarStartTime] = useState('00:00')
  const [calendarEndTime, setCalendarEndTime] = useState('23:59')
  const [calendarSelectingEnd, setCalendarSelectingEnd] = useState(false)
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('filter')
  const [calendarSpecId, setCalendarSpecId] = useState<string | null>(null)

  // Crop modal state
  const [cropModal, setCropModal] = useState<{ open: boolean; slotKey: string; uploading: boolean; sourceImage: string; imageWidth: number; imageHeight: number }>({
    open: false,
    slotKey: '',
    uploading: false,
    sourceImage: '',
    imageWidth: 0,
    imageHeight: 0,
  })
  const [cropImagePos, setCropImagePos] = useState({ x: 0, y: 0 })
  const [cropImageScale, setCropImageScale] = useState(1)
  const cropTouchRef = useRef<{ startX: number; startY: number; lastX: number; lastY: number; lastDist: number; moving: boolean }>({
    startX: 0, startY: 0, lastX: 0, lastY: 0, lastDist: 0, moving: false,
  })

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; title: string; body: string }>({
    visible: false,
    title: '',
    body: '',
  })

  const applyInitialDebugState = (params: Record<string, unknown>) => {
    const view = getStringParam(params.adminView || params.view)
    const keyword = getStringParam(params.activityKeyword || params.keyword)
    const filterPreset = getStringParam(params.filterPreset || params.filterState)
    const calendarPreset = getStringParam(params.calendar)
    const dateStart = getStringParam(params.dateStart || params.startAt)
    const dateEnd = getStringParam(params.dateEnd || params.endAt)
    const verifyModalStatus = getVerifyStatusFromParams(params)
    const openAddVerifier = getStringParam(params.addVerifier) === '1'
    const openManualInput = getStringParam(params.manualVerify || params.manualInput) === '1'

    setVerifyInitialModalStatus(undefined)
    setVerifyInitialAddVerifierOpen(false)
    setVerifyInitialManualInputOpen(false)
    setVerifyInitialScan(undefined)
    setHomeAddVerifierOpen(false)

    if (view === 'activities') {
      setDashboardView('activities')
      setActivityTab(getActivityTabFromParams(params))
    } else if (view === 'createWizard') {
      setDashboardView('createWizard')
      setActivityTab('mine')
      setWizardReturnView('activities')
      setWizardStep(getDebugStepFromParams(params))
      setDraft(createDevPrefillDraft())
    } else if (view === 'verify') {
      setDashboardView('verify')
      setVerifyActivityTitle(getStringParam(params.activityTitle))
      setVerifyInitialModalStatus(verifyModalStatus)
      setVerifyInitialAddVerifierOpen(openAddVerifier)
      setVerifyInitialManualInputOpen(openManualInput)
      if (getStringParam(params.source) === 'userScan') {
        const pendingScan = Taro.getStorageSync(PENDING_VERIFIER_SCAN_KEY) as VerifierScanPayload | undefined
        Taro.removeStorageSync(PENDING_VERIFIER_SCAN_KEY)
        if (pendingScan?.qrCode) {
          setVerifyInitialScan({
            qrCode: String(pendingScan.qrCode),
            ...(Number(pendingScan.activityId) > 0 ? { activityId: Number(pendingScan.activityId) } : {}),
          })
        }
      }
    } else if (view === 'verifyRecords') {
      setDashboardView('verifyRecords')
      loadVerifyRecords(getStringParam(params.recordsMode || params.mockMode))
    } else if (view === 'settlementApply') {
      setDashboardView('settlementApply')
      // 运营城市固定为成都：省份/城市锁定，仅开放成都区县选择
      setSettlementForm({ ...getSettlementApplyInitialForm(), province: CHENGDU_PROVINCE, city: CHENGDU_CITY })
      fetchChengduDistricts().then(setSettlementDistricts).catch(() => {})
    } else if (view === 'auditPending' || view === 'auditRejected') {
      setDashboardView(view)
    } else if (view === 'more' || view === 'account' || view === 'home') {
      setDashboardView(view)
      setHomeAddVerifierOpen(view === 'home' && openAddVerifier)
    }

    if (keyword) setActivityKeyword(keyword)

    if (filterPreset === 'selected') {
      setFilterPanelOpen(true)
      setFilterState({
        auditStatuses: ['draft', 'pending'],
        channels: [],
        lifeStatuses: [],
        startAt: dateStart,
        endAt: dateEnd,
      })
    } else if (getStringParam(params.filterPanel) === '1') {
      setFilterPanelOpen(true)
    }

    if (calendarPreset === 'filter') {
      setDashboardView('activities')
      setActivityTab('mine')
      setFilterPanelOpen(true)
      setCalendarTarget('filter')
      setCalendarSpecId(null)
      setCalendarYear(2026)
      setCalendarMonth(3)
      setCalendarStart(dateStart || null)
      setCalendarEnd(dateEnd || null)
      setCalendarSelectingEnd(Boolean(dateStart && !dateEnd))
      setCalendarPanelOpen(true)
    }
  }

  useEffect(() => {
    try {
      const windowInfo = Taro.getWindowInfo()
      const menuInfo = Taro.getMenuButtonBoundingClientRect()
      const statusBarHeight = windowInfo.statusBarHeight || 20
      const navBarHeight = menuInfo.top > statusBarHeight
        ? (menuInfo.top - statusBarHeight) * 2 + menuInfo.height
        : 44
      const menuButtonRightGap = windowInfo.screenWidth && menuInfo.left
        ? Math.max(windowInfo.screenWidth - menuInfo.left, 92)
        : 92

      setNavMetrics({ statusBarHeight, navBarHeight, menuButtonRightGap })
    } catch (_) {
      setNavMetrics({ statusBarHeight: 20, navBarHeight: 44, menuButtonRightGap: 92 })
    }

    const initOrganizerPage = async () => {
      const params = Taro.getCurrentInstance().router?.params || {}
      const initialView = getStringParam(params.adminView || params.view)
      const isEntryView = initialView === 'settlementApply' || initialView === 'verify' || initialView === 'verifyRecords'
      const userInfo = Taro.getStorageSync('userInfo')
      const roleOverride = getOrganizerRoleOverride(params)

      if (!isEntryView && !isMerchantUser(userInfo, roleOverride)) {
        try {
          const audit = await fetchOrganizerAuditStatus()
          setOrganizerType(audit.type === 'venue' ? 'venue' : 'party')
          if (audit.status === 2 && Number(audit.enabled ?? 1) === 0) {
            setDashboardView('accountStopped')
            return
          }
          if (audit.status === 2) {
            const nextUserInfo = { ...(userInfo || {}), is_merchant: true, merchant_status: 'approved' }
            Taro.setStorageSync('userInfo', nextUserInfo)
          } else {
            setDashboardView('nonMerchant')
            return
          }
        } catch {
          setDashboardView('nonMerchant')
          return
        }
      } else if (!isEntryView) {
        // 已登录商家走快捷通道时也要拿到入驻类型，创建向导按它锁定活动类型
        fetchOrganizerAuditStatus()
          .then((audit) => setOrganizerType(audit.type === 'venue' ? 'venue' : 'party'))
          .catch(() => {})
      }

      applyInitialDebugState(params)
      loadDashboardData(getMockModeFromParams(params))
    }

    void initOrganizerPage()
  }, [])

  const loadDashboardData = async (mode: OrganizerMockMode = 'default') => {
    setPageState('loading')
    try {
      const data = await fetchDashboard({ mode })
      setActivityItems(data.activities)
      setHomeStats(data.stats)
      setPageState(data.activities.length > 0 ? 'loaded' : 'empty')
    } catch {
      setPageState('error')
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    }
  }

  const handleOrganizerPasswordLogin = async () => {
    const phone = organizerLoginPhone.trim()
    const password = organizerLoginPassword.trim()
    if (!phone || !password) {
      Taro.showToast({ title: '请输入账号和密码', icon: 'none' })
      return
    }
    setOrganizerLoginSubmitting(true)
    try {
      await loginOrganizerPassword(phone, password)
      const audit = await fetchOrganizerAuditStatus()
      setOrganizerType(audit.type === 'venue' ? 'venue' : 'party')
      if (audit.status === 2 && Number(audit.enabled ?? 1) === 0) {
        Taro.showToast({ title: '商家账号已停用', icon: 'none' })
        setDashboardView('accountStopped')
        return
      }
      if (audit.status !== 2) {
        Taro.showToast({ title: '该账号尚未通过主办方审核', icon: 'none' })
        setDashboardView(audit.status === 3 ? 'auditRejected' : 'auditPending')
        return
      }
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setOrganizerLoginPassword('')
      setDashboardView('home')
      await loadDashboardData(getMockModeFromParams(Taro.getCurrentInstance().router?.params || {}))
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '登录失败，请检查账号密码', icon: 'none' })
    } finally {
      setOrganizerLoginSubmitting(false)
    }
  }

  const refreshActivityCenter = async () => {
    setActivityRefreshing(true)
    try {
      await loadDashboardData(getMockModeFromParams(Taro.getCurrentInstance().router?.params || {}))
    } finally {
      setActivityRefreshing(false)
    }
  }

  const loadOrganizerOrders = async () => {
    setOrdersLoading(true)
    try {
      const orders = await fetchOrders({
        withdrawStatus: orderWithdrawStatus || undefined,
        salesChannel: orderSalesChannel || undefined,
      })
      setOrderItems(orders)
    } catch {
      Taro.showToast({ title: '订单数据加载失败', icon: 'none' })
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadSalesSummary = async () => {
    try {
      setSalesSummaryData(await fetchSalesSummary())
    } catch (error: any) {
      // 透出后端真实报错（vConsole 可见），便于定位是建表缺失还是接口异常
      console.error('销售数据加载失败:', error?.code, error?.message, error?.data)
      Taro.showToast({ title: error?.message ? `销售数据：${error.message}` : '销售数据加载失败', icon: 'none' })
    }
  }

  // 进入活动中心的销售数据/实时订单子页时拉取真实数据
  useEffect(() => {
    if (dashboardView !== 'activities') return
    if (activityTab === 'sales') void loadSalesSummary()
    if (activityTab === 'orders') void loadOrganizerOrders()
  }, [dashboardView, activityTab, orderWithdrawStatus, orderSalesChannel])

  const loadVerifyRecords = async (mode = '') => {
    setVerifyRecordsState('loading')
    try {
      if (mode === 'empty') {
        setVerifyRecords([])
        setVerifyRecordsState('empty')
        return
      }
      const list = await fetchVerifyRecords()
      setVerifyRecords(list)
      setVerifyRecordsState(list.length > 0 ? 'loaded' : 'empty')
    } catch {
      setVerifyRecords([])
      setVerifyRecordsState('error')
      Taro.showToast({ title: '核销记录加载失败', icon: 'none' })
    }
  }

  const filteredActivities = useMemo(() => {
    return activityItems.filter((item) => {
      const matchKeyword = item.title.toLowerCase().includes(activityKeyword.trim().toLowerCase())

      const hasAuditFilter = appliedFilter.auditStatuses.length > 0
      const hasChannelFilter = appliedFilter.channels.length > 0
      const hasLifeFilter = appliedFilter.lifeStatuses.length > 0
      const hasDateFilter = Boolean(appliedFilter.startAt || appliedFilter.endAt)

      if (!hasAuditFilter && !hasChannelFilter && !hasLifeFilter && !hasDateFilter) {
        return matchKeyword
      }

      const matchAudit = !hasAuditFilter || appliedFilter.auditStatuses.includes(item.auditStatus)
      const matchLife = !hasLifeFilter || appliedFilter.lifeStatuses.includes(item.lifeStatus)

      let matchDate = true
      if (hasDateFilter && item.eventStartAt) {
        if (appliedFilter.startAt && item.eventStartAt < appliedFilter.startAt) matchDate = false
        if (appliedFilter.endAt && item.eventStartAt > appliedFilter.endAt) matchDate = false
      }

      return matchKeyword && matchAudit && matchLife && matchDate
    })
  }, [activityItems, appliedFilter, activityKeyword])

  const salesSummary = salesSummaryData || EMPTY_SALES_SUMMARY

  const pageBodyStyle = useMemo(
    () => ({
      flex: 1,
      minHeight: 0,
    }),
    [],
  )

  const rememberCurrentView = () => {
    if (isDashboardTab(dashboardView)) {
      setViewHistory((prev) => [...prev, dashboardView])
      setWizardReturnView(dashboardView)
    }
  }

  const openCreateWizard = (step = 1) => {
    rememberCurrentView()
    setDashboardView('createWizard')
    setActivityTab('mine')
    setWizardStep(step)
    const nextDraft = ALLOW_ORGANIZER_DEBUG ? createDevPrefillDraft() : createInitialDraft()
    // 活动类型跟随入驻类型，向导内不可切换
    nextDraft.type = organizerType
    // 场地用经营时间：默认带出主办方资料里的经营时间
    if (organizerType === 'venue' && !nextDraft.businessHours && organizerBusinessHours) {
      nextDraft.businessHours = organizerBusinessHours
    }
    setDraft(nextDraft)
  }

  const openEditableActivityWizard = async (item: OrganizerActivityItem) => {
    rememberCurrentView()
    Taro.showLoading({ title: '加载中...', mask: true })
    try {
      const fullDraft = await fetchActivityDetail(item.id)
      // 详情可能不含 type（旧数据），保持按入驻类型锁定
      fullDraft.type = organizerType
      // 保存原始详情快照，供提交时做字段级 diff（后端以“字段是否出现”判断修改）
      fullDraft.originalDraft = { ...fullDraft }
      setDashboardView('createWizard')
      setActivityTab('mine')
      setWizardStep(1)
      setDraft(fullDraft)
      // 历史概要注入富文本编辑器（编辑器未就绪则挂起，等 onReady 后再 setContents）
      if (fullDraft.summary) {
        const editor = editorContextRef.current
        if (editor) editor.setContents({ html: fullDraft.summary })
        else pendingEditorHtmlRef.current = fullDraft.summary
      }
    } catch {
      Taro.showToast({ title: '活动详情加载失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const openActivityDetail = (activityId: string) => {
    if (!activityId) {
      Taro.showToast({ title: '活动信息缺失', icon: 'none' })
      return
    }

    const currentActivity = activityItems.find((item) => item.id === activityId)
    if (currentActivity?.auditStatus === 'draft' || currentActivity?.auditStatus === 'rejected') {
      void openEditableActivityWizard(currentActivity)
      return
    }

    Taro.navigateTo({ url: `/pages/activity/index?id=${encodeURIComponent(activityId)}` })
  }

  const openEditActivity = (activityId: string) => {
    const currentActivity = activityItems.find((item) => item.id === activityId)
    if (!currentActivity) {
      Taro.showToast({ title: '活动信息缺失', icon: 'none' })
      return
    }
    void openEditableActivityWizard(currentActivity)
  }

  const handleBottomTabChange = (nextView: OrganizerDashboardTab) => {
    if (dashboardView !== nextView && isDashboardTab(dashboardView)) {
      setViewHistory((prev) => [...prev, dashboardView])
    }
    if (dashboardView === 'more' && nextView !== 'more') {
      setMoreCloseCreateSignal((prev) => prev + 1)
      setMoreCreateOpen(false)
    }
    setDashboardView(nextView)
  }

  const openVerifyView = (activityTitle?: string) => {
    rememberCurrentView()
    setVerifyActivityTitle(activityTitle || '')
    setVerifyInitialModalStatus(undefined)
    setVerifyInitialAddVerifierOpen(false)
    setVerifyInitialManualInputOpen(false)
    setDashboardView('verify')
  }

  const openHomeAddVerifier = () => {
    setHomeAddVerifierOpen(true)
  }

  const resetHomeVerifierForm = () => {
    setHomeVerifierName('')
    setHomeVerifierPhone('')
  }

  const submitHomeVerifier = async () => {
    if (!homeVerifierName.trim()) {
      Taro.showToast({ title: '请输入核销人员姓名', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(homeVerifierPhone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    Taro.showLoading({ title: '提交中...', mask: true })
    try {
      await createVerifier({ name: homeVerifierName.trim(), phone: homeVerifierPhone.trim() })
      setHomeAddVerifierOpen(false)
      resetHomeVerifierForm()
      Taro.showToast({ title: '添加成功', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '添加失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const openActivityCenterTab = (nextTab: OrganizerActivityTab) => {
    rememberCurrentView()
    setDashboardView('activities')
    setActivityTab(nextTab)
  }

  const handleOrganizerBack = () => {
    if (previewOpen) {
      setPreviewOpen(false)
      return
    }
    if (cropModal.open) {
      setCropModal((prev) => ({ ...prev, open: false, uploading: false }))
      return
    }
    if (calendarPanelOpen) {
      setCalendarPanelOpen(false)
      return
    }
    if (filterPanelOpen) {
      setFilterPanelOpen(false)
      return
    }
    if (dashboardView === 'createWizard') {
      if (wizardStep > 1) {
        setWizardStep((prev) => Math.max(prev - 1, 1))
        return
      }
      setDashboardView(wizardReturnView)
      setViewHistory((prev) => prev.slice(0, -1))
      return
    }
    if (dashboardView === 'more' && moreCreateOpen) {
      setMoreCloseCreateSignal((prev) => prev + 1)
      setMoreCreateOpen(false)
      return
    }
    if (dashboardView === 'settlementApply' || dashboardView === 'settlementPending' || dashboardView === 'verifyRecords') {
      Taro.navigateBack({ delta: 1 })
      return
    }
    const previousView = viewHistory[viewHistory.length - 1]
    if (previousView && previousView !== dashboardView) {
      setViewHistory((prev) => prev.slice(0, -1))
      setDashboardView(previousView)
      return
    }
    Taro.navigateBack({ delta: 1 })
  }

  const renderCustomNav = () => (
    <View
      className="organizer-custom-nav"
      style={{
        height: `${navMetrics.statusBarHeight + navMetrics.navBarHeight}px`,
        paddingTop: `${navMetrics.statusBarHeight}px`,
        paddingRight: `${navMetrics.menuButtonRightGap}px`,
      }}
    >
      <View className="organizer-nav-back" onClick={handleOrganizerBack}>
        <Image className="organizer-nav-back-img" src={iconBack} mode="aspectFit" />
      </View>
      <Text className="organizer-nav-title">管理后台</Text>
    </View>
  )

  // Filter handlers
  const toggleFilterAuditStatus = (status: OrganizerAuditStatus) => {
    setFilterState((prev) => ({
      ...prev,
      auditStatuses: prev.auditStatuses.includes(status)
        ? prev.auditStatuses.filter((s) => s !== status)
        : [...prev.auditStatuses, status],
    }))
  }

  const toggleFilterChannel = (channel: Channel) => {
    setFilterState((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const toggleFilterLifeStatus = (status: OrganizerActivityLifeStatus) => {
    setFilterState((prev) => ({
      ...prev,
      lifeStatuses: prev.lifeStatuses.includes(status)
        ? prev.lifeStatuses.filter((s) => s !== status)
        : [...prev.lifeStatuses, status],
    }))
  }

  const resetFilter = () => {
    setFilterState({ auditStatuses: [], channels: [], lifeStatuses: [], startAt: '', endAt: '' })
    setAppliedFilter({ auditStatuses: [], channels: [], lifeStatuses: [], startAt: '', endAt: '' })
    setFilterPanelOpen(false)
  }

  const applyFilter = () => {
    setAppliedFilter({ ...filterState })
    setFilterPanelOpen(false)
  }

  // Calendar helpers
  const openCalendar = (
    target: CalendarTarget,
    specId?: string,
    options?: { initialValue?: string; onApply?: (value: string) => void },
  ) => {
    setCalendarTarget(target)
    setCalendarSpecId(specId || null)
    calendarApplyCallbackRef.current = options?.onApply || null

    const selectedSpec = specId ? draft.ticketSpecs.find((item) => item.id === specId) : null
    const initialRange = target === 'filter'
      ? { start: filterState.startAt, end: filterState.endAt }
      : target === 'dateRange'
        ? parseDateRangeValue(draft.dateRange)
        : target === 'scheduleRange' && selectedSpec
          ? { start: selectedSpec.startAt, end: selectedSpec.endAt }
          : parseDateRangeValue(options?.initialValue || '')

    const d = initialRange.start ? new Date(initialRange.start.replace(/-/g, '/')) : new Date()
    setCalendarYear(d.getFullYear())
    setCalendarMonth(d.getMonth())
    setCalendarStart(initialRange.start || null)
    setCalendarEnd(initialRange.end || null)
    // 已有开始日期（如默认今天）时，打开面板后的第一次点击直接选结束日期
    setCalendarSelectingEnd(Boolean(initialRange.start))
    // 票券售卖时间：从已有值解析时刻，缺省 00:00 / 23:59
    const timeOf = (value?: string | null) => {
      const m = String(value || '').match(/(\d{1,2}):(\d{1,2})/)
      return m ? `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}` : ''
    }
    const isScheduleRange = target === 'scheduleRange'
    setCalendarStartTime(isScheduleRange ? (timeOf(initialRange.start) || '00:00') : '00:00')
    setCalendarEndTime(isScheduleRange ? (timeOf(initialRange.end) || '23:59') : '23:59')
    setCalendarPanelOpen(true)
  }

  const handleCalendarPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear((prev) => prev - 1)
    } else {
      setCalendarMonth((prev) => prev - 1)
    }
  }

  const handleCalendarNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear((prev) => prev + 1)
    } else {
      setCalendarMonth((prev) => prev + 1)
    }
  }

  const handleCalendarDayClick = (day: number) => {
    const dateStr = formatDate(calendarYear, calendarMonth, day)
    if (!calendarSelectingEnd) {
      setCalendarStart(dateStr)
      setCalendarEnd(null)
      setCalendarSelectingEnd(true)
    } else {
      if (dateStr < (calendarStart || '')) {
        // 点到比开始更早的日期：把它当作新的开始日期重新选择，避免陷入"只能清除重选"的死局
        setCalendarStart(dateStr)
        setCalendarEnd(null)
        return
      }
      setCalendarEnd(dateStr)
      setCalendarSelectingEnd(false)
    }
  }

  const clearCalendar = () => {
    setCalendarStart(null)
    setCalendarEnd(null)
    setCalendarSelectingEnd(false)
  }

  const applyCalendar = () => {
    if ((calendarStart && !calendarEnd) || (!calendarStart && calendarEnd)) {
      Taro.showToast({ title: '请选择完整时间范围', icon: 'none' })
      return
    }
    const rangeStr = calendarStart && calendarEnd ? `${calendarStart} · ${calendarEnd}` : ''
    if (calendarTarget === 'filter') {
      setFilterState((prev) => ({ ...prev, startAt: calendarStart || '', endAt: calendarEnd || '' }))
    } else if (calendarTarget === 'dateRange') {
      updateDraft('dateRange', rangeStr)
    } else if (calendarTarget === 'scheduleRange' && calendarSpecId) {
      // 日期 + 时刻合成完整开售/截止时间（提交时 ensureTimeSuffix 会补齐秒）
      const withTime = (date: string, time: string) => (date ? `${date} ${time}` : '')
      updateTicketSpec(calendarSpecId, {
        startAt: withTime(calendarStart || '', calendarStartTime),
        endAt: withTime(calendarEnd || '', calendarEndTime),
      })
    } else if (calendarTarget === 'customRange') {
      calendarApplyCallbackRef.current?.(rangeStr)
    }
    calendarApplyCallbackRef.current = null
    setCalendarPanelOpen(false)
  }

  // Draft helpers
  const updateDraft = <K extends keyof CreateActivityDraft>(key: K, value: CreateActivityDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const formatLocationFallback = (latitude: number, longitude: number) =>
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`

  const resolveLocationDistrict = (address: string, adminInfo?: LocationAdminInfo) => {
    const district = adminInfo?.district?.trim()
    if (district) return district
    return districtOptions.find((item) => address.includes(item)) || ''
  }

  const extractMapCenter = (detail: any) => {
    const center = detail?.centerLocation || detail?.center || detail || {}
    const latitude = center.latitude ?? center.lat
    const longitude = center.longitude ?? center.lng
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
    return { latitude, longitude }
  }

  const applyDraftLocation = (latitude: number, longitude: number, address: string, adminInfo?: LocationAdminInfo) => {
    const nextAddress = address.trim() || formatLocationFallback(latitude, longitude)
    const nextDistrict = resolveLocationDistrict(nextAddress, adminInfo)
    setDraft((prev) => ({
      ...prev,
      latitude,
      longitude,
      district: nextDistrict || prev.district,
      address: nextAddress,
      locationName: nextAddress,
    }))
  }

  const handleMapLocationPick = async (latitude: number, longitude: number) => {
    const requestSeq = ++locationRequestSeqRef.current
    const fallbackAddress = formatLocationFallback(latitude, longitude)
    applyDraftLocation(latitude, longitude, fallbackAddress)

    try {
      const result = await reverseGeocode(latitude, longitude)
      if (requestSeq !== locationRequestSeqRef.current) return
      const nearestPoi = result.pois?.[0]
      const nextAddress = nearestPoi?.name || result.address || fallbackAddress
      applyDraftLocation(latitude, longitude, nextAddress, {
        province: result.province || nearestPoi?.province,
        city: result.city || nearestPoi?.city,
        district: result.district || nearestPoi?.district,
      })
    } catch (error) {
      console.warn('Organizer reverse geocode failed:', error)
    }
  }

  const handleAddressCommit = async (value: string) => {
    // 刚通过候选选中了地点：失焦不再用旧文本做模糊搜索覆盖
    if (addressJustPickedRef.current) {
      addressJustPickedRef.current = false
      return
    }
    const requestSeq = ++locationRequestSeqRef.current
    const keyword = value.trim()
    // 失焦保留原文：只静默解析坐标与所属区县，不覆盖用户输入的文本
    updateDraft('address', keyword)
    updateDraft('locationName', keyword)
    if (!keyword) return

    try {
      const pois = await searchByKeyword(
        keyword,
        draft.latitude ?? DEFAULT_LOCATION.latitude,
        draft.longitude ?? DEFAULT_LOCATION.longitude,
        1,
      )
      if (requestSeq !== locationRequestSeqRef.current) return
      const target = pois[0]
      if (!target) return
      setDraft((prev) => ({
        ...prev,
        latitude: target.latitude,
        longitude: target.longitude,
        district:
          resolveLocationDistrict(prev.address, {
            province: target.province,
            city: target.city,
            district: target.district,
          }) || prev.district,
      }))
    } catch (error) {
      console.warn('Organizer address search failed:', error)
    }
  }

  // 地址输入联想：防抖后按关键字搜索 POI 并展示候选
  const searchAddressSuggestions = (keyword: string) => {
    if (addressSearchTimerRef.current) clearTimeout(addressSearchTimerRef.current)
    addressSearchTimerRef.current = setTimeout(async () => {
      const trimmed = keyword.trim()
      if (trimmed.length < 2) {
        setAddressSuggestions([])
        return
      }
      const seq = ++locationRequestSeqRef.current
      try {
        const pois = await searchByKeyword(
          trimmed,
          draft.latitude ?? DEFAULT_LOCATION.latitude,
          draft.longitude ?? DEFAULT_LOCATION.longitude,
          8,
        )
        if (seq !== locationRequestSeqRef.current) return
        setAddressSuggestions(pois)
      } catch {
        setAddressSuggestions([])
      }
    }, 350)
  }

  const handlePickAddressSuggestion = (poi: POIItem) => {
    // 让在途的模糊提交/搜索失效，避免覆盖用户选定的结果
    locationRequestSeqRef.current += 1
    addressJustPickedRef.current = true
    setAddressSuggestions([])
    applyDraftLocation(poi.latitude, poi.longitude, poi.name || poi.address, {
      province: poi.province,
      city: poi.city,
      district: poi.district,
    })
  }

  const syncMapCenterToDraft = () => {
    if (!mapContextRef.current) {
      mapContextRef.current = Taro.createMapContext('organizer-location-map')
    }
    mapContextRef.current.getCenterLocation({
      success: (res: any) => {
        const center = extractMapCenter(res)
        if (center) {
          void handleMapLocationPick(center.latitude, center.longitude)
        }
      },
      fail: (error: any) => {
        console.warn('Organizer map center lookup failed:', error)
      },
    })
  }

  const handleMapRegionChange = (event: any) => {
    const detail = event.detail || {}
    if (detail.type !== 'end') return
    // 只响应用户手势拖动/缩放；程序性改中心点（如选择地址后重定位）会触发
    // causedBy 为空或 'update' 的 regionchange，若不拦截会形成"改中心→逆地理→改中心"循环，
    // 真机上表现为地址栏一直被刷新
    if (!['drag', 'scale', 'gesture'].includes(String(detail.causedBy || ''))) return

    if (mapRegionChangeTimerRef.current) {
      clearTimeout(mapRegionChangeTimerRef.current)
    }

    const center = extractMapCenter(detail)
    mapRegionChangeTimerRef.current = setTimeout(() => {
      if (center) {
        void handleMapLocationPick(center.latitude, center.longitude)
      } else {
        syncMapCenterToDraft()
      }
    }, 200)
  }

  const resolveEditorContext = (cb: (ctx: any) => void) => {
    Taro.createSelectorQuery()
      .select('#activity-summary-editor')
      .context((res) => {
        if (res?.context) { cb(res.context); return }
        // Retry once after a short delay (editor may not be fully ready)
        setTimeout(() => {
          Taro.createSelectorQuery()
            .select('#activity-summary-editor')
            .context((res2) => {
              if (res2?.context) cb(res2.context)
            })
            .exec()
        }, 300)
      })
      .exec()
  }

  const handleEditorReady = () => {
    resolveEditorContext((ctx) => {
      editorContextRef.current = ctx
      // 编辑回填：编辑器就绪后注入历史概要，避免用户一编辑就丢失原介绍
      if (pendingEditorHtmlRef.current) {
        ctx.setContents({ html: pendingEditorHtmlRef.current })
        pendingEditorHtmlRef.current = ''
      }
    })
  }

  const execEditorTool = (editor: any, tool: EditorTool) => {
    if (tool.action === 'command') {
      if (tool.key === 'undo') editor.undo()
      else if (tool.key === 'redo') editor.redo()
      else if (tool.key === 'clear') {
        editor.clear()
        updateDraft('summary', '')
      }
      return
    }
    if (tool.key === 'fontSize') {
      Taro.showActionSheet({ itemList: EDITOR_FONT_SIZES.map((s) => s.label) })
        .then((res) => {
          editor.format('fontSize', EDITOR_FONT_SIZES[res.tapIndex].value)
        })
        .catch(() => {})
      return
    }
    if (tool.key === 'color') {
      Taro.showActionSheet({ itemList: EDITOR_COLORS.map((c) => c.label) })
        .then((res) => {
          editor.format('color', EDITOR_COLORS[res.tapIndex].value)
        })
        .catch(() => {})
      return
    }
    if (tool.action === 'format') {
      editor.format(tool.key, tool.value || '')
    }
  }

  const handleEditorToolTap = (tool: EditorTool) => {
    const editor = editorContextRef.current
    if (editor) {
      execEditorTool(editor, tool)
    } else {
      // Fallback: resolve context on demand
      resolveEditorContext((ctx) => {
        editorContextRef.current = ctx
        execEditorTool(ctx, tool)
      })
    }
  }

  const updateTicketSpec = (specId: string, patch: Partial<TicketSpec>) => {
    setDraft((prev) => ({
      ...prev,
      ticketSpecs: prev.ticketSpecs.map((item) => (item.id === specId ? { ...item, ...patch } : item)),
    }))
  }

  const handleChooseDateRange = (target: 'dateRange' | 'scheduleRange', specId?: string) => {
    openCalendar(target, specId)
  }

  // Upload with crop modal
  const handleOpenCropModal = async (slotKey: string) => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const tempFilePath = res.tempFilePaths[0]
      if (!tempFilePath) return
      // 活动详情长图在客户端按全宽长图滚动展示，不做固定比例裁剪，保留原图
      if (slotKey === 'detailLong') {
        updateDraft(
          'posterSlots',
          draft.posterSlots.map((slot) =>
            slot.key === slotKey ? { ...slot, fileName: `detailLong-${Date.now()}.png`, filePath: tempFilePath } : slot,
          ),
        )
        return
      }
      const info = await Taro.getImageInfo({ src: tempFilePath })
      setCropModal({ open: true, slotKey, uploading: false, sourceImage: tempFilePath, imageWidth: info.width, imageHeight: info.height })
      setCropImagePos({ x: 0, y: 0 })
      setCropImageScale(1)
    } catch (_) {
      // user cancelled
    }
  }

  const handleCropConfirm = async () => {
    if (!cropModal.sourceImage) return
    setCropModal((prev) => ({ ...prev, uploading: true }))

    try {
      const dims = CROP_DIMENSIONS[cropModal.slotKey] || { width: 500, height: 500 }
      const { imageWidth, imageHeight } = cropModal
      if (!imageWidth || !imageHeight) throw new Error('图片尺寸获取失败')

      // aspect-fill：图片始终铺满裁剪框，裁切窗口与框同比例，输出不变形
      const baseScale = Math.max(dims.width / imageWidth, dims.height / imageHeight)
      const scaledW = imageWidth * baseScale * cropImageScale
      const scaledH = imageHeight * baseScale * cropImageScale

      // image top-left in crop-area coords (centered + user pan)
      const imgX = (dims.width - scaledW) / 2 + cropImagePos.x
      const imgY = (dims.height - scaledH) / 2 + cropImagePos.y

      // map crop frame (0,0,dims.w,dims.h) → source image rect
      const srcX = Math.max(0, -imgX / (baseScale * cropImageScale))
      const srcY = Math.max(0, -imgY / (baseScale * cropImageScale))
      const srcW = Math.min(imageWidth - srcX, dims.width / (baseScale * cropImageScale))
      const srcH = Math.min(imageHeight - srcY, dims.height / (baseScale * cropImageScale))

      // Step 5: draw to offscreen Canvas 2D
      const wxApi: any = Taro
      const canvas = wxApi.createOffscreenCanvas?.({ type: '2d', width: dims.width, height: dims.height })
        || (typeof (globalThis as any).wx !== 'undefined' && (globalThis as any).wx.createOffscreenCanvas?.({ type: '2d', width: dims.width, height: dims.height }))
      if (!canvas) throw new Error('无法创建离屏 Canvas')

      const ctx = canvas.getContext('2d')
      const img = canvas.createImage()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = cropModal.sourceImage
      })

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, dims.width, dims.height)

      // Step 6: export canvas to temp file
      const tempPath: string = await new Promise((resolve, reject) => {
        Taro.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: dims.width,
          height: dims.height,
          destWidth: dims.width * 2,
          destHeight: dims.height * 2,
          fileType: 'png',
          success: (r) => resolve(r.tempFilePath),
          fail: (err) => reject(err),
        })
      })

      const fileName = `${cropModal.slotKey}-${Date.now()}.png`
      updateDraft(
        'posterSlots',
        draft.posterSlots.map((slot) =>
          slot.key === cropModal.slotKey ? { ...slot, fileName, filePath: tempPath } : slot,
        ),
      )
      setCropModal({ open: false, slotKey: '', uploading: false, sourceImage: '', imageWidth: 0, imageHeight: 0 })
    } catch (err) {
      console.error('[Crop] error:', err)
      Taro.showToast({ title: '裁剪失败，请重试', icon: 'none' })
      setCropModal((prev) => ({ ...prev, uploading: false }))
    }
  }

  const handleCropCancel = () => {
    setCropModal({ open: false, slotKey: '', uploading: false, sourceImage: '', imageWidth: 0, imageHeight: 0 })
  }

  // Crop touch handlers — drag to pan, pinch to zoom
  const getTouchDist = (touches: any[]) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 平移/缩放后钳制，保证图片始终铺满裁剪框（aspect-fill），避免露边
  const clampCropPos = (pos: { x: number; y: number }, scale: number) => {
    const dims = CROP_DIMENSIONS[cropModal.slotKey] || { width: 500, height: 500 }
    const { imageWidth, imageHeight } = cropModal
    if (!imageWidth || !imageHeight) return pos
    const baseScale = Math.max(dims.width / imageWidth, dims.height / imageHeight)
    const maxX = Math.max(0, (imageWidth * baseScale * scale - dims.width) / 2)
    const maxY = Math.max(0, (imageHeight * baseScale * scale - dims.height) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    }
  }

  const onCropTouchStart = (e: any) => {
    const touches = e.touches
    if (!touches || touches.length === 0) return
    const t = cropTouchRef.current
    t.lastX = touches[0].clientX
    t.lastY = touches[0].clientY
    t.lastDist = touches.length >= 2 ? getTouchDist(touches) : 0
    t.moving = false
  }

  const onCropTouchMove = (e: any) => {
    const touches = e.touches
    if (!touches || touches.length === 0) return
    const t = cropTouchRef.current

    // Pinch zoom (two fingers)
    if (touches.length >= 2) {
      const newDist = getTouchDist(touches)
      if (t.lastDist > 0) {
        const ratio = newDist / t.lastDist
        setCropImageScale((prev) => {
          const next = Math.min(3, Math.max(1, prev * ratio))
          setCropImagePos((pos) => clampCropPos(pos, next))
          return next
        })
      }
      t.lastDist = newDist
      t.lastX = (touches[0].clientX + touches[1].clientX) / 2
      t.lastY = (touches[0].clientY + touches[1].clientY) / 2
      t.moving = true
      return
    }

    // Single finger drag
    t.lastDist = 0
    const dx = touches[0].clientX - t.lastX
    const dy = touches[0].clientY - t.lastY
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) t.moving = true
    setCropImagePos((prev) => clampCropPos({ x: prev.x + dx, y: prev.y + dy }, cropImageScale))
    t.lastX = touches[0].clientX
    t.lastY = touches[0].clientY
  }

  const onCropTouchEnd = (e: any) => {
    const t = cropTouchRef.current
    // When lifting from 2 fingers to 1, reset lastDist so next 2-finger gesture re-initializes
    if ((e.touches?.length || 0) < 2) {
      t.lastDist = 0
    }
  }

  const previewModel = useMemo(() => {
    const selectedSpec = draft.ticketSpecs.find((item) => item.id === draft.selectedSpecId)
    const enabledSpec = draft.ticketSpecs.find((item) => item.enabled)
    const priceSource = selectedSpec || enabledSpec || draft.ticketSpecs[0]
    const posterSlot = draft.posterSlots.find((slot) => slot.key === 'detailPoster')
    const title = draft.name.trim()
    const summary = draft.summary.trim()
    const dateText = draft.dateRange.trim().replace(/\s*[~·]\s*/g, ' - ')
    const price = String(priceSource?.price ?? '').trim()

    return {
      title: title || '请输入活动名称',
      titlePlaceholder: !title,
      dateText: dateText || '请选择活动时间',
      datePlaceholder: !dateText,
      summary: summary || '请输入活动概要',
      summaryPlaceholder: !summary,
      price: price || '0',
      posterUrl: posterSlot?.filePath || '',
    }
  }, [draft])

  const locationMapModel = useMemo(() => {
    const latitude = draft.latitude ?? DEFAULT_LOCATION.latitude
    const longitude = draft.longitude ?? DEFAULT_LOCATION.longitude

    return {
      latitude,
      longitude,
      markers: [
        {
          id: 1,
          latitude,
          longitude,
          iconPath: mapPinFallbackIcon,
          width: 34,
          height: 34,
          anchor: { x: 0.5, y: 1 },
        },
      ],
    }
  }, [draft.latitude, draft.longitude])

  const handleMockUploadQualification = async () => {
    const itemList = ['模拟上传文件', '清空当前文件']
    const res = await Taro.showActionSheet({ itemList })
    if (res.tapIndex === 1) {
      updateDraft('qualificationFileName', '')
      return
    }
    const fileName = `activity-license-${Date.now()}.pdf`
    updateDraft('qualificationFileName', fileName)
  }

  // Ticket spec handlers
  const handleAddTicketSpec = () => {
    const nextName = draft.quickTicketName.trim()
    if (!nextName) {
      Taro.showToast({ title: '请输入票务名称', icon: 'none' })
      return
    }

    if (draft.ticketSpecs.some((item) => item.name === nextName)) {
      Taro.showToast({ title: '该票务已存在', icon: 'none' })
      return
    }

    const nextSpec: TicketSpec = {
      id: `ticket-${Date.now()}`,
      name: nextName,
      enabled: false,
      startAt: organizerTicketSpecs[0].startAt,
      endAt: organizerTicketSpecs[0].endAt,
      price: '0',
      stock: '0',
      limit: '0',
      attendees: '1',
    }

    setDraft((prev) => ({
      ...prev,
      quickTicketName: '',
      selectedSpecId: nextSpec.id,
      ticketSpecs: [...prev.ticketSpecs, nextSpec],
    }))
  }

  const handleDeleteTicketSpec = (specId: string) => {
    const nextList = draft.ticketSpecs.filter((item) => item.id !== specId)
    if (nextList.length === 0) {
      Taro.showToast({ title: '至少保留一个票务规格', icon: 'none' })
      return
    }

    setDraft((prev) => ({
      ...prev,
      selectedSpecId: prev.selectedSpecId === specId ? nextList[0].id : prev.selectedSpecId,
      ticketSpecs: nextList,
    }))
  }

  const handleClearTicketSpecs = () => {
    setDraft((prev) => ({
      ...prev,
      quickTicketName: '',
      ticketSpecs: prev.ticketSpecs.map((item) => ({
        ...item,
        price: '0',
        stock: '0',
        limit: '0',
        attendees: '1',
      })),
    }))
  }

  // Validation
  const validateStep = (step: number) => {
    if (step === 1) {
      if (!draft.name.trim()) {
        Taro.showToast({ title: '请输入活动名称', icon: 'none' })
        return false
      }
      if (!draft.shareTitle.trim()) {
        Taro.showToast({ title: '请输入分享标题', icon: 'none' })
        return false
      }
      if (!draft.summary.trim()) {
        Taro.showToast({ title: '请填写活动概要', icon: 'none' })
        return false
      }
    }

    if (step === 3 && !ALLOW_ORGANIZER_DEBUG) {
      const missingSlots = draft.posterSlots.filter((slot) => !slot.fileName)
      if (missingSlots.length > 0) {
        const missingLong = missingSlots.find((s) => s.key === 'detailLong')
        const missingOthers = missingSlots.filter((s) => s.key !== 'detailLong')
        if (missingLong) {
          setToast({ visible: true, title: '温馨提示', body: '请上传活动详情长图' })
        } else if (missingOthers.length > 0) {
          setToast({ visible: true, title: '温馨提示', body: '请上传列表页海报/活动分享图' })
        }
        return false
      }
    }

    if (step === 4 && draft.ticketSpecs.length === 0) {
      Taro.showToast({ title: '请至少配置一个票务规格', icon: 'none' })
      return false
    }

    return true
  }

  const handleNextStep = () => {
    if (!validateStep(wizardStep)) return
    setWizardStep((prev) => Math.min(prev + 1, 5))
  }

  const handleSubmitAudit = async () => {
    // 场地流程第 3 步（上传海报）即最后一步，提交前校验海报
    if (!validateStep(draft.type === 'venue' ? 3 : 5)) return
    Taro.showLoading({ title: '提交中...', mask: true })
    try {
      const activityId = await submitActivityDraft(draft)
      // 场地类型：把向导里确认的经营时间同步回主办方资料（venue 详情页展示用）
      if (draft.type === 'venue' && draft.businessHours.trim()) {
        try {
          await updateOrganizerBusinessHours(draft.businessHours.trim())
        } catch {
          // 同步失败不阻断发布流程
        }
      }
      const nextActivity = { ...createActivityFromDraft(draft), id: String(activityId), auditStatus: 'pending' as const }
      setActivityItems((prev) => [nextActivity, ...prev])
      setAuditPendingSource('activity')
      setDashboardView('auditPending')
      setActivityTab('mine')
      setWizardStep(1)
      setDraft(createInitialDraft())
      // 提交成功后弹"扫码催审"弹窗（派对/场地都弹）
      setUrgeAuditModalOpen(true)
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '提交失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const renderAuditStatusView = (status: 'pending' | 'rejected') => {
    const isPending = status === 'pending'
    const isActivityAudit = isPending && auditPendingSource === 'activity'
    return (
      <View className="audit-status-page">
        <View className="audit-status-top">
          <View className="audit-status-back" onClick={handleOrganizerBack}>
            <Image className="audit-status-back-img" src={iconBack} mode="aspectFit" />
          </View>
        </View>

        <View className={`audit-status-content ${isPending ? 'pending' : 'rejected'}`}>
          {isPending ? (
            <View className="audit-status-title-row">
              <View className="audit-clock-icon">
                <View className="audit-clock-hand hour" />
                <View className="audit-clock-hand minute" />
              </View>
              <Text className="audit-status-title">审核中</Text>
            </View>
          ) : (
            <Text className="audit-status-title">入驻申请审核未通过！</Text>
          )}

          <Text className="audit-status-main">
            {isPending
              ? (isActivityAudit ? '活动已提交成功，平台审核通过后将自动上架。' : '资质提交已成功接收，正在加急审核中。')
              : '失败原因：主办名称含敏感词/侵权品牌名'}
          </Text>
          {isPending && !isActivityAudit && <Text className="audit-status-main second">预计时长： 1-3个工作日</Text>}

          <Text className="audit-status-tip">
            {isPending
              ? (isActivityAudit
                ? '温馨提示： 审核进度可在活动列表中查看，如有疑问请联系客服。'
                : '温馨提示： 审核期间请勿重复提交，结果将通过短信通知您。如有疑问请联系客服。')
              : '温馨提示： 请修改主办名称，避免使用他人注册商标或未授权的品牌名'}
          </Text>
        </View>

        <View className="audit-status-footer">
          <View
            className="audit-status-primary-btn"
            onClick={() => setDashboardView(isPending ? (isActivityAudit ? 'activities' : 'nonMerchant') : 'settlementApply')}
          >
            <Text>{isPending ? '我知道了' : '重新申请'}</Text>
          </View>
          {!isPending && (
            <Text className="audit-status-cancel" onClick={() => setDashboardView('nonMerchant')}>取消</Text>
          )}
        </View>
      </View>
    )
  }

  const renderNonMerchantView = () => (
    <View className="non-merchant-state">
      <View className="non-merchant-card">
        <Text className="non-merchant-title">商家账号登录</Text>
        <Text className="non-merchant-desc">使用已审核通过的主办方账号密码进入管理后台。</Text>
        <View className="organizer-login-form">
          <Input
            className="organizer-login-input"
            value={organizerLoginPhone}
            type="number"
            maxlength={11}
            placeholder="请输入手机号"
            placeholderClass="organizer-login-placeholder"
            onInput={(event) => setOrganizerLoginPhone(String(event.detail.value || ''))}
          />
          <Input
            className="organizer-login-input"
            value={organizerLoginPassword}
            password
            placeholder="请输入登录密码"
            placeholderClass="organizer-login-placeholder"
            onInput={(event) => setOrganizerLoginPassword(String(event.detail.value || ''))}
          />
        </View>
        <Button
          className="primary-pill-button"
          loading={organizerLoginSubmitting}
          disabled={organizerLoginSubmitting}
          onClick={handleOrganizerPasswordLogin}
        >
          登录管理后台
        </Button>
        <Button className="secondary-pill-button organizer-login-back" onClick={() => Taro.navigateBack({ delta: 1 })}>
          返回个人中心
        </Button>
      </View>
    </View>
  )

  const renderAccountStoppedView = () => (
    <View className="non-merchant-state">
      <View className="non-merchant-card">
        <Text className="non-merchant-title">商家账号已停用</Text>
        <Text className="non-merchant-desc">该商家账号当前不可使用，请联系平台管理员处理。</Text>
        <Button className="secondary-pill-button organizer-login-back" onClick={() => setDashboardView('nonMerchant')}>
          切换其它商家账号
        </Button>
        <Button className="secondary-pill-button organizer-login-back" onClick={() => Taro.navigateBack({ delta: 1 })}>
          返回个人中心
        </Button>
      </View>
    </View>
  )

  const updateSettlementForm = <K extends keyof SettlementApplyForm>(key: K, value: SettlementApplyForm[K]) => {
    setSettlementForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleUploadSettlementLogo = async () => {
    if (settlementLogoUploading) return
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const filePath = res.tempFilePaths[0]
      if (!filePath) return

      setSettlementLogoUploading(true)
      Taro.showLoading({ title: '上传中...', mask: true })
      const url = await uploadOrganizerAsset(filePath, 'organizer_logo')
      updateSettlementForm('logo', url)
      Taro.showToast({ title: '上传成功', icon: 'success' })
    } catch (error: any) {
      const message = String(error?.errMsg || '')
      if (!message.includes('cancel')) {
        Taro.showToast({ title: error?.message || '上传失败，请重试', icon: 'none' })
      }
    } finally {
      setSettlementLogoUploading(false)
      Taro.hideLoading()
    }
  }

  const submitSettlementApply = async () => {
    if (!settlementForm.name.trim()) {
      Taro.showToast({ title: '请输入主办方名称', icon: 'none' })
      return
    }
    if (!settlementForm.district) {
      Taro.showToast({ title: '请选择区县', icon: 'none' })
      return
    }

    setSettlementSubmitting(true)
    try {
      await submitSettlementApplyRequest(settlementForm)
      setDashboardView('settlementPending')
      setAuditPendingSource('settlement')
      setUrgeAuditModalOpen(true)
    } catch (error: any) {
      const message = String(error?.message || '')
      if (message.includes('审核中') || message.includes('重复提交')) {
        setDashboardView('settlementPending')
        Taro.showToast({ title: '申请正在审核中', icon: 'none' })
        return
      }
      Taro.showToast({ title: message || '提交失败，请重试', icon: 'none' })
    } finally {
      setSettlementSubmitting(false)
    }
  }

  const renderSettlementApplyView = () => (
    <ScrollView className="organizer-scroll settlement-scroll" scrollY>
      <View className="settlement-card">
        <Text className="settlement-title">主办方入驻申请</Text>
        <Text className="settlement-desc">填写主办方名称、Logo 和所在地区，提交后将进入审核。</Text>

        <Text className="settlement-field-label">*名称</Text>
        <View className="settlement-input-shell">
          <Input
            className="settlement-input"
            placeholder="请输入入驻名称"
            placeholderClass="dark-placeholder"
            value={settlementForm.name}
            onInput={(event) => updateSettlementForm('name', event.detail.value)}
          />
        </View>

        <Text className="settlement-field-label">Logo 图片</Text>
        <View className="settlement-upload-shell" onClick={handleUploadSettlementLogo}>
          <Text className="settlement-upload-title">
            {settlementLogoUploading ? '上传中...' : settlementForm.logo ? '已上传 Logo 图片' : '点击上传 Logo 图片'}
          </Text>
          <Text className="settlement-upload-tip">
            {settlementForm.logo || '上传成功后自动解析并回填 logo URL。'}
          </Text>
        </View>

        <Text className="settlement-field-label">*所在地区</Text>
        <View className="settlement-input-shell">
          <Input
            className="settlement-input"
            disabled
            value="四川省 / 成都市"
          />
        </View>
        <Picker
          mode="selector"
          range={settlementDistricts}
          onChange={(event) => {
            const index = Number(event?.detail?.value)
            if (Number.isInteger(index) && index >= 0 && index < settlementDistricts.length) {
              setSettlementForm((prev) => ({
                ...prev,
                province: CHENGDU_PROVINCE,
                city: CHENGDU_CITY,
                district: settlementDistricts[index],
              }))
            }
          }}
        >
          <View className="settlement-input-shell">
            <Input
              className="settlement-input"
              disabled
              placeholder="请选择区县"
              placeholderClass="dark-placeholder"
              value={settlementForm.district}
            />
          </View>
        </Picker>
      </View>

      <View className="settlement-footer">
        <Button className="white-pill-button" loading={settlementSubmitting} disabled={settlementSubmitting} onClick={submitSettlementApply}>
          提交申请
        </Button>
      </View>
      <View className="organizer-safe-bottom" />
    </ScrollView>
  )

  const renderSettlementPendingView = () => (
    <View className="settlement-pending-page">
      <View className="settlement-pending-card">
        <Text className="settlement-pending-title">审核中</Text>
        <Text className="settlement-pending-main">入驻申请已提交，正在等待审核。</Text>
        <Text className="settlement-pending-tip">预计时长：1-3个工作日。审核通过后用户中心入口将切换为主办中心。</Text>
      </View>
      <Button className="settlement-pending-btn" onClick={() => Taro.navigateBack({ delta: 1 })}>
        我知道了
      </Button>
    </View>
  )

  const renderVerifyRecordsView = () => (
    <View className="verify-records-page">
      <ScrollView className="verify-records-scroll" scrollY>
        <View className="verify-records-header">
          <Text className="verify-records-title">核销记录</Text>
          <Text className="verify-records-count">{verifyRecords.length ? `已核销（${verifyRecords.length}）` : ''}</Text>
        </View>

        {verifyRecordsState === 'loading' && <Text className="verify-records-state">加载中...</Text>}
        {verifyRecordsState === 'empty' && <Text className="verify-records-state">暂无核销记录</Text>}
        {verifyRecordsState === 'error' && (
          <View className="verify-records-state error" onClick={() => loadVerifyRecords()}>
            <Text>加载失败，点击重试</Text>
          </View>
        )}
        {verifyRecordsState === 'loaded' && verifyRecords.map((record) => (
          <View key={record.id} className="verify-record-card">
            <Image className="verify-record-cover" src={record.cover} mode="aspectFill" />
            <View className="verify-record-main">
              <View className="verify-record-title-row">
                <Text className="verify-record-name">{record.activityTitle}</Text>
                <Text className="verify-record-status">核销成功</Text>
              </View>
              <Text className="verify-record-meta">{record.ticketType} {record.quantity}张</Text>
              <Text className="verify-record-meta">实名信息：{record.realName} {record.idCard}</Text>
              <Text className="verify-record-time">{record.verifiedAt}</Text>
            </View>
          </View>
        ))}
        <View className="organizer-safe-bottom" />
      </ScrollView>
    </View>
  )

  // Dev-only: jump directly to any wizard step
  const handleDebugStepJump = (step: number) => {
    if (!ALLOW_ORGANIZER_DEBUG) return
    setWizardStep(step)
  }

  const renderStepHeader = () => {
    // 场地发布不含票券配置与活动资质步骤（后端对场地会拒绝 ticket_specs）
    const steps = draft.type === 'venue' ? [1, 2, 3] : [1, 2, 3, 4, 5]
    return (
      <View className="wizard-steps">
        {steps.map((step, index) => {
          const title = STEP_TITLES[step - 1]
          const completed = step < wizardStep
          const active = step === wizardStep
          return (
            <View key={title} className="wizard-step-item">
              <View
                className={`wizard-step-dot ${completed ? 'completed' : ''} ${active ? 'active' : ''} ${ALLOW_ORGANIZER_DEBUG ? 'debug-jump' : ''}`}
                onClick={() => handleDebugStepJump(step)}
              >
                <Text>{completed ? '✓' : index + 1}</Text>
              </View>
              <Text className={`wizard-step-label ${active ? 'active' : ''}`}>{title}</Text>
              {index < steps.length - 1 ? <View className={`wizard-step-line ${step < wizardStep ? 'completed' : ''}`} /> : null}
            </View>
          )
        })}
      </View>
    )
  }

  const renderStepOne = () => (
    <View className="wizard-section">
      <View className="field-block">
        <Text className="field-label">活动类型</Text>
        <View className="activity-type-options">
          <View className="activity-type-option active">
            <Text className="activity-type-option-text active">{draft.type === 'venue' ? '场地' : '派对'}</Text>
          </View>
        </View>
        <Text className="activity-type-fixed-hint">活动类型与入驻类型一致，不可切换</Text>
      </View>

      <View className="field-block">
        <Text className="field-label">活动名称</Text>
        <View className="dark-input-shell">
          <Input
            className="dark-input"
            maxlength={80}
            placeholder="请输入"
            placeholderClass="dark-placeholder"
            value={draft.name}
            onInput={(event) => updateDraft('name', event.detail.value)}
          />
          <Text className="field-counter">{draft.name.length} / 80</Text>
        </View>
      </View>

      <View className="field-block">
        <Text className="field-label">分享标题</Text>
        <View className="dark-input-shell">
          <Input
            className="dark-input"
            maxlength={20}
            placeholder="请输入"
            placeholderClass="dark-placeholder"
            value={draft.shareTitle}
            onInput={(event) => updateDraft('shareTitle', event.detail.value)}
          />
          <Text className="field-counter">{draft.shareTitle.length} / 20</Text>
        </View>
      </View>

      {draft.type === 'venue' ? (
        <View className="field-block">
          <Text className="field-label">经营时间</Text>
          <View className="biz-hours-row">
            <Picker
              mode="time"
              value={parseBusinessHours(draft.businessHours).start}
              onChange={(event) => {
                const start = String(event.detail.value)
                updateDraft('businessHours', formatBusinessHours(start, parseBusinessHours(draft.businessHours).end))
              }}
            >
              <View className="picker-shell biz-hours-picker">
                <Text className="picker-text">{parseBusinessHours(draft.businessHours).start}</Text>
              </View>
            </Picker>
            <Text className="biz-hours-sep">至</Text>
            <Picker
              mode="time"
              value={parseBusinessHours(draft.businessHours).end}
              onChange={(event) => {
                const end = String(event.detail.value)
                updateDraft('businessHours', formatBusinessHours(parseBusinessHours(draft.businessHours).start, end))
              }}
            >
              <View className="picker-shell biz-hours-picker">
                <Text className="picker-text">{parseBusinessHours(draft.businessHours).end}</Text>
              </View>
            </Picker>
            {parseBusinessHours(draft.businessHours).end <= parseBusinessHours(draft.businessHours).start && (
              <Text className="biz-hours-overnight">次日</Text>
            )}
          </View>
          <Text className="biz-hours-tip">场地为长期展示，无需选择活动日期</Text>
        </View>
      ) : (
        <View className="field-block">
          <Text className="field-label">活动日期</Text>
          <View className="picker-shell" onClick={() => handleChooseDateRange('dateRange')}>
            <Text className={draft.dateRange ? 'picker-text' : 'dark-placeholder'}>{draft.dateRange || '请选择'}</Text>
            <AtIcon value="calendar" size={20} color="#fff" />
          </View>
        </View>
      )}

      <View className="field-block">
        <Text className="field-label">优惠标签（选填）</Text>
        <View className="tag-chip-row">
          {contentTags.length === 0 && <Text className="tag-chip-empty">暂无可用标签</Text>}
          {contentTags.map((tag) => {
            const active = draft.tagIds.includes(tag.id)
            return (
              <View
                key={tag.id}
                className={`tag-chip ${active ? 'active' : ''}`}
                onClick={() =>
                  updateDraft('tagIds', active ? draft.tagIds.filter((id) => id !== tag.id) : [...draft.tagIds, tag.id])
                }
              >
                <Text className={`tag-chip-text ${active ? 'active' : ''}`}>{tag.name}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {draft.type === 'party' && (
        <>
          <View className="toggle-card">
            <View>
              <Text className="toggle-title">实名模式</Text>
              <Text className="toggle-desc">该模式开启后对整场活动生效，一个证件可以买到你设定的张数。</Text>
            </View>
            <View
              className={`fake-switch ${draft.realNameRequired ? 'on' : ''}`}
              onClick={() => updateDraft('realNameRequired', !draft.realNameRequired)}
            />
          </View>

          <View className="toggle-card">
            <View>
              <Text className="toggle-title">未成年人校验</Text>
              <Text className="toggle-desc">开启该功能后用户下单默认输入身份证，18岁以下的未成年人将不能购票。</Text>
            </View>
            <View
              className={`fake-switch ${draft.minorCheckRequired ? 'on' : ''}`}
              onClick={() => updateDraft('minorCheckRequired', !draft.minorCheckRequired)}
            />
          </View>
        </>
      )}

      <View className="field-block">
        <Text className="field-label">活动概要</Text>
        <View className="editor-shell">
          <View className="editor-toolbar">
            {EDITOR_TOOL_ROWS.map((row, rowIndex) => (
              <View key={rowIndex} className="editor-toolbar-row">
                {row.map((tool) => {
                  const activeValue = editorFormats[tool.key]
                  const toolValue = tool.action === 'format' ? tool.value : undefined
                  const isActive = tool.action === 'format' && (toolValue ? activeValue === toolValue : Boolean(activeValue))
                  return (
                    <View
                      key={`${tool.key}-${toolValue || tool.label}`}
                      className={`editor-tool ${isActive ? 'active' : ''} ${tool.key === 'fontSize' ? 'wide' : ''}`}
                      onClick={() => handleEditorToolTap(tool)}
                    >
                      {tool.key === 'align' ? (
                        <View className={`editor-align-icon ${toolValue}`}>
                          <View className="editor-align-bar" />
                          <View className="editor-align-bar" />
                          <View className="editor-align-bar" />
                        </View>
                      ) : (
                        <Text className={`editor-tool-text ${tool.key}`}>{tool.label}</Text>
                      )}
                      {(tool.key === 'color' || tool.key === 'fontSize') && <Text className="editor-tool-caret">⌄</Text>}
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
          <View className="editor-content-frame">
            <Editor
              id="activity-summary-editor"
              className="editor-content native-editor"
              placeholder="请输入活动概要..."
              onReady={handleEditorReady}
              onInput={(e: any) => updateDraft('summary', e.detail.html)}
              onStatusChange={(e: any) => setEditorFormats(e.detail || {})}
            />
          </View>
        </View>
      </View>
    </View>
  )

  const renderStepTwo = () => (
    <View className="wizard-section">
      <View className="field-block">
        <Text className="field-label">地区</Text>
        <Picker
          mode="selector"
          range={districtOptions}
          onChange={(event) => {
            const index = Number(event?.detail?.value)
            const selected = districtOptions[index]
            if (selected) updateDraft('district', selected)
          }}
        >
          <View className="picker-shell">
            <Text className="picker-text">{draft.district}</Text>
            <AtIcon value="chevron-down" size={16} color="#c9c9c9" />
          </View>
        </Picker>
      </View>

      <View className="field-block">
        <Text className="field-label">当前坐标地址</Text>
        <View className="address-input-wrap">
          <View className="dark-input-shell full">
            <Input
              className="dark-input"
              placeholder="请输入地址"
              placeholderClass="dark-placeholder"
              value={draft.address}
              onInput={(event) => {
                updateDraft('address', event.detail.value)
                updateDraft('locationName', event.detail.value)
                searchAddressSuggestions(event.detail.value)
              }}
              onConfirm={(event) => {
                setAddressSuggestions([])
                handleAddressCommit(event.detail.value)
              }}
              onBlur={(event) => {
                setAddressSuggestions([])
                handleAddressCommit(event.detail.value)
              }}
            />
          </View>
          {addressSuggestions.length > 0 && (
            <View className="address-suggestion-list">
              {addressSuggestions.map((poi) => (
                <View
                  key={poi.id}
                  className="address-suggestion-item"
                  onTouchStart={() => handlePickAddressSuggestion(poi)}
                >
                  <Text className="address-suggestion-name">{poi.name}</Text>
                  <Text className="address-suggestion-addr">{poi.address}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View className="location-map-card">
        <TaroMap
          id="organizer-location-map"
          className="location-map"
          longitude={locationMapModel.longitude}
          latitude={locationMapModel.latitude}
          scale={16}
          markers={locationMapModel.markers}
          subkey={ORGANIZER_MAP_KEY}
          showLocation={false}
          enable3D={false}
          enableRotate={false}
          enableOverlooking={false}
          setting={{ enableSatellite: false, enableTraffic: false }}
          onError={(event) => {
            console.error('Organizer map error:', event)
          }}
          onRegionChange={handleMapRegionChange}
          onTap={(event) => {
            const latitude = event.detail?.latitude
            const longitude = event.detail?.longitude
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              void handleMapLocationPick(latitude, longitude)
            }
          }}
        />
        <View className="location-map-shade" />
      </View>
    </View>
  )

  const renderStepThree = () => (
    <View className="wizard-section poster-upload-section">
      {draft.posterSlots.map((slot) => (
        <View key={slot.key} className="upload-block">
          <Text className="field-label">{slot.label}</Text>
          {slot.fileName ? (
            <View className="upload-preview-card">
              {slot.filePath ? (
                <Image className="upload-preview-thumb" src={slot.filePath} mode="aspectFill" />
              ) : (
                <View className="upload-preview-thumb placeholder">
                  <AtIcon value="image" size={32} color="#666" />
                </View>
              )}
              <View className="upload-preview-info">
                <Text className="upload-preview-name">{slot.label}</Text>
                <Text className="upload-preview-hint">{slot.helper}</Text>
                <View className="upload-preview-actions">
                  <View className="upload-action-btn replace" onClick={() => handleOpenCropModal(slot.key)}>
                    <Text>替换</Text>
                  </View>
                  <View className="upload-action-btn delete" onClick={() => {
                    updateDraft('posterSlots', draft.posterSlots.map((s) =>
                      s.key === slot.key ? { ...s, fileName: '', filePath: '' } : s
                    ))
                  }}>
                    <Text>删除</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View className="upload-shell" onClick={() => handleOpenCropModal(slot.key)}>
              <Button className="upload-button">上传</Button>
              <Text className="upload-helper">{slot.helper}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  )

  const renderStepFour = () => (
    <View className="wizard-section">
      <View>
        <Text className="ticket-spec-title">规格配置</Text>
        <View className="ticket-config-card">
          <View className="field-block ticket-name-field">
            <Text className="ticket-config-label">规格名称</Text>
            <View className="dark-input-shell full compact ticket-name-input">
              <Input
                className="dark-input"
                value={draft.ticketTypeName}
                onInput={(event) => updateDraft('ticketTypeName', event.detail.value)}
              />
              <Text className="field-counter">{draft.ticketTypeName.length} / 15</Text>
            </View>
          </View>
          <Text className="tiny-tip">选项 {draft.ticketSpecs.length}/5</Text>

          <View className="ticket-chip-list">
            {draft.ticketSpecs.map((item) => (
              <View
                key={item.id}
                className={`ticket-chip ${draft.selectedSpecId === item.id ? 'selected' : ''}`}
                onClick={() => updateDraft('selectedSpecId', item.id)}
              >
                <Text>{item.name}</Text>
                <View
                  className="ticket-chip-delete"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDeleteTicketSpec(item.id)
                  }}
                >
                  <AtIcon value="trash" size={12} color="#a0a0a0" />
                </View>
              </View>
            ))}
          </View>

          <View className="ticket-add-row">
            <View className="dark-input-shell full compact">
              <Input
                className="dark-input"
                placeholder="其他选项"
                placeholderClass="dark-placeholder"
                value={draft.quickTicketName}
                onInput={(event) => updateDraft('quickTicketName', event.detail.value)}
              />
            </View>
            <Button className="green-button" onClick={handleAddTicketSpec}>
              新增
            </Button>
          </View>

          <View className="ticket-actions-row">
            <Button className="ghost-button" onClick={handleClearTicketSpecs}>
              全部清除
            </Button>
            <Button className="white-button" onClick={() => Taro.showToast({ title: '已保存当前规格', icon: 'success' })}>
              保存
            </Button>
          </View>
        </View>
      </View>

      {draft.ticketSpecs.map((item) => (
        <View key={item.id}>
          <Text className="ticket-spec-title ticket-detail-title-gap">规格详情</Text>
          <View className="ticket-detail-card">
            <View className="ticket-detail-header">
              <Text className="ticket-detail-heading">规格名称 · {item.name}</Text>
              <View className="ticket-enable-row">
                <Text className="ticket-enable-label">启用/禁用</Text>
                <View
                  className={`fake-switch ${item.enabled ? 'on' : ''}`}
                  onClick={() => updateTicketSpec(item.id, { enabled: !item.enabled })}
                />
              </View>
            </View>

            <View className="spec-form-row">
              <Text className="spec-form-label">开售时间</Text>
              <View className="picker-shell spec-form-control" onClick={() => handleChooseDateRange('scheduleRange', item.id)}>
                <Text className="picker-text">{item.startAt} ~ {item.endAt}</Text>
                <AtIcon value="calendar" size={18} color="#fff" />
              </View>
            </View>

            {[
              ['价格', 'price'],
              ['库存', 'stock'],
              ['限购', 'limit'],
              ['观演人', 'attendees'],
            ].map(([label, key]) => (
              <View key={key} className="spec-form-row">
                <Text className="spec-form-label">{label}</Text>
                <View className="dark-input-shell compact spec-form-control">
                  {key === 'price' && <Text className="price-prefix">¥</Text>}
                  <Input
                    className="dark-input"
                    type="number"
                    value={String(item[key as keyof TicketSpec])}
                    onInput={(event) => updateTicketSpec(item.id, { [key]: event.detail.value } as Partial<TicketSpec>)}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )

  const renderStepFive = () => (
    <View className="wizard-section">
      <View className="upload-block">
        <Text className="field-label">活动批文资质（选填）</Text>
        <View className="upload-shell qualification" onClick={() => handleMockUploadQualification()}>
          {draft.qualificationFileName ? (
            <Text className="upload-helper" style={{ color: '#35D34A' }}>已上传: {draft.qualificationFileName}</Text>
          ) : (
            <>
              <Button className="upload-button">上传</Button>
              <Text className="upload-helper">
                点击下载<Text className="template-link">《活动批文资质模板》</Text>
              </Text>
              <Text className="upload-helper qualification-helper">演出类活动需提交活动批文，文件大小2M以下。</Text>
            </>
          )}
        </View>
      </View>
    </View>
  )

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
    const firstDay = getFirstDayOfWeek(calendarYear, calendarMonth)
    const prevMonthDays = getDaysInMonth(
      calendarMonth === 0 ? calendarYear - 1 : calendarYear,
      calendarMonth === 0 ? 11 : calendarMonth - 1,
    )
    const monthLabel = `${calendarYear}年${calendarMonth + 1}月`
    const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

    const days: Array<{ day: number; isOtherMonth: boolean; dateStr: string }> = []
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isOtherMonth: true, dateStr: '' })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isOtherMonth: false, dateStr: formatDate(calendarYear, calendarMonth, d) })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isOtherMonth: true, dateStr: '' })
    }

    return (
      <View className="calendar-overlay" onClick={() => setCalendarPanelOpen(false)}>
        <View
          className={`calendar-panel ${calendarSelectingEnd ? 'active-selecting-end' : 'active-selecting-start'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <View className="calendar-title-row">
            <Text className="calendar-title">选择日期范围</Text>
            <Text className="calendar-close" onClick={() => setCalendarPanelOpen(false)}>关闭</Text>
          </View>

          <View className="calendar-range-preview">
            <View className={`calendar-date-card start ${!calendarSelectingEnd ? 'active' : ''}`}>
              <Text className="calendar-date-label">开始日期</Text>
              <Text className={`calendar-date-value ${calendarStart ? '' : 'placeholder'}`}>
                {calendarStart ? formatCalendarDisplayDate(calendarStart) : '请选择'}
              </Text>
            </View>
            <Text className="calendar-range-arrow">⇢</Text>
            <View className={`calendar-date-card end ${calendarSelectingEnd ? 'active' : ''}`}>
              <Text className="calendar-date-label">结束日期</Text>
              <Text className={`calendar-date-value ${calendarEnd ? '' : 'placeholder'}`}>
                {calendarEnd ? formatCalendarDisplayDate(calendarEnd) : '请选择'}
              </Text>
            </View>
          </View>

          {calendarTarget === 'scheduleRange' && (
            <View className="calendar-time-row">
              <Picker className="calendar-time-picker" mode="time" value={calendarStartTime} onChange={(e) => setCalendarStartTime(String(e.detail.value))}>
                <View className="calendar-time-card">
                  <Text className="calendar-date-label">开售时刻</Text>
                  <Text className="calendar-date-value">{calendarStartTime}</Text>
                </View>
              </Picker>
              <Text className="calendar-range-arrow">⇢</Text>
              <Picker className="calendar-time-picker" mode="time" value={calendarEndTime} onChange={(e) => setCalendarEndTime(String(e.detail.value))}>
                <View className="calendar-time-card">
                  <Text className="calendar-date-label">截止时刻</Text>
                  <Text className="calendar-date-value">{calendarEndTime}</Text>
                </View>
              </Picker>
            </View>
          )}

          <View className="calendar-month-row">
            <View className="calendar-month-btn" onClick={handleCalendarPrevMonth}>
              <AtIcon value="chevron-left" size={16} color="#fff" />
            </View>
            <Text className="calendar-month-title">{monthLabel}</Text>
            <View className="calendar-month-btn" onClick={handleCalendarNextMonth}>
              <AtIcon value="chevron-right" size={16} color="#fff" />
            </View>
          </View>

          <View className="calendar-weekday-row">
            {weekdayLabels.map((label) => (
              <View key={label} className="calendar-weekday-cell">
                <Text>{label}</Text>
              </View>
            ))}
          </View>

          <View className="calendar-day-grid">
            {days.map((item, index) => {
              const hasCompleteRange = Boolean(calendarStart && calendarEnd)
              const isRangeStart = Boolean(item.dateStr && item.dateStr === calendarStart)
              const isRangeEnd = Boolean(item.dateStr && item.dateStr === calendarEnd)
              const isInRange = Boolean(
                hasCompleteRange &&
                item.dateStr &&
                calendarStart &&
                calendarEnd &&
                item.dateStr > calendarStart &&
                item.dateStr < calendarEnd,
              )
              return (
                <View
                  key={index}
                  className={`calendar-day ${item.isOtherMonth ? 'other-month' : ''} ${isInRange ? 'in-range' : ''} ${isRangeStart ? 'range-start selected' : ''} ${isRangeEnd ? 'range-end selected' : ''}`}
                  onClick={() => !item.isOtherMonth && handleCalendarDayClick(item.day)}
                >
                  <Text>{item.day}</Text>
                </View>
              )
            })}
          </View>

          <View className="calendar-footer">
            <View className="calendar-clear-btn" onClick={clearCalendar}>
              <Text>清除</Text>
            </View>
            <View className="calendar-apply-btn" onClick={applyCalendar}>
              <Text>应用</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderCropModal = () => {
    const dims = CROP_DIMENSIONS[cropModal.slotKey] || { width: 500, height: 500 }
    return (
      <View className="crop-overlay">
        <View className="crop-panel" onClick={(e) => e.stopPropagation()}>
          <View className="crop-header">
            <Text className="crop-title">素材裁切</Text>
            <View className="crop-upload-btn" onClick={handleOpenCropModal.bind(null, cropModal.slotKey)}>
              <Text>上传图片</Text>
            </View>
          </View>
          <View
            className="crop-area"
            style={{ position: 'relative', width: dims.width, height: dims.height, overflow: 'hidden' }}
            onTouchStart={onCropTouchStart}
            onTouchMove={onCropTouchMove}
            onTouchEnd={onCropTouchEnd}
          >
            {cropModal.sourceImage ? (
              (() => {
                // 与确认裁切保持一致：aspect-fill 铺满裁剪框
                const baseScale = Math.max(dims.width / cropModal.imageWidth, dims.height / cropModal.imageHeight)
                const scaledW = cropModal.imageWidth * baseScale * cropImageScale
                const scaledH = cropModal.imageHeight * baseScale * cropImageScale
                const imgX = (dims.width - scaledW) / 2 + cropImagePos.x
                const imgY = (dims.height - scaledH) / 2 + cropImagePos.y
                return (
                  <View style={{ position: 'absolute', left: imgX, top: imgY, width: scaledW, height: scaledH }}>
                    <Image
                      className="crop-source-image"
                      src={cropModal.sourceImage}
                      mode="aspectFit"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                )
              })()
            ) : (
              <View className="crop-placeholder">
                <Text className="crop-placeholder-text">请选择图片</Text>
              </View>
            )}
            {/* Crop frame overlay */}
            <View className="crop-frame" style={{ position: 'absolute', top: 0, left: 0, width: dims.width, height: dims.height }}>
              <Text className="crop-dimensions">{dims.width} x {dims.height}</Text>
              <View className="crop-corner tl" />
              <View className="crop-corner tr" />
              <View className="crop-corner bl" />
              <View className="crop-corner br" />
            </View>
            {cropModal.uploading && (
              <View className="crop-uploading-mask">
                <Text className="crop-uploading-text">裁剪中...</Text>
              </View>
            )}
          </View>
          <View className="crop-hint">
            <Text className="crop-hint-text">拖动图片调整位置 · 双指缩放</Text>
          </View>
          <View className="crop-footer">
            <View className="crop-cancel-btn" onClick={handleCropCancel}>
              <Text>取消</Text>
            </View>
            <View className="crop-confirm-btn" onClick={handleCropConfirm}>
              <Text>确认</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderPreviewModal = () => {
    return (
      <View className="preview-overlay" onClick={() => setPreviewOpen(false)}>
        <View className="preview-panel" onClick={(e) => e.stopPropagation()}>
          <View className="preview-header">
            <Text className="preview-title">预览</Text>
            <View className="preview-selector">
              <Text className="preview-selector-text">活动详...</Text>
              <AtIcon value="chevron-down" size={12} color="#A0A0A0" />
            </View>
            <View onClick={() => setPreviewOpen(false)}>
              <Text className="preview-close">✕</Text>
            </View>
          </View>

          <View className="preview-phone-frame">
            <View className="preview-phone-screen">
              {previewModel.posterUrl ? (
                <Image className="preview-phone-bg" src={previewModel.posterUrl} mode="aspectFill" />
              ) : (
                <View className="preview-phone-bg" style={{ background: '#202322' }} />
              )}
              <View className="preview-phone-shade" />

              <View className="preview-phone-status">
                <Text className="preview-phone-time">08:34</Text>
                <View className="preview-phone-signal">
                  <Text style={{ fontSize: 22, color: '#fff' }}>4G</Text>
                  <View className="preview-phone-battery">
                    <View className="preview-phone-battery-fill" />
                  </View>
                </View>
              </View>

              <View className="preview-phone-nav">
                <AtIcon value="chevron-left" size={18} color="#fff" />
                <View className="preview-phone-capsule" />
              </View>

              <View className="preview-phone-info">
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text className={`preview-phone-event-title ${previewModel.titlePlaceholder ? 'is-placeholder' : ''}`}>
                      {previewModel.title}
                    </Text>
                    <Text className={`preview-phone-event-date ${previewModel.datePlaceholder ? 'is-placeholder' : ''}`}>
                      {previewModel.dateText}
                    </Text>
                  </View>
                  <AtIcon value="share-2" size={18} color="#fff" />
                </View>
                <Text className="preview-phone-event-price">
                  ¥{previewModel.price}
                </Text>
                <Text className={`preview-phone-event-summary ${previewModel.summaryPlaceholder ? 'is-placeholder' : ''}`}>
                  {previewModel.summary}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderWizardFooter = () => {
    // 场地流程到第 3 步（上传海报）即可提交审核，无活动资质步骤
    const isLastStep = draft.type === 'venue' ? wizardStep === 3 : wizardStep === 5
    return (
    <View className={`wizard-footer ${wizardStep === 1 ? 'single' : 'multi'}`}>
      {wizardStep > 1 ? (
        <Button
          className="text-button"
          onClick={() => setWizardStep((prev) => Math.max(prev - 1, 1))}
        >
          上一步
        </Button>
      ) : null}
      {!isLastStep ? (
        <Button className="white-pill-button" onClick={handleNextStep}>
          下一步
        </Button>
      ) : (
        <Button className="white-pill-button" onClick={handleSubmitAudit}>
          提交审核
        </Button>
      )}
    </View>
    )
  }

  const renderCreateWizard = () => (
    <ScrollView className="organizer-scroll wizard-scroll" scrollY key={`wizard-step-${wizardStep}`} scrollTop={wizardScrollTop}>
      {renderStepHeader()}
      {wizardStep === 1 && renderStepOne()}
      {wizardStep === 2 && renderStepTwo()}
      {wizardStep === 3 && renderStepThree()}
      {wizardStep === 4 && renderStepFour()}
      {wizardStep === 5 && renderStepFive()}

      <View className="wizard-action-row">
        {renderWizardFooter()}
      </View>
      <View className="organizer-safe-bottom wizard-safe-bottom" />
    </ScrollView>
  )

  const currentBottomTab = dashboardView === 'createWizard' ? 'activities' : dashboardView
  const currentRouteParams = Taro.getCurrentInstance().router?.params || {}
  const initialActivationFlowOpen = getStringParam(
    currentRouteParams.activationFlow || currentRouteParams.verifierActivation,
  ) === '1'

  return (
    <View className="organizer-page">
      {dashboardView !== 'verify' && dashboardView !== 'auditPending' && dashboardView !== 'auditRejected' && renderCustomNav()}
      <View className="organizer-body" style={pageBodyStyle}>
        {dashboardView === 'home' && (
          <OrganizerHomeView
            activityItems={activityItems}
            stats={homeStats}
            pageState={pageState}
            onRetry={loadDashboardData}
            onChangeTab={handleBottomTabChange}
            onOpenCreateWizard={() => openCreateWizard(1)}
            onOpenSales={() => openActivityCenterTab('sales')}
            onOpenVerifiers={() => openActivityCenterTab('verifiers')}
            onOpenAddVerifier={openHomeAddVerifier}
            onOpenTicketConfig={() => openCreateWizard(4)}
            onOpenVerify={() => openVerifyView()}
          />
        )}
        {dashboardView === 'activities' && (
          <OrganizerActivitiesView
            activityItems={activityItems}
            activityKeyword={activityKeyword}
            activityTab={activityTab}
            filteredActivities={filteredActivities}
            orderItems={orderItems}
            ordersLoading={ordersLoading}
            orderWithdrawStatus={orderWithdrawStatus}
            onChangeOrderWithdrawStatus={setOrderWithdrawStatus}
            orderSalesChannel={orderSalesChannel}
            onChangeOrderSalesChannel={setOrderSalesChannel}
            salesSummary={salesSummary}
            pageState={pageState}
            onRetry={loadDashboardData}
            onChangeTab={setActivityTab}
            onChangeKeyword={setActivityKeyword}
            onOpenCreateWizard={() => openCreateWizard(1)}
            onOpenActivityDetail={openActivityDetail}
            onEditActivity={openEditActivity}
            onRefresh={refreshActivityCenter}
            refreshing={activityRefreshing}
            filterPanelOpen={filterPanelOpen}
            filterState={filterState}
            onToggleFilterPanel={() => {
              if (filterPanelOpen) {
                setFilterPanelOpen(false)
              } else {
                setFilterState({ ...appliedFilter })
                setFilterPanelOpen(true)
              }
            }}
            onToggleAudit={toggleFilterAuditStatus}
            onToggleChannel={toggleFilterChannel}
            onToggleLife={toggleFilterLifeStatus}
            onResetFilter={resetFilter}
            onApplyFilter={applyFilter}
            getDisplayStatus={getDisplayStatus}
            onOpenCalendar={() => openCalendar('filter')}
            calendarStart={filterState.startAt}
            calendarEnd={filterState.endAt}
            initialActivationFlowOpen={initialActivationFlowOpen}
          />
        )}
            {dashboardView === 'more' && (
              <OrganizerMoreView
                onCreateModeChange={setMoreCreateOpen}
                closeCreateSignal={moreCloseCreateSignal}
                onChooseDateRange={(currentValue, onChoose) => {
                  openCalendar('customRange', undefined, { initialValue: currentValue, onApply: onChoose })
                }}
              />
            )}
        {dashboardView === 'account' && <OrganizerAccountView />}
        {dashboardView === 'verify' && (
          <OrganizerVerifyView
            activityTitle={verifyActivityTitle}
            initialModalStatus={verifyInitialModalStatus}
            initialAddVerifierOpen={verifyInitialAddVerifierOpen}
            initialManualInputOpen={verifyInitialManualInputOpen}
            initialScan={verifyInitialScan}
            onBack={handleOrganizerBack}
          />
        )}
        {dashboardView === 'verifyRecords' && renderVerifyRecordsView()}
        {dashboardView === 'settlementApply' && renderSettlementApplyView()}
        {dashboardView === 'settlementPending' && renderSettlementPendingView()}
        {dashboardView === 'nonMerchant' && renderNonMerchantView()}
        {dashboardView === 'accountStopped' && renderAccountStoppedView()}
        {dashboardView === 'auditPending' && renderAuditStatusView('pending')}
        {dashboardView === 'auditRejected' && renderAuditStatusView('rejected')}
        {dashboardView === 'createWizard' && renderCreateWizard()}
      </View>

      {dashboardView !== 'nonMerchant' && dashboardView !== 'accountStopped' && dashboardView !== 'verify' && dashboardView !== 'verifyRecords' && dashboardView !== 'settlementApply' && dashboardView !== 'settlementPending' && dashboardView !== 'auditPending' && dashboardView !== 'auditRejected' ? (
        <View className="dashboard-bottom-nav">
          {BOTTOM_TABS.map((item) => {
            const active = currentBottomTab === item.key
            return (
              <View
                key={item.key}
                className={`dashboard-bottom-item ${active ? 'active' : ''}`}
                onClick={() => handleBottomTabChange(item.key)}
              >
                {item.iconSrc ? (
                  <Image
                    className="dashboard-tab-icon-img"
                    src={active ? item.activeIconSrc || item.iconSrc : item.iconSrc}
                    mode="aspectFit"
                  />
                ) : (
                  <AtIcon value={item.icon as any} size={21} color={active ? '#FFFFFF' : '#666666'} />
                )}
                <Text>{item.label}</Text>
              </View>
            )
          })}
        </View>
      ) : null}

      {calendarPanelOpen && renderCalendar()}
      {cropModal.open && renderCropModal()}
      {previewOpen && renderPreviewModal()}

      {urgeAuditModalOpen && (
        <View className="urge-audit-overlay" onClick={() => setUrgeAuditModalOpen(false)}>
          <View className="urge-audit-card" onClick={(e) => e.stopPropagation()}>
            <Text className="urge-audit-title">提交审核成功</Text>
            <Text className="urge-audit-text">
              {auditPendingSource === 'activity'
                ? '扫码催一下，审核同事会收到本次活动的提醒。审核通过后，活动将自动上线。'
                : '扫码催一下，审核同事会收到本次入驻申请的提醒。审核通过后即可使用主办方功能。'}
            </Text>
            <Image className="urge-audit-qr" src={auditUrgeQrCode} mode="aspectFit" />
            <View className="urge-audit-btn" onClick={() => setUrgeAuditModalOpen(false)}>
              <Text className="urge-audit-btn-text">知道了</Text>
            </View>
          </View>
        </View>
      )}

      {homeAddVerifierOpen && (
        <View className="home-add-verifier-overlay" onClick={() => setHomeAddVerifierOpen(false)}>
          <View className="home-add-verifier-card" onClick={(e) => e.stopPropagation()}>
            <View className="home-add-verifier-header">
              <Text className="home-add-verifier-title">新增核销员</Text>
              <Text className="home-add-verifier-close" onClick={() => setHomeAddVerifierOpen(false)}>关闭</Text>
            </View>

            <Text className="home-add-verifier-label">所属主办方</Text>
            <Text className="home-add-verifier-org">{organizerName || '当前主办方'}</Text>

            <Text className="home-add-verifier-label">核销人员姓名</Text>
            <View className="home-add-verifier-input-shell">
              <Input
                className="home-add-verifier-input"
                placeholder="请输入"
                placeholderClass="dark-placeholder"
                value={homeVerifierName}
                onInput={(event) => setHomeVerifierName(event.detail.value)}
              />
            </View>

            <Text className="home-add-verifier-label">手机号</Text>
            <View className="home-add-verifier-input-shell">
              <Input
                className="home-add-verifier-input"
                type="number"
                maxlength={11}
                placeholder="请输入"
                placeholderClass="dark-placeholder"
                value={homeVerifierPhone}
                onInput={(event) => setHomeVerifierPhone(event.detail.value)}
              />
            </View>

            <View className="home-add-verifier-btns">
              <View className="home-add-verifier-clear-btn" onClick={resetHomeVerifierForm}>
                <Text className="home-add-verifier-clear-text">清空</Text>
              </View>
              <View className="home-add-verifier-submit-btn" onClick={submitHomeVerifier}>
                <Text className="home-add-verifier-submit-text">提交</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Toast bar */}
      {toast.visible && (
        <View
          className="toast-bar"
          style={{ top: `${navMetrics.statusBarHeight + navMetrics.navBarHeight + 8}px` }}
        >
          <View className="toast-icon">
            <Text>!</Text>
          </View>
          <View className="toast-content">
            <Text className="toast-title">{toast.title}</Text>
            <Text className="toast-body">{toast.body}</Text>
          </View>
          <View className="toast-close" onClick={() => setToast({ visible: false, title: '', body: '' })}>
            <Text>✕</Text>
          </View>
        </View>
      )}
    </View>
  )
}
