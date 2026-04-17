export type OrganizerDashboardView =
  | 'home'
  | 'activities'
  | 'more'
  | 'account'
  | 'createWizard'
  | 'nonMerchant'

export type OrganizerDashboardTab = Exclude<OrganizerDashboardView, 'createWizard' | 'nonMerchant'>

export type OrganizerActivityTab = 'activities' | 'sales' | 'orders' | 'verifiers'

export type OrganizerActivityStatus = 'published' | 'pending' | 'removed' | 'rejected'

export interface OrganizerActivityItem {
  id: string
  title: string
  cover: string
  publishedAt: string
  eventTime: string
  status: OrganizerActivityStatus
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
  activityTitle: string
  buyerName: string
  ticketType: string
  amount: number
  status: 'paid' | 'refunding' | 'used'
  createdAt: string
}

export interface VerifierItem {
  id: string
  name: string
  role: string
  status: 'active' | 'inactive'
  verifiedCount: number
  lastActive: string
}

export interface SalesDataItem {
  id: string
  label: string
  value: string
  trend: string
}

export interface TicketSpec {
  id: string
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
}

export interface CreateActivityDraft {
  name: string
  shareTitle: string
  dateRange: string
  realNameRequired: boolean
  minorCheckRequired: boolean
  summary: string
  district: string
  address: string
  ticketTypeName: string
  quickTicketName: string
  selectedSpecId: string
  posterSlots: UploadSlotState[]
  qualificationFileName: string
  ticketSpecs: TicketSpec[]
}
