import { Image, Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { useEffect, useState } from 'react'
import { CHENGDU_CITY, CHENGDU_DISTRICTS, CHENGDU_PROVINCE, fetchChengduDistricts } from '@/utils/chengdu-region'
import { chooseUserLocation } from '@/utils/user-location'
import {
  applyWithdraw,
  fetchAccount,
  fetchAuthPhone,
  fetchOrganizerProfile,
  fetchWithdrawalInfo,
  fetchWithdrawRecords,
  getWithdrawStatusLabel,
  resetAuthPassword,
  sendAuthCode,
  updateOrganizerBasic,
  updateOrganizerMarkerIcon,
  updateOrganizerRegion,
  updateOrganizerVenueProfile,
  updateWithdrawalInfo,
  uploadOrganizerAsset,
  type OrganizerProfileData,
} from '../adapter'
import type { OrganizerAccount, OrganizerWithdrawalInfo, OrganizerWithdrawRecord } from '../types'
import iconCert from '../../../../assets/organizer/icon-cert.png'
import iconEdit from '../../../../assets/organizer/icon-edit.png'
import iconLocation from '../../../../assets/organizer/icon-location.png'
import iconLogout from '../../../../assets/organizer/icon-logout.png'
import iconPassword from '../../../../assets/organizer/icon-password.png'
import iconWallet from '../../../../assets/organizer/icon-wallet.png'
import { CDN_IMAGES } from '@/utils/cdn'
import { MARKER_ICONS } from '@/utils/marker-icons'
import './index.scss'

const powerFlowLogo = CDN_IMAGES.powerFlowLogo

interface OrganizerAccountViewProps {
  onBack?: () => void
  onOpenWithdrawal?: () => void
}

const SETTING_GROUPS = [
  {
    title: '基本信息',
    rows: [
      { label: '主办方编辑', iconSrc: iconEdit, action: 'editOrganizer' },
      { label: '主办方区域', iconSrc: iconLocation, action: 'editRegion' },
    ],
  },
  {
    title: '账户信息',
    rows: [
      { label: '认证信息', iconSrc: iconCert, action: 'certification' },
      { label: '提现信息', iconSrc: iconWallet, action: 'withdrawal' },
      { label: '修改密码', iconSrc: iconPassword, action: 'changePassword' },
      { label: '退出登录', iconSrc: iconLogout, action: 'logout' },
    ],
  },
]

// 场地主办方（type=venue）：资料修改走二审流程，统一收进「场地资料」入口
const VENUE_SETTING_GROUPS = [
  {
    title: '基本信息',
    rows: [
      { label: '场地资料', iconSrc: iconLocation, action: 'venueProfile' },
    ],
  },
  SETTING_GROUPS[1],
]

/** 场地资料编辑表单（average_spend 按元填写，提交时换算为分） */
interface VenueProfileEditForm {
  name: string
  logo: string
  province: string
  city: string
  district: string
  marker_icon: string
  cover_image: string
  gallery: string[]
  description: string
  business_hours: string
  contact_name: string
  service_phone: string
  address: string
  latitude?: number
  longitude?: number
  average_spend: string
}

const emptyVenueProfileEditForm = (): VenueProfileEditForm => ({
  name: '',
  logo: '',
  province: CHENGDU_PROVINCE,
  city: CHENGDU_CITY,
  district: '',
  marker_icon: '',
  cover_image: '',
  gallery: [],
  description: '',
  business_hours: '',
  contact_name: '',
  service_phone: '',
  address: '',
  latitude: undefined,
  longitude: undefined,
  average_spend: '',
})

const fenToYuanInput = (fen?: number) => {
  const num = Number(fen)
  return Number.isFinite(num) && num > 0 ? String(num / 100) : ''
}

/** 场地资料编辑回显：公开资料为基础，存在待审/被驳回的修订快照时优先回填快照值 */
const buildVenueProfileEditForm = (profile: OrganizerProfileData): VenueProfileEditForm => {
  const form = emptyVenueProfileEditForm()
  const vp = profile.venueProfile
  form.name = profile.name
  form.logo = profile.logo
  form.province = profile.province || CHENGDU_PROVINCE
  form.city = profile.city || CHENGDU_CITY
  form.district = profile.district
  form.marker_icon = profile.markerIcon
  if (vp) {
    form.cover_image = vp.coverImage
    form.gallery = [...vp.gallery]
    form.description = vp.description
    form.business_hours = vp.businessHours || profile.businessHours
    form.contact_name = vp.contactName
    form.service_phone = vp.servicePhone
    form.address = vp.address
    form.latitude = vp.latitude
    form.longitude = vp.longitude
    form.average_spend = fenToYuanInput(vp.averageSpend)
  }
  const revision = profile.pendingProfileRevision
  if (revision) {
    if (typeof revision.name === 'string' && revision.name) form.name = revision.name
    if (typeof revision.logo === 'string' && revision.logo) form.logo = revision.logo
    if (typeof revision.marker_icon === 'string' && revision.marker_icon) form.marker_icon = revision.marker_icon
    if (typeof revision.province === 'string' && revision.province) form.province = revision.province
    if (typeof revision.city === 'string' && revision.city) form.city = revision.city
    if (typeof revision.district === 'string' && revision.district) form.district = revision.district
    if (typeof revision.cover_image === 'string') form.cover_image = revision.cover_image
    if (Array.isArray(revision.gallery)) form.gallery = revision.gallery.filter(Boolean)
    if (typeof revision.description === 'string') form.description = revision.description
    if (typeof revision.business_hours === 'string') form.business_hours = revision.business_hours
    if (typeof revision.contact_name === 'string') form.contact_name = revision.contact_name
    if (typeof revision.service_phone === 'string') form.service_phone = revision.service_phone
    if (typeof revision.address === 'string') form.address = revision.address
    const latitude = Number(revision.latitude)
    const longitude = Number(revision.longitude)
    if (Number.isFinite(latitude)) form.latitude = latitude
    if (Number.isFinite(longitude)) form.longitude = longitude
    const spend = Number(revision.average_spend)
    if (Number.isFinite(spend) && spend >= 0) form.average_spend = fenToYuanInput(spend)
  }
  return form
}

const fenToYuanText = (fen?: number) => (Number(fen || 0) / 100).toFixed(2)

const formatRecordTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function OrganizerAccountView(_props: OrganizerAccountViewProps) {
  const [withdrawalModal, setWithdrawalModal] = useState<'view' | 'edit' | null>(null)
  const [account, setAccount] = useState<OrganizerAccount | null>(null)
  const [withdrawal, setWithdrawal] = useState<OrganizerWithdrawalInfo | null>(null)
  const [editForm, setEditForm] = useState<OrganizerWithdrawalInfo>({
    payeeName: '',
    accountNumber: '',
    bankName: '',
  })
  const [withdrawRecords, setWithdrawRecords] = useState<OrganizerWithdrawRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyForm, setApplyForm] = useState({ amount: '', remark: '' })
  const [applying, setApplying] = useState(false)
  // 基本信息/账户信息四个设置项的弹窗状态
  const [settingModal, setSettingModal] = useState<'editOrganizer' | 'editRegion' | 'certification' | 'changePassword' | 'venueProfile' | null>(null)
  const [organizerForm, setOrganizerForm] = useState({ name: '', logo: '', marker_icon: '' })
  const [organizerProfileName, setOrganizerProfileName] = useState('')
  const [organizerSaving, setOrganizerSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [regionDistrict, setRegionDistrict] = useState('')
  const [regionDistricts, setRegionDistricts] = useState<string[]>(CHENGDU_DISTRICTS)
  const [regionSaving, setRegionSaving] = useState(false)
  // 主办方资料（type/场地资料/修订审核状态），venue 主办方的「场地资料」入口与审核提示用
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfileData | null>(null)
  const [venueForm, setVenueForm] = useState<VenueProfileEditForm>(emptyVenueProfileEditForm())
  const [venueSaving, setVenueSaving] = useState(false)
  const [venueImageUploading, setVenueImageUploading] = useState(false)
  const [pwdForm, setPwdForm] = useState({ phone: '', code: '', password: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)

  useEffect(() => {
    if (codeCountdown <= 0) return
    const timer = setTimeout(() => setCodeCountdown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [codeCountdown])

  useEffect(() => {
    let mounted = true
    Promise.all([fetchAccount(), fetchWithdrawalInfo()])
      .then(([accountData, withdrawalData]) => {
        if (!mounted) return
        setAccount(accountData)
        setWithdrawal(withdrawalData)
      })
      .catch(() => {
        if (!mounted) return
        Taro.showToast({ title: '账户信息加载失败', icon: 'none' })
      })
    fetchOrganizerProfile()
      .then((profile) => {
        if (!mounted) return
        setOrganizerProfile(profile)
      })
      .catch(() => {})
    fetchWithdrawRecords()
      .then((res) => {
        if (!mounted) return
        setWithdrawRecords(res.list)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setRecordsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const refreshWithdrawData = async () => {
    try {
      const [info, records] = await Promise.all([fetchWithdrawalInfo(), fetchWithdrawRecords()])
      setWithdrawal(info)
      setWithdrawRecords(records.list)
    } catch {
      // 刷新失败时保留旧数据，下次进入页面或操作后再试
    }
  }

  const handleOpenApply = () => {
    setApplyForm({ amount: '', remark: '' })
    setApplyModalOpen(true)
  }

  const handleSubmitApply = async () => {
    if (applying) return
    if (!withdrawal?.canWithdraw) {
      Taro.showToast({ title: '收款账户审核通过后才能申请提现', icon: 'none' })
      return
    }
    const amount = Math.round(Number(applyForm.amount) * 100)
    if (!Number.isFinite(amount) || amount <= 0) {
      Taro.showToast({ title: '请输入有效提现金额', icon: 'none' })
      return
    }
    if (amount > Number(withdrawal?.availableAmount || 0)) {
      Taro.showToast({ title: '提现金额不能超过可提现余额', icon: 'none' })
      return
    }
    setApplying(true)
    try {
      await applyWithdraw({ amount, remark: applyForm.remark.trim() || undefined })
      Taro.showToast({ title: '提现申请已提交', icon: 'success' })
      setApplyModalOpen(false)
      setApplyForm({ amount: '', remark: '' })
      void refreshWithdrawData()
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '提现申请提交失败，请重试', icon: 'none' })
    } finally {
      setApplying(false)
    }
  }

  const handleRowAction = (action: string) => {
    if (action === 'withdrawal') {
      setWithdrawalModal('view')
    } else if (action === 'editOrganizer') {
      setOrganizerForm({ name: account?.name || '', logo: account?.logo || '', marker_icon: '' })
      setSettingModal('editOrganizer')
      // 回显以 /organizer/profile 为准（/organizer/info 当前 500，account 名称可能是兜底值）
      fetchOrganizerProfile()
        .then((profile) => {
          setOrganizerForm({
            name: profile.name || account?.name || '',
            logo: profile.logo || account?.logo || '',
            marker_icon: profile.markerIcon || '',
          })
        })
        .catch(() => {})
    } else if (action === 'editRegion') {
      setSettingModal('editRegion')
      // 运营城市固定为成都：省份/城市锁定，仅选择成都区县
      fetchOrganizerProfile()
        .then((profile) => setRegionDistrict(profile.district))
        .catch(() => {})
      fetchChengduDistricts()
        .then(setRegionDistricts)
        .catch(() => {})
    } else if (action === 'venueProfile') {
      setSettingModal('venueProfile')
      // 回显以 /organizer/profile 为准；存在修订快照时优先回填快照（驳回后可直接修改重提）
      fetchOrganizerProfile()
        .then((profile) => {
          setOrganizerProfile(profile)
          setVenueForm(buildVenueProfileEditForm(profile))
        })
        .catch(() => {})
      fetchChengduDistricts()
        .then(setRegionDistricts)
        .catch(() => {})
    } else if (action === 'certification') {
      setSettingModal('certification')
      fetchOrganizerProfile()
        .then((profile) => setOrganizerProfileName(profile.name))
        .catch(() => {})
    } else if (action === 'changePassword') {
      setPwdForm({ phone: '', code: '', password: '' })
      setSettingModal('changePassword')
      fetchAuthPhone()
        .then((phone) => setPwdForm((prev) => ({ ...prev, phone })))
        .catch(() => {
          Taro.showToast({ title: '手机号获取失败，请关闭后重试', icon: 'none' })
        })
    } else if (action === 'logout') {
      Taro.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            Taro.clearStorageSync()
            // 游客模式：退出后回首页以游客身份浏览，不再强制登录
            Taro.eventCenter.trigger('FORCE_LOGOUT')
            Taro.reLaunch({ url: '/pages/index/index' })
          }
        },
      })
    }
  }

  const handleChooseLogo = async () => {
    if (logoUploading) return
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const filePath = res.tempFilePaths[0]
      if (!filePath) return
      setLogoUploading(true)
      const url = await uploadOrganizerAsset(filePath, 'organizer_logo')
      if (url) setOrganizerForm((prev) => ({ ...prev, logo: url }))
    } catch (error: any) {
      if (error?.errMsg && !/cancel/.test(error.errMsg)) {
        Taro.showToast({ title: 'LOGO 上传失败，请重试', icon: 'none' })
      }
    } finally {
      setLogoUploading(false)
    }
  }

  const handleChooseVenueLogo = async () => {
    if (venueImageUploading) return
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const filePath = res.tempFilePaths[0]
      if (!filePath) return
      setVenueImageUploading(true)
      const url = await uploadOrganizerAsset(filePath, 'organizer_logo')
      if (url) updateVenueForm({ logo: url })
    } catch (error: any) {
      if (error?.errMsg && !/cancel/.test(error.errMsg)) {
        Taro.showToast({ title: 'LOGO 上传失败，请重试', icon: 'none' })
      }
    } finally {
      setVenueImageUploading(false)
    }
  }

  const handleSubmitOrganizer = async () => {
    if (organizerSaving) return
    const name = organizerForm.name.trim()
    if (!name) {
      Taro.showToast({ title: '请输入主办方名称', icon: 'none' })
      return
    }
    setOrganizerSaving(true)
    try {
      await updateOrganizerBasic({ name, ...(organizerForm.logo ? { logo: organizerForm.logo } : {}) })
      if (organizerForm.marker_icon) {
        await updateOrganizerMarkerIcon(organizerForm.marker_icon)
      }
      // 品牌卡刷新失败不影响保存结果（/organizer/info 当前 500）
      try {
        const nextAccount = await fetchAccount()
        setAccount(nextAccount)
      } catch {}
      setSettingModal(null)
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '保存失败，请重试', icon: 'none' })
    } finally {
      setOrganizerSaving(false)
    }
  }

  const handleSubmitRegion = async () => {
    if (regionSaving) return
    if (!regionDistrict) {
      Taro.showToast({ title: '请选择区县', icon: 'none' })
      return
    }
    setRegionSaving(true)
    try {
      await updateOrganizerRegion({ province: CHENGDU_PROVINCE, city: CHENGDU_CITY, district: regionDistrict })
      setSettingModal(null)
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '保存失败，请重试', icon: 'none' })
    } finally {
      setRegionSaving(false)
    }
  }

  const updateVenueForm = (patch: Partial<VenueProfileEditForm>) => {
    setVenueForm((prev) => ({ ...prev, ...patch }))
  }

  const handleUploadVenueImage = async (target: 'cover' | 'gallery') => {
    if (venueImageUploading) return
    try {
      const res = await Taro.chooseImage({
        count: target === 'cover' ? 1 : 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const filePaths = res.tempFilePaths.filter(Boolean)
      if (filePaths.length === 0) return
      setVenueImageUploading(true)
      Taro.showLoading({ title: '上传中...', mask: true })
      const urls: string[] = []
      for (const filePath of filePaths) {
        urls.push(await uploadOrganizerAsset(filePath, target === 'cover' ? 'venue_cover' : 'venue_gallery'))
      }
      if (target === 'cover') {
        updateVenueForm({ cover_image: urls[0] || '' })
      } else {
        updateVenueForm({ gallery: [...venueForm.gallery, ...urls].filter(Boolean) })
      }
    } catch (error: any) {
      if (error?.errMsg && !/cancel/.test(error.errMsg)) {
        Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' })
      }
    } finally {
      setVenueImageUploading(false)
      Taro.hideLoading()
    }
  }

  const handleChooseVenueAddress = async () => {
    const location = await chooseUserLocation()
    if (!location) return
    updateVenueForm({
      address: location.name || location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    })
  }

  const handleSubmitVenueProfile = async () => {
    if (venueSaving) return
    const name = venueForm.name.trim()
    if (!name) {
      Taro.showToast({ title: '请输入主办方名称', icon: 'none' })
      return
    }
    if (!venueForm.district) {
      Taro.showToast({ title: '请选择区县', icon: 'none' })
      return
    }
    if (!venueForm.address.trim() || typeof venueForm.latitude !== 'number' || typeof venueForm.longitude !== 'number') {
      Taro.showToast({ title: '请选择场地地址', icon: 'none' })
      return
    }
    if (!venueForm.business_hours.trim()) {
      Taro.showToast({ title: '请填写营业时间', icon: 'none' })
      return
    }
    setVenueSaving(true)
    try {
      const spendYuan = Number(venueForm.average_spend)
      await updateOrganizerVenueProfile({
        name,
        logo: venueForm.logo,
        province: venueForm.province || CHENGDU_PROVINCE,
        city: venueForm.city || CHENGDU_CITY,
        district: venueForm.district,
        markerIcon: venueForm.marker_icon,
        venueProfile: {
          coverImage: venueForm.cover_image,
          gallery: venueForm.gallery,
          description: venueForm.description,
          businessHours: venueForm.business_hours.trim(),
          contactName: venueForm.contact_name,
          servicePhone: venueForm.service_phone,
          address: venueForm.address.trim(),
          latitude: venueForm.latitude,
          longitude: venueForm.longitude,
          averageSpend: Number.isFinite(spendYuan) && spendYuan > 0 ? Math.round(spendYuan * 100) : 0,
        },
      })
      // 提交后进入二审：刷新修订状态（公开页继续展示旧资料）
      fetchOrganizerProfile()
        .then((profile) => setOrganizerProfile(profile))
        .catch(() => {})
      setSettingModal(null)
      Taro.showToast({ title: '已提交审核', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '提交失败，请重试', icon: 'none' })
    } finally {
      setVenueSaving(false)
    }
  }

  const handleSendPwdCode = async () => {
    if (sendingCode || codeCountdown > 0) return
    if (!pwdForm.phone) {
      Taro.showToast({ title: '手机号缺失，请关闭后重试', icon: 'none' })
      return
    }
    setSendingCode(true)
    try {
      await sendAuthCode(pwdForm.phone)
      setCodeCountdown(60)
      Taro.showToast({ title: '验证码已发送', icon: 'none' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '发送失败', icon: 'none' })
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmitPassword = async () => {
    if (pwdSaving) return
    if (!pwdForm.phone) {
      Taro.showToast({ title: '手机号缺失，请关闭后重试', icon: 'none' })
      return
    }
    if (!pwdForm.code.trim()) {
      Taro.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    if (pwdForm.password.length < 6) {
      Taro.showToast({ title: '新密码至少 6 位', icon: 'none' })
      return
    }
    setPwdSaving(true)
    try {
      await resetAuthPassword({ phone: pwdForm.phone, code: pwdForm.code.trim(), password: pwdForm.password })
      Taro.showToast({ title: '密码已重置', icon: 'success' })
      setSettingModal(null)
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '重置失败，请重试', icon: 'none' })
    } finally {
      setPwdSaving(false)
    }
  }

  const handleEditWithdrawal = () => {
    if (withdrawal?.pendingAudit) {
      Taro.showToast({ title: '收款账户审核中，请勿重复提交', icon: 'none' })
      return
    }
    const rejectedAudit = withdrawal?.latestAudit?.status === 2 ? withdrawal.latestAudit : null
    setEditForm({
      payeeName: rejectedAudit?.payeeName || withdrawal?.payeeName || '',
      accountNumber: rejectedAudit?.accountNumber || withdrawal?.accountNumber || '',
      bankName: rejectedAudit?.bankName || withdrawal?.bankName || '',
      canWithdraw: withdrawal?.canWithdraw,
      pendingAudit: withdrawal?.pendingAudit || null,
      latestAudit: withdrawal?.latestAudit || null,
    })
    setWithdrawalModal('edit')
  }

  const handleSubmitEdit = async () => {
    if (!editForm.payeeName.trim()) {
      Taro.showToast({ title: '请输入收款人', icon: 'none' })
      return
    }
    if (!editForm.accountNumber.trim()) {
      Taro.showToast({ title: '请输入收款账户', icon: 'none' })
      return
    }
    if (!editForm.bankName.trim()) {
      Taro.showToast({ title: '请输入银行信息', icon: 'none' })
      return
    }
    try {
      const nextWithdrawal = await updateWithdrawalInfo({ ...editForm })
      setWithdrawal(nextWithdrawal)
      setWithdrawalModal('view')
      Taro.showToast({ title: '已提交审核', icon: 'success' })
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '提交失败，请重试', icon: 'none' })
    }
  }

  // venue 主办方：资料修改走二审（场地资料入口）；merchant 保持原有直接更新入口
  const isVenueOrganizer = organizerProfile?.type === 'venue'
  const settingGroups = isVenueOrganizer ? VENUE_SETTING_GROUPS : SETTING_GROUPS
  const venueRevisionPending = Boolean(organizerProfile?.hasPendingProfileRevision)
  const venueRevisionReason = organizerProfile?.pendingProfileReason || ''

  return (
    <View className="account-page flex-col">
      {/* Brand Card */}
      <View className="account-brand-card">
        <View className="account-brand-top flex-row">
          <View className="account-brand-logo-wrap">
            <Image
              className="account-brand-logo"
              src={account?.logo || powerFlowLogo}
              mode="aspectFill"
            />
          </View>
          <View className="account-brand-main flex-col">
            <Text className="account-brand-name">{account?.name || 'POWER FLOW'}</Text>
            <View className={`account-brand-verified flex-row ${account?.verified === false ? 'is-unverified' : ''}`}>
              <Text className="account-verified-text">{account?.verified === false ? '未认证' : '已认证'}</Text>
            </View>
          </View>
        </View>
        <View className="account-brand-stats flex-row">
          <View className="account-brand-stat flex-col">
            <Text className="account-brand-stat-value">{account?.daysSinceJoined ?? 210}</Text>
            <Text className="account-brand-stat-label">入驻天数</Text>
          </View>
          <View className="account-brand-stat-divider" />
          <View className="account-brand-stat flex-col">
            <Text className="account-brand-stat-value">{account?.level || 'LV1'}</Text>
            <Text className="account-brand-stat-label">当前等级</Text>
          </View>
          <View className="account-brand-stat-divider" />
          <View className="account-brand-stat flex-col">
            <Text className="account-brand-stat-value">{account?.serviceFeeRate || '5%'}</Text>
            <Text className="account-brand-stat-label">服务费比例</Text>
          </View>
        </View>
      </View>

      <View className="account-balance-card">
        <View className="account-balance-head flex-row justify-between">
          <View className="account-balance-head-main flex-col">
            <Text className="account-balance-label">可提现金额</Text>
            <Text className="account-balance-value">¥{fenToYuanText(withdrawal?.availableAmount)}</Text>
          </View>
          <View className="account-balance-btn" onClick={handleOpenApply}>
            <Text className="account-balance-btn-text">申请提现</Text>
          </View>
        </View>
        <View className="account-balance-stats flex-row">
          <View className="account-balance-stat flex-col">
            <Text className="account-balance-stat-label">累计收益</Text>
            <Text className="account-balance-stat-value">¥{fenToYuanText(withdrawal?.grossAmount)}</Text>
          </View>
          <View className="account-balance-stat flex-col">
            <Text className="account-balance-stat-label">已提现</Text>
            <Text className="account-balance-stat-value">¥{fenToYuanText(withdrawal?.withdrawAmount)}</Text>
          </View>
          <View className="account-balance-stat flex-col">
            <Text className="account-balance-stat-label">提现冻结中</Text>
            <Text className="account-balance-stat-value">¥{fenToYuanText(withdrawal?.pendingWithdrawAmount)}</Text>
          </View>
        </View>
        <Text className="account-balance-tip">到账周期：{withdrawal?.arrivalCycle || 'T+1 到 T+3 个工作日'}</Text>
      </View>

      <View className="account-level-card">
        <Text className="account-section-title">主办方等级</Text>
        <View className="account-level-row">
          <Text className="account-level-label">当前等级</Text>
          <Text className="account-level-value">{account?.level || 'LV1'}</Text>
        </View>
        <View className="account-level-row">
          <Text className="account-level-label">服务费率</Text>
          <Text className="account-level-value">{account?.serviceFeeRate || '5%'}</Text>
        </View>
        <Text className="account-level-tip">默认等级为 LV1，后续等级和费率以平台后台配置为准。</Text>
        <Text className="account-level-tip">升级条件：累计有效订单、销售额、活动履约和账户合规状态达到平台规则。</Text>
      </View>

      {/* Withdraw Records */}
      <Text className="account-section-title">提现记录</Text>
      <View className="account-record-group">
        {recordsLoading ? (
          <Text className="account-record-empty">加载中...</Text>
        ) : withdrawRecords.length === 0 ? (
          <Text className="account-record-empty">暂无提现记录</Text>
        ) : (
          withdrawRecords.map((record) => (
            <View key={record.id} className="account-record-row flex-row justify-between">
              <View className="account-record-main flex-col">
                <Text className="account-record-amount">¥{fenToYuanText(record.totalAmount)}</Text>
                <Text className="account-record-line">
                  {record.bankName ? `${record.bankName} · ${record.accountHolder || '-'}` : '提现申请'}
                </Text>
                <Text className="account-record-line">申请时间 {formatRecordTime(record.createTime)}</Text>
                <Text className="account-record-line">打款时间 {formatRecordTime(record.arrivalTime)}</Text>
                {record.status === 3 && record.reason ? (
                  <Text className="account-record-reason">原因：{record.reason}</Text>
                ) : null}
              </View>
              <Text className={`account-record-status s${record.status}`}>{getWithdrawStatusLabel(record.status)}</Text>
            </View>
          ))
        )}
      </View>

      {/* 场地资料修订审核状态（二审中/驳回原因），点击可进入编辑 */}
      {isVenueOrganizer && (venueRevisionPending || venueRevisionReason) ? (
        <View className="account-revision-banner" onClick={() => handleRowAction('venueProfile')}>
          <View className={`account-audit-card flex-col ${venueRevisionPending ? 'pending' : 'rejected'}`}>
            <Text className="account-audit-title">{venueRevisionPending ? '场地资料审核中' : '场地资料审核未通过'}</Text>
            <Text className="account-audit-line">
              {venueRevisionPending
                ? '新资料审核通过前，公开页继续展示当前资料。'
                : (venueRevisionReason || '请修改场地资料后重新提交。')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Setting Groups */}
      {settingGroups.map((group) => {
        const groupClass = group.title === '基本信息' ? 'is-basic' : 'is-account'
        return (
          <View key={group.title} className={`account-group-block ${groupClass}`}>
            <Text className="account-section-title">{group.title}</Text>
            <View className={`account-setting-group ${groupClass}`}>
              {group.rows.map((row, index) => (
                <View key={row.label} className={index > 0 ? 'account-setting-row-wrap is-following' : 'account-setting-row-wrap'}>
                  <View className="account-setting-row flex-row justify-between" onClick={() => handleRowAction(row.action)}>
                    <View className="account-setting-left flex-row">
                      <Image className="account-row-icon-img" src={row.iconSrc} mode="aspectFit" />
                      <Text className="account-setting-label">{row.label}</Text>
                    </View>
                    <AtIcon value="chevron-right" size="16" color="rgba(255,255,255,0.3)" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )
      })}

      {/* Withdrawal Info Modal */}
      {withdrawalModal === 'view' && (
        <View className="account-modal-overlay flex-col" onClick={() => setWithdrawalModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">提现信息</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setWithdrawalModal(null)}>关闭</Text>
            </View>
            <View className="account-info-block flex-col">
              <Text className="account-info-label">收款人</Text>
              <Text className="account-info-value">{withdrawal?.payeeName || '-'}</Text>
            </View>
            <View className="account-info-block flex-col">
              <Text className="account-info-label">收款账户</Text>
              <Text className="account-info-value">{withdrawal?.accountNumber || '-'}</Text>
            </View>
            <View className="account-info-block flex-col">
              <Text className="account-info-label">银行信息</Text>
              <Text className="account-info-value">{withdrawal?.bankName || '-'}</Text>
            </View>
            {withdrawal?.pendingAudit ? (
              <View className="account-audit-card pending flex-col">
                <Text className="account-audit-title">收款账户审核中</Text>
                <Text className="account-audit-line">{withdrawal.pendingAudit.payeeName}</Text>
                <Text className="account-audit-line">{withdrawal.pendingAudit.bankName} · {withdrawal.pendingAudit.accountNumber}</Text>
                <Text className="account-audit-tip">审核通过后才会更新为正式提现账户。</Text>
              </View>
            ) : withdrawal?.latestAudit?.status === 2 ? (
              <View className="account-audit-card rejected flex-col">
                <Text className="account-audit-title">上次审核未通过</Text>
                <Text className="account-audit-line">{withdrawal.latestAudit.rejectReason || '请核对收款账户信息后重新提交。'}</Text>
              </View>
            ) : (
              <View className="account-audit-card approved flex-col">
                <Text className="account-audit-title">{withdrawal?.canWithdraw ? '收款账户已审核通过' : '暂无可提现账户'}</Text>
                <Text className="account-audit-line">
                  {withdrawal?.canWithdraw ? '可使用当前正式账户发起提现。' : '请提交收款账户，审核通过后可提现。'}
                </Text>
              </View>
            )}
            <View className={`account-modal-btn ${withdrawal?.pendingAudit ? 'disabled' : ''}`} onClick={handleEditWithdrawal}>
              <Text className="account-modal-btn-text">{withdrawal?.pendingAudit ? '审核中' : '修改提现信息'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Edit Withdrawal Modal */}
      {withdrawalModal === 'edit' && (
        <View className="account-modal-overlay flex-col" onClick={() => setWithdrawalModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">提现信息</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setWithdrawalModal(null)}>关闭</Text>
            </View>
            <Text className="account-field-required">*收款人</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                placeholder="请输入"
                placeholderClass="account-input-placeholder"
                value={editForm.payeeName}
                onInput={(e) => setEditForm((prev) => ({ ...prev, payeeName: e.detail.value }))}
              />
            </View>
            <Text className="account-field-required">*收款账户</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                placeholder="请输入"
                placeholderClass="account-input-placeholder"
                value={editForm.accountNumber}
                onInput={(e) => setEditForm((prev) => ({ ...prev, accountNumber: e.detail.value }))}
              />
            </View>
            <Text className="account-field-required">*银行信息</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                placeholder="请输入"
                placeholderClass="account-input-placeholder"
                value={editForm.bankName}
                onInput={(e) => setEditForm((prev) => ({ ...prev, bankName: e.detail.value }))}
              />
            </View>
            <View className="account-edit-tip">
              <Text>提交后进入平台审核，审核通过前不会覆盖当前正式收款账户。</Text>
            </View>
            <View className="account-modal-btn" onClick={handleSubmitEdit}>
              <Text className="account-modal-btn-text">提交审核</Text>
            </View>
          </View>
        </View>
      )}

      {/* Withdraw Apply Modal */}
      {applyModalOpen && (
        <View className="account-modal-overlay flex-col" onClick={() => setApplyModalOpen(false)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">申请提现</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setApplyModalOpen(false)}>关闭</Text>
            </View>

            {!withdrawal?.canWithdraw && (
              <View className={`account-audit-card flex-col ${withdrawal?.pendingAudit ? 'pending' : 'rejected'}`}>
                {withdrawal?.pendingAudit ? (
                  <>
                    <Text className="account-audit-title">收款账户审核中</Text>
                    <Text className="account-audit-line">审核通过后才能发起提现，请耐心等待。</Text>
                  </>
                ) : withdrawal?.latestAudit?.status === 2 ? (
                  <>
                    <Text className="account-audit-title">收款账户审核未通过</Text>
                    <Text className="account-audit-line">{withdrawal.latestAudit.rejectReason || '请核对收款账户信息。'}</Text>
                    <Text className="account-audit-tip">请先在「提现信息」中重新提交收款账户。</Text>
                  </>
                ) : (
                  <>
                    <Text className="account-audit-title">暂无可提现账户</Text>
                    <Text className="account-audit-line">请先在「提现信息」中提交收款账户，审核通过后可提现。</Text>
                  </>
                )}
              </View>
            )}

            <Text className="account-field-required">*提现金额</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                type="digit"
                placeholder={`可提现 ¥${fenToYuanText(withdrawal?.availableAmount)}`}
                placeholderClass="account-input-placeholder"
                value={applyForm.amount}
                onInput={(e) => setApplyForm((prev) => ({ ...prev, amount: e.detail.value }))}
              />
            </View>
            <Text className="account-field-required">备注</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                placeholder="选填"
                placeholderClass="account-input-placeholder"
                value={applyForm.remark}
                onInput={(e) => setApplyForm((prev) => ({ ...prev, remark: e.detail.value }))}
              />
            </View>
            <View className="account-apply-info flex-col">
              <Text className="account-apply-info-line">
                到账账户：{withdrawal?.bankName && withdrawal?.accountNumber ? `${withdrawal.bankName} ${withdrawal.accountNumber}` : '暂无收款账户'}
              </Text>
              <Text className="account-apply-info-line">到账周期：{withdrawal?.arrivalCycle || 'T+1 到 T+3 个工作日'}</Text>
            </View>
            <View
              className={`account-modal-btn ${!withdrawal?.canWithdraw || applying ? 'disabled' : ''}`}
              onClick={handleSubmitApply}
            >
              <Text className="account-modal-btn-text">{applying ? '提交中...' : '提交申请'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 主办方编辑 Modal */}
      {settingModal === 'editOrganizer' && (
        <View className="account-modal-overlay flex-col" onClick={() => setSettingModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">主办方编辑</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setSettingModal(null)}>关闭</Text>
            </View>
            <Text className="account-field-required">*主办方名称</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                placeholder="请输入主办方名称"
                placeholderClass="account-input-placeholder"
                value={organizerForm.name}
                onInput={(e) => setOrganizerForm((prev) => ({ ...prev, name: e.detail.value }))}
              />
            </View>
            <Text className="account-field-required">主办方LOGO</Text>
            <View className="account-logo-picker flex-row" onClick={handleChooseLogo}>
              <Image className="account-logo-preview" src={organizerForm.logo || powerFlowLogo} mode="aspectFill" />
              <Text className="account-logo-picker-text">{logoUploading ? '上传中...' : '点击更换LOGO'}</Text>
            </View>
            <Text className="account-field-required">地图图标（前台地图显示）</Text>
            <ScrollView className="marker-icon-scroll" scrollY>
              <View className="marker-icon-grid">
                {MARKER_ICONS.map((icon) => (
                  <View
                    key={icon.key}
                    className={`marker-icon-item ${organizerForm.marker_icon === icon.url ? 'active' : ''}`}
                    onClick={() => setOrganizerForm((prev) => ({ ...prev, marker_icon: icon.url }))}
                  >
                    <Image src={icon.url} className="marker-icon-img" mode="aspectFit" />
                    <Text className={`marker-icon-name ${organizerForm.marker_icon === icon.url ? 'active' : ''}`}>{icon.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <View className={`account-modal-btn ${organizerSaving || logoUploading ? 'disabled' : ''}`} onClick={handleSubmitOrganizer}>
              <Text className="account-modal-btn-text">{organizerSaving ? '保存中...' : '保存'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 主办方区域 Modal */}
      {settingModal === 'editRegion' && (
        <View className="account-modal-overlay flex-col" onClick={() => setSettingModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">主办方区域</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setSettingModal(null)}>关闭</Text>
            </View>
            <Text className="account-field-required">*所在地区</Text>
            <View className="account-input-shell">
              <Text className="account-region-text">四川省 / 成都市</Text>
            </View>
            <Picker
              mode="selector"
              range={regionDistricts}
              onChange={(e) => {
                const index = Number(e.detail.value)
                if (Number.isInteger(index) && index >= 0 && index < regionDistricts.length) {
                  setRegionDistrict(regionDistricts[index])
                }
              }}
            >
              <View className="account-input-shell">
                <Text className={`account-region-text ${regionDistrict ? '' : 'is-placeholder'}`}>
                  {regionDistrict || '请选择区县'}
                </Text>
              </View>
            </Picker>
            <View className={`account-modal-btn ${regionSaving ? 'disabled' : ''}`} onClick={handleSubmitRegion}>
              <Text className="account-modal-btn-text">{regionSaving ? '保存中...' : '保存'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 场地资料 Modal（venue 主办方，提交后进入二审） */}
      {settingModal === 'venueProfile' && (
        <View className="account-modal-overlay flex-col" onClick={() => setSettingModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">场地资料</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setSettingModal(null)}>关闭</Text>
            </View>
            <View className="account-venue-body">
              {venueRevisionPending ? (
                <View className="account-audit-card pending flex-col">
                  <Text className="account-audit-title">场地资料审核中</Text>
                  <Text className="account-audit-line">新资料审核通过前，公开页继续展示当前资料。</Text>
                </View>
              ) : venueRevisionReason ? (
                <View className="account-audit-card rejected flex-col">
                  <Text className="account-audit-title">上次提交未通过</Text>
                  <Text className="account-audit-line">{venueRevisionReason}</Text>
                  <Text className="account-audit-tip">修改后可重新提交审核。</Text>
                </View>
              ) : null}

              <Text className="account-field-required">*主办方名称</Text>
              <View className="account-input-shell">
                <Input
                  className="account-input"
                  placeholder="请输入主办方名称"
                  placeholderClass="account-input-placeholder"
                  value={venueForm.name}
                  onInput={(e) => updateVenueForm({ name: e.detail.value })}
                />
              </View>
              <Text className="account-field-required">主办方LOGO</Text>
              <View className="account-logo-picker flex-row" onClick={handleChooseVenueLogo}>
                <Image className="account-logo-preview" src={venueForm.logo || powerFlowLogo} mode="aspectFill" />
                <Text className="account-logo-picker-text">{venueImageUploading ? '上传中...' : '点击更换LOGO'}</Text>
              </View>
              <Text className="account-field-required">地图图标（前台地图显示）</Text>
              <ScrollView className="marker-icon-scroll" scrollY>
                <View className="marker-icon-grid">
                  {MARKER_ICONS.map((icon) => (
                    <View
                      key={icon.key}
                      className={`marker-icon-item ${venueForm.marker_icon === icon.url ? 'active' : ''}`}
                      onClick={() => updateVenueForm({ marker_icon: icon.url })}
                    >
                      <Image src={icon.url} className="marker-icon-img" mode="aspectFit" />
                      <Text className={`marker-icon-name ${venueForm.marker_icon === icon.url ? 'active' : ''}`}>{icon.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <Text className="account-field-required">*所在地区</Text>
              <View className="account-input-shell">
                <Text className="account-region-text">四川省 / 成都市</Text>
              </View>
              <Picker
                mode="selector"
                range={regionDistricts}
                onChange={(e) => {
                  const index = Number(e.detail.value)
                  if (Number.isInteger(index) && index >= 0 && index < regionDistricts.length) {
                    updateVenueForm({ district: regionDistricts[index] })
                  }
                }}
              >
                <View className="account-input-shell">
                  <Text className={`account-region-text ${venueForm.district ? '' : 'is-placeholder'}`}>
                    {venueForm.district || '请选择区县'}
                  </Text>
                </View>
              </Picker>

              <Text className="account-field-required">*场地地址（地图选点）</Text>
              <View className="account-input-shell" onClick={handleChooseVenueAddress}>
                <Text className={`account-region-text ${venueForm.address ? '' : 'is-placeholder'}`}>
                  {venueForm.address || '点击选择场地地址'}
                </Text>
              </View>
              {typeof venueForm.latitude === 'number' && typeof venueForm.longitude === 'number' && (
                <Text className="account-venue-coord">
                  已选坐标：{venueForm.latitude.toFixed(6)}, {venueForm.longitude.toFixed(6)}
                </Text>
              )}

              <Text className="account-field-required">*营业时间</Text>
              <View className="account-input-shell">
                <Input
                  className="account-input"
                  placeholder="如 19:30-次日02:30"
                  placeholderClass="account-input-placeholder"
                  value={venueForm.business_hours}
                  onInput={(e) => updateVenueForm({ business_hours: e.detail.value })}
                />
              </View>

              <Text className="account-field-required">场地封面</Text>
              <View className="account-venue-upload" onClick={() => handleUploadVenueImage('cover')}>
                {venueForm.cover_image ? (
                  <Image
                    src={venueForm.cover_image}
                    className="account-venue-cover-img"
                    mode="aspectFill"
                    onClick={(e) => { e.stopPropagation(); Taro.previewImage({ current: venueForm.cover_image, urls: [venueForm.cover_image] }) }}
                  />
                ) : (
                  <Text className="account-venue-upload-title">
                    {venueImageUploading ? '上传中...' : '点击上传场地封面'}
                  </Text>
                )}
              </View>

              <Text className="account-field-required">场地图册</Text>
              <View className="account-venue-upload" onClick={() => handleUploadVenueImage('gallery')}>
                <Text className="account-venue-upload-title">
                  {venueImageUploading ? '上传中...' : `点击上传图册图片（已传 ${venueForm.gallery.length} 张）`}
                </Text>
              </View>
              {venueForm.gallery.length > 0 && (
                <View className="account-venue-gallery">
                  {venueForm.gallery.map((url, index) => (
                    <View key={`${url}-${index}`} className="account-venue-gallery-item">
                      <Image
                        src={url}
                        className="account-venue-gallery-img"
                        mode="aspectFill"
                        onClick={() => Taro.previewImage({ current: url, urls: venueForm.gallery })}
                      />
                      <Text
                        className="account-venue-gallery-remove"
                        onClick={() => updateVenueForm({ gallery: venueForm.gallery.filter((_, i) => i !== index) })}
                      >×</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text className="account-field-required">场地介绍</Text>
              <View className="account-input-shell account-venue-textarea-shell">
                <Textarea
                  className="account-input account-venue-textarea"
                  placeholder="请输入场地介绍"
                  placeholderClass="account-input-placeholder"
                  value={venueForm.description}
                  onInput={(e) => updateVenueForm({ description: e.detail.value })}
                />
              </View>

              <Text className="account-field-required">联系人</Text>
              <View className="account-input-shell">
                <Input
                  className="account-input"
                  placeholder="请输入联系人"
                  placeholderClass="account-input-placeholder"
                  value={venueForm.contact_name}
                  onInput={(e) => updateVenueForm({ contact_name: e.detail.value })}
                />
              </View>
              <Text className="account-field-required">客服电话</Text>
              <View className="account-input-shell">
                <Input
                  className="account-input"
                  type="number"
                  placeholder="请输入客服电话"
                  placeholderClass="account-input-placeholder"
                  value={venueForm.service_phone}
                  onInput={(e) => updateVenueForm({ service_phone: e.detail.value })}
                />
              </View>
              <Text className="account-field-required">人均消费（元）</Text>
              <View className="account-input-shell">
                <Input
                  className="account-input"
                  type="digit"
                  placeholder="请输入人均消费"
                  placeholderClass="account-input-placeholder"
                  value={venueForm.average_spend}
                  onInput={(e) => updateVenueForm({ average_spend: e.detail.value })}
                />
              </View>
            </View>
            <View className={`account-modal-btn ${venueSaving || venueImageUploading ? 'disabled' : ''}`} onClick={handleSubmitVenueProfile}>
              <Text className="account-modal-btn-text">{venueSaving ? '提交中...' : '提交审核'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 认证信息 Modal（只读，与 PC 商家端一致） */}
      {settingModal === 'certification' && (
        <View className="account-modal-overlay flex-col" onClick={() => setSettingModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">认证信息</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setSettingModal(null)}>关闭</Text>
            </View>
            <View className="account-info-block flex-col">
              <Text className="account-info-label">认证状态</Text>
              <Text className="account-info-value">{account?.verified === false ? '未认证' : '已认证'}</Text>
            </View>
            <View className="account-info-block flex-col">
              <Text className="account-info-label">主体名称</Text>
              <Text className="account-info-value">{organizerProfileName || account?.name || '-'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 修改密码 Modal */}
      {settingModal === 'changePassword' && (
        <View className="account-modal-overlay flex-col" onClick={() => setSettingModal(null)}>
          <View className="account-modal-card flex-col" onClick={(e) => e.stopPropagation()}>
            <View className="account-modal-header flex-row justify-between">
              <View className="account-modal-title-row flex-row justify-between">
                <View className="account-modal-title-icon">
                  <View className="account-modal-icon-bar" />
                </View>
                <Text className="account-modal-title">修改密码</Text>
              </View>
              <Text className="account-modal-close" onClick={() => setSettingModal(null)}>关闭</Text>
            </View>
            <Text className="account-field-required">*手机号</Text>
            <View className="account-input-shell">
              <Text className={`account-region-text ${pwdForm.phone ? '' : 'is-placeholder'}`}>
                {pwdForm.phone || '加载中...'}
              </Text>
            </View>
            <Text className="account-field-required">*验证码</Text>
            <View className="account-code-row flex-row">
              <View className="account-input-shell account-code-input">
                <Input
                  className="account-input"
                  type="number"
                  maxlength={6}
                  placeholder="请输入验证码"
                  placeholderClass="account-input-placeholder"
                  value={pwdForm.code}
                  onInput={(e) => setPwdForm((prev) => ({ ...prev, code: e.detail.value }))}
                />
              </View>
              <View
                className={`account-code-btn ${sendingCode || codeCountdown > 0 || !pwdForm.phone ? 'disabled' : ''}`}
                onClick={handleSendPwdCode}
              >
                <Text className="account-code-btn-text">
                  {codeCountdown > 0 ? `${codeCountdown}s后重发` : (sendingCode ? '发送中...' : '获取验证码')}
                </Text>
              </View>
            </View>
            <Text className="account-field-required">*新密码</Text>
            <View className="account-input-shell">
              <Input
                className="account-input"
                password
                placeholder="请输入新密码（至少 6 位）"
                placeholderClass="account-input-placeholder"
                value={pwdForm.password}
                onInput={(e) => setPwdForm((prev) => ({ ...prev, password: e.detail.value }))}
              />
            </View>
            <View className={`account-modal-btn ${pwdSaving ? 'disabled' : ''}`} onClick={handleSubmitPassword}>
              <Text className="account-modal-btn-text">{pwdSaving ? '提交中...' : '确认修改'}</Text>
            </View>
          </View>
        </View>
      )}

      <View className="account-safe-bottom" />
    </View>
  )
}
