import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Image,
  Input,
  ScrollView,
  Text,
  Textarea,
  View,
} from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import {
  createInitialDraft,
  organizerActivities,
  organizerAvatar,
  organizerDateOptions,
  organizerDistricts,
  organizerOrders,
  organizerSalesData,
  organizerTicketSpecs,
  organizerStats,
  organizerVerifiers,
} from './mock'
import {
  CreateActivityDraft,
  OrganizerActivityItem,
  OrganizerActivityStatus,
  OrganizerActivityTab,
  OrganizerDashboardView,
  TicketSpec,
} from './types'
import './index.scss'

const BOTTOM_TABS: Array<{ key: Exclude<OrganizerDashboardView, 'createWizard' | 'nonMerchant'>; label: string; icon: string }> = [
  { key: 'home', label: '首页', icon: 'home' },
  { key: 'activities', label: '活动', icon: 'map-pin' },
  { key: 'more', label: '更多', icon: 'menu' },
  { key: 'account', label: '账户', icon: 'user' },
]

const ACTIVITY_TABS: Array<{ key: OrganizerActivityTab; label: string }> = [
  { key: 'activities', label: '我的活动' },
  { key: 'sales', label: '销售数据' },
  { key: 'orders', label: '实时订单' },
  { key: 'verifiers', label: '核销管理' },
]

const STEP_TITLES = ['活动信息', '场地设定', '上传海报', '票券配置', '活动资质']

const STATUS_LABELS: Record<OrganizerActivityStatus, string> = {
  published: '已上架',
  pending: '审核中...',
  removed: '已下架',
  rejected: '审核未通过',
}

const STATUS_CLASS: Record<OrganizerActivityStatus, string> = {
  published: 'published',
  pending: 'pending',
  removed: 'removed',
  rejected: 'rejected',
}

const ALLOW_ORGANIZER_DEBUG = true

const isMerchantUser = (user: any) => {
  if (ALLOW_ORGANIZER_DEBUG) return true
  return Boolean(user?.is_merchant || user?.merchant_id)
}

const createActivityFromDraft = (draft: CreateActivityDraft): OrganizerActivityItem => ({
  id: `draft-${Date.now()}`,
  title: draft.name,
  cover: draft.posterSlots[0]?.fileName ? organizerActivities[0].cover : organizerActivities[1].cover,
  publishedAt: '刚刚保存',
  eventTime: draft.dateRange || '待设置活动时间',
  status: 'pending',
  orders: 0,
  sales: 0,
  subscribers: 0,
})

export default function OrganizerPage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [dashboardView, setDashboardView] = useState<OrganizerDashboardView>('home')
  const [previousView, setPreviousView] = useState<Exclude<OrganizerDashboardView, 'createWizard'>>('activities')
  const [activityTab, setActivityTab] = useState<OrganizerActivityTab>('activities')
  const [activityKeyword, setActivityKeyword] = useState('')
  const [activityFilter, setActivityFilter] = useState<'all' | OrganizerActivityStatus>('all')
  const [activityItems, setActivityItems] = useState<OrganizerActivityItem[]>(organizerActivities)
  const [wizardStep, setWizardStep] = useState(1)
  const [draft, setDraft] = useState<CreateActivityDraft>(createInitialDraft())

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(Number.isNaN(nbHeight) ? 44 : nbHeight)
    setMenuButtonWidth(sysInfo.screenWidth - menuInfo.left)

    const userInfo = Taro.getStorageSync('userInfo')
    if (!isMerchantUser(userInfo)) {
      setDashboardView('nonMerchant')
    }
  }, [])

  const filteredActivities = useMemo(() => {
    return activityItems.filter((item) => {
      const matchKeyword = item.title.toLowerCase().includes(activityKeyword.trim().toLowerCase())
      const matchStatus = activityFilter === 'all' || item.status === activityFilter
      return matchKeyword && matchStatus
    })
  }, [activityItems, activityFilter, activityKeyword])

  const pageBodyStyle = useMemo(
    () => ({
      marginTop: `${statusBarHeight + navBarHeight}px`,
      height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`,
    }),
    [navBarHeight, statusBarHeight],
  )

  const openCreateWizard = () => {
    setPreviousView('activities')
    setDashboardView('createWizard')
    setActivityTab('activities')
    setWizardStep(1)
    setDraft(createInitialDraft())
  }

  const handleBottomTabChange = (nextView: Exclude<OrganizerDashboardView, 'createWizard' | 'nonMerchant'>) => {
    setDashboardView(nextView)
    if (nextView === 'activities') {
      setActivityTab('activities')
    }
  }

  const handleBack = () => {
    if (dashboardView === 'createWizard') {
      if (wizardStep > 1) {
        setWizardStep((prev) => prev - 1)
        return
      }
      setDashboardView(previousView)
      return
    }

    Taro.navigateBack({ delta: 1 })
  }

  const cycleActivityFilter = () => {
    const order: Array<'all' | OrganizerActivityStatus> = ['all', 'published', 'pending', 'removed', 'rejected']
    const currentIndex = order.indexOf(activityFilter)
    const nextValue = order[(currentIndex + 1) % order.length]
    setActivityFilter(nextValue)
    Taro.showToast({
      title: nextValue === 'all' ? '显示全部活动' : `筛选${STATUS_LABELS[nextValue]}`,
      icon: 'none',
    })
  }

  const updateDraft = <K extends keyof CreateActivityDraft>(key: K, value: CreateActivityDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const updateTicketSpec = (specId: string, patch: Partial<TicketSpec>) => {
    setDraft((prev) => ({
      ...prev,
      ticketSpecs: prev.ticketSpecs.map((item) => (item.id === specId ? { ...item, ...patch } : item)),
    }))
  }

  const handleChooseDateRange = async (target: 'dateRange' | 'scheduleRange', specId?: string) => {
    const res = await Taro.showActionSheet({ itemList: organizerDateOptions })
    const selected = organizerDateOptions[res.tapIndex]
    if (!selected) return

    if (target === 'dateRange') {
      updateDraft('dateRange', selected)
      return
    }

    const [startAt, endAt] = selected.split('~').map((item) => item.trim())
    if (specId) {
      updateTicketSpec(specId, { startAt, endAt })
    }
  }

  const handleChooseDistrict = async () => {
    const res = await Taro.showActionSheet({ itemList: organizerDistricts })
    const selected = organizerDistricts[res.tapIndex]
    if (selected) updateDraft('district', selected)
  }

  const handleMockUpload = async (slotKey: string, qualification = false) => {
    const itemList = ['模拟上传文件', '清空当前文件']
    const res = await Taro.showActionSheet({ itemList })
    if (res.tapIndex === 1) {
      if (qualification) {
        updateDraft('qualificationFileName', '')
      } else {
        updateDraft(
          'posterSlots',
          draft.posterSlots.map((slot) => (slot.key === slotKey ? { ...slot, fileName: '' } : slot)),
        )
      }
      return
    }

    const fileName = qualification
      ? `activity-license-${Date.now()}.pdf`
      : `${slotKey}-${Date.now()}.png`

    if (qualification) {
      updateDraft('qualificationFileName', fileName)
      return
    }

    updateDraft(
      'posterSlots',
      draft.posterSlots.map((slot) => (slot.key === slotKey ? { ...slot, fileName } : slot)),
    )
  }

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
      if (!draft.dateRange.trim()) {
        Taro.showToast({ title: '请选择活动日期', icon: 'none' })
        return false
      }
      if (!draft.summary.trim()) {
        Taro.showToast({ title: '请输入活动摘要', icon: 'none' })
        return false
      }
    }

    if (step === 2 && !draft.address.trim()) {
      Taro.showToast({ title: '请输入活动地址', icon: 'none' })
      return false
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

  const handleSubmitAudit = () => {
    if (!validateStep(4)) return
    const nextActivity = createActivityFromDraft(draft)
    setActivityItems((prev) => [nextActivity, ...prev])
    setDashboardView('activities')
    setActivityTab('activities')
    setWizardStep(1)
    setDraft(createInitialDraft())
    Taro.showToast({ title: '提交审核成功', icon: 'success' })
  }

  const renderCardHeader = (title: string, actionText?: string, onAction?: () => void) => (
    <View className='organizer-card-header'>
      <Text className='organizer-card-title'>{title}</Text>
      {actionText ? (
        <View className='organizer-card-action' onClick={onAction}>
          <Text>{actionText}</Text>
        </View>
      ) : null}
    </View>
  )

  const renderHomeView = () => (
    <ScrollView className='organizer-scroll' scrollY>
      <View className='organizer-section'>
        {renderCardHeader('已上架活动', '前往活动中心', () => handleBottomTabChange('activities'))}
        <View className='featured-activity-list'>
          {activityItems
            .filter((item) => item.status === 'published')
            .slice(0, 2)
            .map((item) => (
              <View key={item.id} className='featured-activity-card' onClick={() => handleBottomTabChange('activities')}>
                <Image className='featured-cover' src={item.cover} mode='aspectFill' />
                <View className='featured-content'>
                  <Text className='featured-title'>{item.title}</Text>
                  <Text className='featured-meta'>上架时间：{item.publishedAt}</Text>
                  <Text className='featured-meta'>活动时间：{item.eventTime}</Text>
                </View>
                <AtIcon value='chevron-right' size='20' color='#666' />
              </View>
            ))}
        </View>
      </View>

      <View className='organizer-section'>
        {renderCardHeader('活动数据', '前往数据中心', () => {
          setDashboardView('activities')
          setActivityTab('sales')
        })}
        <View className='stats-grid-card'>
          <View className='stats-cell'>
            <Text className='stats-number'>{organizerStats.todayOrders}</Text>
            <Text className='stats-label'>今日订单</Text>
          </View>
          <View className='stats-cell'>
            <Text className='stats-number'>{organizerStats.todaySales}</Text>
            <Text className='stats-label'>今日销售</Text>
          </View>
          <View className='stats-cell'>
            <Text className='stats-number'>{organizerStats.totalSubscribers}</Text>
            <Text className='stats-label'>活动订阅量</Text>
          </View>
        </View>
      </View>

      <View className='organizer-section'>
        {renderCardHeader('快速配置')}
        <View className='quick-action-list'>
          <View className='quick-action-card' onClick={openCreateWizard}>
            <View className='quick-icon-box'>
              <AtIcon value='add' size='24' color='#fff' />
            </View>
            <View className='quick-action-content'>
              <Text className='quick-title'>发布活动</Text>
              <Text className='quick-desc'>在此处发布最新活动</Text>
            </View>
            <AtIcon value='chevron-right' size='20' color='#666' />
          </View>
          <View className='quick-action-card' onClick={() => {
            setDashboardView('activities')
            setActivityTab('verifiers')
          }}
          >
            <View className='quick-icon-box secondary'>
              <AtIcon value='user' size='22' color='#fff' />
            </View>
            <View className='quick-action-content'>
              <Text className='quick-title'>添加核销员</Text>
              <Text className='quick-desc'>快速添加核销工作人员</Text>
            </View>
            <AtIcon value='chevron-right' size='20' color='#666' />
          </View>
        </View>
      </View>

      <View className='organizer-safe-bottom' />
    </ScrollView>
  )

  const renderActivityList = () => {
    if (filteredActivities.length === 0) {
      return (
        <View className='empty-activities'>
          <Text className='empty-title'>暂无活动</Text>
          <Button className='primary-pill-button' onClick={openCreateWizard}>
            新增活动
          </Button>
        </View>
      )
    }

    return (
      <View className='activity-card-list'>
        {filteredActivities.map((item) => (
          <View key={item.id} className='activity-item-card'>
            <Image className='activity-item-cover' src={item.cover} mode='aspectFill' />
            <View className='activity-item-content'>
              <Text className='activity-item-title'>{item.title}</Text>
              <Text className='activity-item-meta'>上架时间：{item.publishedAt}</Text>
              <Text className='activity-item-meta'>{item.status === 'published' ? `活动时间：${item.eventTime}` : STATUS_LABELS[item.status]}</Text>
              {item.rejectReason ? <Text className='activity-item-reason'>原因：{item.rejectReason}</Text> : null}
            </View>
            <View className={`activity-status-badge ${STATUS_CLASS[item.status]}`}>
              <Text>{STATUS_LABELS[item.status]}</Text>
            </View>
          </View>
        ))}
      </View>
    )
  }

  const renderSalesView = () => (
    <View className='data-panel'>
      <View className='sales-summary-grid'>
        {organizerSalesData.map((item) => (
          <View key={item.id} className='sales-summary-card'>
            <Text className='sales-summary-label'>{item.label}</Text>
            <Text className='sales-summary-value'>{item.value}</Text>
            <Text className='sales-summary-trend'>{item.trend}</Text>
          </View>
        ))}
      </View>
      <View className='data-list-card'>
        <Text className='data-list-title'>活动销售排行</Text>
        {activityItems
          .filter((item) => item.status === 'published')
          .map((item, index) => (
            <View key={item.id} className='data-list-row'>
              <Text className='data-list-rank'>0{index + 1}</Text>
              <View className='data-list-main'>
                <Text className='data-list-name'>{item.title}</Text>
                <Text className='data-list-sub'>销售额 ¥{item.sales}</Text>
              </View>
              <Text className='data-list-side'>{item.orders} 单</Text>
            </View>
          ))}
      </View>
    </View>
  )

  const renderOrdersView = () => (
    <View className='data-panel'>
      {organizerOrders.map((item) => (
        <View key={item.id} className='order-card'>
          <View className='order-card-main'>
            <Text className='order-title'>{item.activityTitle}</Text>
            <Text className='order-sub'>{item.buyerName} · {item.ticketType}</Text>
            <Text className='order-sub'>{item.createdAt}</Text>
          </View>
          <View className='order-card-side'>
            <Text className='order-amount'>¥{item.amount}</Text>
            <Text className={`order-status ${item.status}`}>{item.status === 'paid' ? '已支付' : item.status === 'used' ? '已核销' : '退款中'}</Text>
          </View>
        </View>
      ))}
    </View>
  )

  const renderVerifierView = () => (
    <View className='data-panel'>
      {organizerVerifiers.map((item) => (
        <View key={item.id} className='verifier-card'>
          <View className='verifier-avatar'>
            <Text>{item.name.slice(0, 1)}</Text>
          </View>
          <View className='verifier-main'>
            <Text className='verifier-name'>{item.name}</Text>
            <Text className='verifier-sub'>{item.role} · 已核销 {item.verifiedCount} 单</Text>
            <Text className='verifier-sub'>最近活跃 {item.lastActive}</Text>
          </View>
          <View className={`verifier-status ${item.status}`}>
            <Text>{item.status === 'active' ? '在线' : '离线'}</Text>
          </View>
        </View>
      ))}
    </View>
  )

  const renderActivitiesView = () => (
    <View className='organizer-panel'>
      <View className='top-tab-row'>
        {ACTIVITY_TABS.map((item) => (
          <View
            key={item.key}
            className={`top-tab-item ${activityTab === item.key ? 'active' : ''}`}
            onClick={() => setActivityTab(item.key)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className='toolbar-row'>
        <View className='filter-chip' onClick={cycleActivityFilter}>
          <AtIcon value='filter' size='18' color='#fff' />
        </View>
        <View className='search-box'>
          <AtIcon value='search' size='16' color='#8d8d8d' />
          <Input
            className='search-input'
            placeholder='搜索活动'
            placeholderClass='search-input-placeholder'
            value={activityKeyword}
            onInput={(event) => setActivityKeyword(event.detail.value)}
          />
        </View>
      </View>

      <ScrollView className='organizer-scroll activity-scroll' scrollY>
        {activityTab === 'activities' && renderActivityList()}
        {activityTab === 'sales' && renderSalesView()}
        {activityTab === 'orders' && renderOrdersView()}
        {activityTab === 'verifiers' && renderVerifierView()}
        <View className='organizer-safe-bottom large' />
      </ScrollView>

      <View className='floating-plus-button' onClick={openCreateWizard}>
        <AtIcon value='add' size='26' color='#fff' />
      </View>
    </View>
  )

  const renderMoreView = () => (
    <ScrollView className='organizer-scroll' scrollY>
      <View className='more-grid'>
        {[
          { title: '活动商家', desc: '管理合作商家与供应资源', icon: 'shopping-bag' },
          { title: '场地排期', desc: '查看未来 30 天档期安排', icon: 'calendar' },
          { title: '营销组件', desc: '设置早鸟票、优惠券与会员折扣', icon: 'star-2' },
          { title: '品牌设置', desc: '管理 Logo、主色和分享信息', icon: 'settings' },
        ].map((item) => (
          <View key={item.title} className='more-card'>
            <View className='more-card-icon'>
              <AtIcon value={item.icon as any} size='22' color='#fff' />
            </View>
            <Text className='more-card-title'>{item.title}</Text>
            <Text className='more-card-desc'>{item.desc}</Text>
          </View>
        ))}
      </View>
      <View className='organizer-safe-bottom' />
    </ScrollView>
  )

  const renderAccountView = () => (
    <ScrollView className='organizer-scroll' scrollY>
      <View className='account-hero-card'>
        <Image className='account-avatar' src={organizerAvatar} mode='aspectFill' />
        <View className='account-main'>
          <Text className='account-title'>HYPER 派对主办方</Text>
          <Text className='account-sub'>已完成实名认证 · 成都主理人计划</Text>
        </View>
      </View>

      <View className='account-card-list'>
        {[
          ['商家名称', 'Hyper Event Studio'],
          ['联系人', 'Alex / 138 0000 0000'],
          ['常驻城市', '成都 · 武侯区'],
          ['主营方向', '夜店派对 / Live House / 主题活动'],
        ].map(([label, value]) => (
          <View key={label} className='account-info-card'>
            <Text className='account-info-label'>{label}</Text>
            <Text className='account-info-value'>{value}</Text>
          </View>
        ))}
      </View>

      <View className='account-action-card'>
        <Text className='account-action-title'>账户安全</Text>
        <View className='account-switch-row'>
          <Text>重要操作短信提醒</Text>
          <View className='fake-switch on' />
        </View>
        <View className='account-switch-row'>
          <Text>审核失败邮件同步</Text>
          <View className='fake-switch' />
        </View>
      </View>
      <View className='organizer-safe-bottom' />
    </ScrollView>
  )

  const renderNonMerchantView = () => (
    <View className='non-merchant-state'>
      <View className='non-merchant-card'>
        <Text className='non-merchant-title'>当前账号未开通主办中心</Text>
        <Text className='non-merchant-desc'>请使用商家账号登录，或联系运营开通活动管理权限。</Text>
        <Button className='primary-pill-button' onClick={() => Taro.navigateBack({ delta: 1 })}>
          返回个人中心
        </Button>
      </View>
    </View>
  )

  const renderStepHeader = () => (
    <View className='wizard-steps'>
      {STEP_TITLES.map((title, index) => {
        const step = index + 1
        const completed = step < wizardStep
        const active = step === wizardStep
        return (
          <View key={title} className='wizard-step-item'>
            <View className={`wizard-step-dot ${completed ? 'completed' : ''} ${active ? 'active' : ''}`}>
              <Text>{completed ? '✓' : step}</Text>
            </View>
            <Text className={`wizard-step-label ${active ? 'active' : ''}`}>{title}</Text>
            {index < STEP_TITLES.length - 1 ? <View className={`wizard-step-line ${step < wizardStep ? 'completed' : ''}`} /> : null}
          </View>
        )
      })}
    </View>
  )

  const renderStepOne = () => (
    <View className='wizard-section'>
      <View className='field-block'>
        <Text className='field-label'>活动名称</Text>
        <View className='dark-input-shell'>
          <Input
            className='dark-input'
            maxlength={80}
            placeholder='请输入'
            placeholderClass='dark-placeholder'
            value={draft.name}
            onInput={(event) => updateDraft('name', event.detail.value)}
          />
          <Text className='field-counter'>{draft.name.length}/80</Text>
        </View>
      </View>

      <View className='field-block'>
        <Text className='field-label'>分享标题</Text>
        <View className='dark-input-shell'>
          <Input
            className='dark-input'
            maxlength={20}
            placeholder='请输入'
            placeholderClass='dark-placeholder'
            value={draft.shareTitle}
            onInput={(event) => updateDraft('shareTitle', event.detail.value)}
          />
          <Text className='field-counter'>{draft.shareTitle.length}/20</Text>
        </View>
      </View>

      <View className='field-block'>
        <Text className='field-label'>活动日期</Text>
        <View className='picker-shell' onClick={() => void handleChooseDateRange('dateRange')}>
          <Text className={draft.dateRange ? 'picker-text' : 'dark-placeholder'}>{draft.dateRange || '请选择'}</Text>
          <AtIcon value='calendar' size='18' color='#fff' />
        </View>
      </View>

      <View className='toggle-card'>
        <View>
          <Text className='toggle-title'>实名模式</Text>
          <Text className='toggle-desc'>该模式开启后对整场活动生效，一个证件仅可最多购票到设定张数。</Text>
        </View>
        <View
          className={`fake-switch ${draft.realNameRequired ? 'on' : ''}`}
          onClick={() => updateDraft('realNameRequired', !draft.realNameRequired)}
        />
      </View>

      <View className='toggle-card'>
        <View>
          <Text className='toggle-title'>未成年人校验</Text>
          <Text className='toggle-desc'>开启后用户下单默认输入身份证，18 岁以下未成年人将不能购票。</Text>
        </View>
        <View
          className={`fake-switch ${draft.minorCheckRequired ? 'on' : ''}`}
          onClick={() => updateDraft('minorCheckRequired', !draft.minorCheckRequired)}
        />
      </View>

      <View className='field-block'>
        <Text className='field-label'>活动概要</Text>
        <View className='editor-shell'>
          <View className='editor-toolbar'>
            {['undo', 'redo', 'bold', 'italic', 'underline', 'align-left', 'align-center', 'align-right'].map((icon) => (
              <View key={icon} className='editor-tool'>
                <AtIcon value={icon as any} size='14' color='#c9c9c9' />
              </View>
            ))}
          </View>
          <Textarea
            className='editor-textarea'
            maxlength={300}
            placeholder='请输入内容...'
            placeholderClass='dark-placeholder'
            value={draft.summary}
            onInput={(event) => updateDraft('summary', event.detail.value)}
          />
        </View>
      </View>
    </View>
  )

  const renderStepTwo = () => (
    <View className='wizard-section'>
      <View className='field-block'>
        <Text className='field-label'>地区</Text>
        <View className='picker-shell' onClick={() => void handleChooseDistrict()}>
          <Text className='picker-text'>{draft.district}</Text>
          <AtIcon value='chevron-down' size='16' color='#c9c9c9' />
        </View>
      </View>

      <View className='field-block'>
        <Text className='field-label'>当前坐标地址</Text>
        <View className='dark-input-shell full'>
          <Input
            className='dark-input'
            placeholder='请输入地址'
            placeholderClass='dark-placeholder'
            value={draft.address}
            onInput={(event) => updateDraft('address', event.detail.value)}
          />
        </View>
      </View>

      <View className='map-mock-card'>
        <View className='map-grid' />
        <View className='map-landmark left'>西什库</View>
        <View className='map-landmark center'>故宫博物院</View>
        <View className='map-landmark right'>中国美术馆</View>
        <View className='map-pin' />
      </View>
    </View>
  )

  const renderStepThree = () => (
    <View className='wizard-section'>
      {draft.posterSlots.map((slot) => (
        <View key={slot.key} className='upload-block'>
          <Text className='field-label'>{slot.label}</Text>
          <View className='upload-shell' onClick={() => void handleMockUpload(slot.key)}>
            <Button className='upload-button'>上传</Button>
            <Text className='upload-helper'>{slot.fileName || slot.helper}</Text>
          </View>
        </View>
      ))}
    </View>
  )

  const renderStepFour = () => (
    <View className='wizard-section'>
      <View className='ticket-config-card'>
        <Text className='field-label'>规格配置</Text>
        <View className='dark-input-shell full compact'>
          <Input
            className='dark-input'
            value={draft.ticketTypeName}
            onInput={(event) => updateDraft('ticketTypeName', event.detail.value)}
          />
          <Text className='field-counter'>{draft.ticketTypeName.length}/15</Text>
        </View>
        <Text className='tiny-tip'>选项 {draft.ticketSpecs.length}/5</Text>

        <View className='ticket-chip-list'>
          {draft.ticketSpecs.map((item) => (
            <View
              key={item.id}
              className={`ticket-chip ${draft.selectedSpecId === item.id ? 'selected' : ''}`}
              onClick={() => updateDraft('selectedSpecId', item.id)}
            >
              <Text>{item.name}</Text>
              <View
                className='ticket-chip-delete'
                onClick={(event) => {
                  event.stopPropagation()
                  handleDeleteTicketSpec(item.id)
                }}
              >
                <AtIcon value='trash' size='12' color='#a0a0a0' />
              </View>
            </View>
          ))}
        </View>

        <View className='ticket-add-row'>
          <View className='dark-input-shell full compact'>
            <Input
              className='dark-input'
              placeholder='其他选项'
              placeholderClass='dark-placeholder'
              value={draft.quickTicketName}
              onInput={(event) => updateDraft('quickTicketName', event.detail.value)}
            />
          </View>
          <Button className='green-button' onClick={handleAddTicketSpec}>
            新增
          </Button>
        </View>

        <View className='ticket-actions-row'>
          <Button className='ghost-button' onClick={handleClearTicketSpecs}>
            全部清除
          </Button>
          <Button className='white-button' onClick={() => Taro.showToast({ title: '已保存当前规格', icon: 'success' })}>
            保存
          </Button>
        </View>
      </View>

      {draft.ticketSpecs.map((item) => (
        <View key={item.id} className='ticket-detail-card'>
          <View className='ticket-detail-header'>
            <Text className='ticket-detail-title'>规格名称：{item.name}</Text>
            <View
              className={`fake-switch ${item.enabled ? 'on' : ''}`}
              onClick={() => updateTicketSpec(item.id, { enabled: !item.enabled })}
            />
          </View>
          <View className='field-block'>
            <Text className='field-label'>开售时间</Text>
            <View className='picker-shell' onClick={() => void handleChooseDateRange('scheduleRange', item.id)}>
              <Text className='picker-text'>{item.startAt} ~ {item.endAt}</Text>
              <AtIcon value='calendar' size='18' color='#fff' />
            </View>
          </View>

          <View className='ticket-grid'>
            {[
              ['价格', 'price'],
              ['库存', 'stock'],
              ['限购', 'limit'],
              ['观演人', 'attendees'],
            ].map(([label, key]) => (
              <View key={key} className='field-block half'>
                <Text className='field-label'>{label}</Text>
                <View className='dark-input-shell full compact'>
                  <Input
                    className='dark-input'
                    type='number'
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
    <View className='wizard-section'>
      <View className='upload-block'>
        <Text className='field-label'>活动批文资质（选填）</Text>
        <View className='upload-shell qualification' onClick={() => void handleMockUpload('qualification', true)}>
          <Button className='upload-button'>上传</Button>
          <Text className='upload-helper'>
            {draft.qualificationFileName || '点击下载《活动批文资质模板》，演出类活动需提交活动批文，大小 2M 以下'}
          </Text>
        </View>
      </View>
    </View>
  )

  const renderCreateWizard = () => (
    <ScrollView className='organizer-scroll wizard-scroll' scrollY>
      {renderStepHeader()}
      {wizardStep === 1 && renderStepOne()}
      {wizardStep === 2 && renderStepTwo()}
      {wizardStep === 3 && renderStepThree()}
      {wizardStep === 4 && renderStepFour()}
      {wizardStep === 5 && renderStepFive()}

      <View className='wizard-footer'>
        {wizardStep > 1 ? (
          <Button className='text-button' onClick={() => setWizardStep((prev) => Math.max(prev - 1, 1))}>
            上一步
          </Button>
        ) : (
          <View className='text-button placeholder'>上一步</View>
        )}
        {wizardStep < 5 ? (
          <Button className='white-pill-button' onClick={handleNextStep}>
            下一步
          </Button>
        ) : (
          <Button className='white-pill-button' onClick={handleSubmitAudit}>
            提交审核
          </Button>
        )}
      </View>
      <View className='organizer-safe-bottom large' />
    </ScrollView>
  )

  const currentBottomTab = dashboardView === 'createWizard' ? 'activities' : dashboardView

  return (
    <View className='organizer-page'>
      <View className='organizer-navbar' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
        <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
        <View className='nav-content' style={{ height: `${navBarHeight}px` }}>
          <View className='nav-left' style={{ width: `${menuButtonWidth}px` }} onClick={handleBack}>
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
          <View className='nav-title'>管理后台</View>
          <View className='nav-right' style={{ width: `${menuButtonWidth}px` }}>
            <View className='nav-action'>
              <AtIcon value='more' size='18' color='#fff' />
            </View>
          </View>
        </View>
      </View>

      <View className='organizer-body' style={pageBodyStyle}>
        {dashboardView === 'home' && renderHomeView()}
        {dashboardView === 'activities' && renderActivitiesView()}
        {dashboardView === 'more' && renderMoreView()}
        {dashboardView === 'account' && renderAccountView()}
        {dashboardView === 'nonMerchant' && renderNonMerchantView()}
        {dashboardView === 'createWizard' && renderCreateWizard()}
      </View>

      {dashboardView !== 'nonMerchant' ? (
        <View className='dashboard-bottom-nav'>
          {BOTTOM_TABS.map((item) => (
            <View
              key={item.key}
              className={`dashboard-bottom-item ${currentBottomTab === item.key ? 'active' : ''}`}
              onClick={() => handleBottomTabChange(item.key)}
            >
              <AtIcon value={item.icon as any} size='21' color={currentBottomTab === item.key ? '#fff' : '#6f6f6f'} />
              <Text>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
