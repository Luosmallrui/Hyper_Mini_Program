import { useEffect, useMemo, useState } from 'react'
import { Button, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import OrganizerActivitiesView from './activities'
import OrganizerAccountView from './account'
import { BOTTOM_TABS, STATUS_LABELS, STEP_TITLES } from './constants'
import OrganizerHomeView from './home'
import {
  createInitialDraft,
  organizerActivities,
  organizerDateOptions,
  organizerDistricts,
  organizerTicketSpecs,
} from './mock'
import OrganizerMoreView from './more'
import {
  CreateActivityDraft,
  OrganizerActivityItem,
  OrganizerActivityStatus,
  OrganizerActivityTab,
  OrganizerDashboardTab,
  OrganizerDashboardView,
  TicketSpec,
} from './types'
import './index.scss'

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
  const [dashboardView, setDashboardView] = useState<OrganizerDashboardView>('home')
  const [activityTab, setActivityTab] = useState<OrganizerActivityTab>('activities')
  const [activityKeyword, setActivityKeyword] = useState('')
  const [activityFilter, setActivityFilter] = useState<'all' | OrganizerActivityStatus>('all')
  const [activityItems, setActivityItems] = useState<OrganizerActivityItem[]>(organizerActivities)
  const [wizardStep, setWizardStep] = useState(1)
  const [draft, setDraft] = useState<CreateActivityDraft>(createInitialDraft())

  useEffect(() => {
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
      height: '100vh',
    }),
    [],
  )

  const openCreateWizard = (step = 1) => {
    setDashboardView('createWizard')
    setActivityTab('activities')
    setWizardStep(step)
    setDraft(createInitialDraft())
  }

  const handleBottomTabChange = (nextView: OrganizerDashboardTab) => {
    setDashboardView(nextView)
    if (nextView === 'activities') {
      setActivityTab('activities')
    }
  }

  const openActivityCenterTab = (nextTab: OrganizerActivityTab) => {
    setDashboardView('activities')
    setActivityTab(nextTab)
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

  const renderNonMerchantView = () => (
    <View className="non-merchant-state">
      <View className="non-merchant-card">
        <Text className="non-merchant-title">当前账号未开通主办中心</Text>
        <Text className="non-merchant-desc">请使用商家账号登录，或联系运营开通活动管理权限。</Text>
        <Button className="primary-pill-button" onClick={() => Taro.navigateBack({ delta: 1 })}>
          返回个人中心
        </Button>
      </View>
    </View>
  )

  const renderStepHeader = () => (
    <View className="wizard-steps">
      {STEP_TITLES.map((title, index) => {
        const step = index + 1
        const completed = step < wizardStep
        const active = step === wizardStep
        return (
          <View key={title} className="wizard-step-item">
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
    <View className="wizard-section">
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
          <Text className="field-counter">{draft.name.length}/80</Text>
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
          <Text className="field-counter">{draft.shareTitle.length}/20</Text>
        </View>
      </View>

      <View className="field-block">
        <Text className="field-label">活动日期</Text>
        <View className="picker-shell" onClick={() => void handleChooseDateRange('dateRange')}>
          <Text className={draft.dateRange ? 'picker-text' : 'dark-placeholder'}>{draft.dateRange || '请选择'}</Text>
          <AtIcon value="calendar" size="18" color="#fff" />
        </View>
      </View>

      <View className="toggle-card">
        <View>
          <Text className="toggle-title">实名模式</Text>
          <Text className="toggle-desc">该模式开启后对整场活动生效，一个证件仅可最多购票到设定张数。</Text>
        </View>
        <View
          className={`fake-switch ${draft.realNameRequired ? 'on' : ''}`}
          onClick={() => updateDraft('realNameRequired', !draft.realNameRequired)}
        />
      </View>

      <View className="toggle-card">
        <View>
          <Text className="toggle-title">未成年人校验</Text>
          <Text className="toggle-desc">开启后用户下单默认输入身份证，18 岁以下未成年人将不能购票。</Text>
        </View>
        <View
          className={`fake-switch ${draft.minorCheckRequired ? 'on' : ''}`}
          onClick={() => updateDraft('minorCheckRequired', !draft.minorCheckRequired)}
        />
      </View>

      <View className="field-block">
        <Text className="field-label">活动概要</Text>
        <View className="editor-shell">
          <View className="editor-toolbar">
            {['undo', 'redo', 'bold', 'italic', 'underline', 'align-left', 'align-center', 'align-right'].map((icon) => (
              <View key={icon} className="editor-tool">
                <AtIcon value={icon as any} size="14" color="#c9c9c9" />
              </View>
            ))}
          </View>
          <Textarea
            className="editor-textarea"
            maxlength={300}
            placeholder="请输入内容..."
            placeholderClass="dark-placeholder"
            value={draft.summary}
            onInput={(event) => updateDraft('summary', event.detail.value)}
          />
        </View>
      </View>
    </View>
  )

  const renderStepTwo = () => (
    <View className="wizard-section">
      <View className="field-block">
        <Text className="field-label">地区</Text>
        <View className="picker-shell" onClick={() => void handleChooseDistrict()}>
          <Text className="picker-text">{draft.district}</Text>
          <AtIcon value="chevron-down" size="16" color="#c9c9c9" />
        </View>
      </View>

      <View className="field-block">
        <Text className="field-label">当前坐标地址</Text>
        <View className="dark-input-shell full">
          <Input
            className="dark-input"
            placeholder="请输入地址"
            placeholderClass="dark-placeholder"
            value={draft.address}
            onInput={(event) => updateDraft('address', event.detail.value)}
          />
        </View>
      </View>

      <View className="map-mock-card">
        <View className="map-grid" />
        <View className="map-landmark left">西什库</View>
        <View className="map-landmark center">故宫博物院</View>
        <View className="map-landmark right">中国美术馆</View>
        <View className="map-pin" />
      </View>
    </View>
  )

  const renderStepThree = () => (
    <View className="wizard-section">
      {draft.posterSlots.map((slot) => (
        <View key={slot.key} className="upload-block">
          <Text className="field-label">{slot.label}</Text>
          <View className="upload-shell" onClick={() => void handleMockUpload(slot.key)}>
            <Button className="upload-button">上传</Button>
            <Text className="upload-helper">{slot.fileName || slot.helper}</Text>
          </View>
        </View>
      ))}
    </View>
  )

  const renderStepFour = () => (
    <View className="wizard-section">
      <View className="ticket-config-card">
        <Text className="field-label">规格配置</Text>
        <View className="dark-input-shell full compact">
          <Input
            className="dark-input"
            value={draft.ticketTypeName}
            onInput={(event) => updateDraft('ticketTypeName', event.detail.value)}
          />
          <Text className="field-counter">{draft.ticketTypeName.length}/15</Text>
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
                <AtIcon value="trash" size="12" color="#a0a0a0" />
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

      {draft.ticketSpecs.map((item) => (
        <View key={item.id} className="ticket-detail-card">
          <View className="ticket-detail-header">
            <Text className="ticket-detail-title">规格名称：{item.name}</Text>
            <View
              className={`fake-switch ${item.enabled ? 'on' : ''}`}
              onClick={() => updateTicketSpec(item.id, { enabled: !item.enabled })}
            />
          </View>
          <View className="field-block">
            <Text className="field-label">开售时间</Text>
            <View className="picker-shell" onClick={() => void handleChooseDateRange('scheduleRange', item.id)}>
              <Text className="picker-text">{item.startAt} ~ {item.endAt}</Text>
              <AtIcon value="calendar" size="18" color="#fff" />
            </View>
          </View>

          <View className="ticket-grid">
            {[
              ['价格', 'price'],
              ['库存', 'stock'],
              ['限购', 'limit'],
              ['观演人', 'attendees'],
            ].map(([label, key]) => (
              <View key={key} className="field-block half">
                <Text className="field-label">{label}</Text>
                <View className="dark-input-shell full compact">
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
        <View className="upload-shell qualification" onClick={() => void handleMockUpload('qualification', true)}>
          <Button className="upload-button">上传</Button>
          <Text className="upload-helper">
            {draft.qualificationFileName || '点击下载《活动批文资质模板》，演出类活动需提交活动批文，大小 2M 以下'}
          </Text>
        </View>
      </View>
    </View>
  )

  const renderCreateWizard = () => (
    <ScrollView className="organizer-scroll wizard-scroll" scrollY>
      {renderStepHeader()}
      {wizardStep === 1 && renderStepOne()}
      {wizardStep === 2 && renderStepTwo()}
      {wizardStep === 3 && renderStepThree()}
      {wizardStep === 4 && renderStepFour()}
      {wizardStep === 5 && renderStepFive()}

      <View className="wizard-footer">
        {wizardStep > 1 ? (
          <Button className="text-button" onClick={() => setWizardStep((prev) => Math.max(prev - 1, 1))}>
            上一步
          </Button>
        ) : (
          <View className="text-button placeholder">上一步</View>
        )}
        {wizardStep < 5 ? (
          <Button className="white-pill-button" onClick={handleNextStep}>
            下一步
          </Button>
        ) : (
          <Button className="white-pill-button" onClick={handleSubmitAudit}>
            提交审核
          </Button>
        )}
      </View>
      <View className="organizer-safe-bottom large" />
    </ScrollView>
  )

  const currentBottomTab = dashboardView === 'createWizard' ? 'activities' : dashboardView

  return (
    <View className="organizer-page">
      <View className="organizer-body" style={pageBodyStyle}>
        {dashboardView === 'home' && (
          <OrganizerHomeView
            activityItems={activityItems}
            onChangeTab={handleBottomTabChange}
            onOpenCreateWizard={() => openCreateWizard(1)}
            onOpenSales={() => openActivityCenterTab('sales')}
            onOpenVerifiers={() => openActivityCenterTab('verifiers')}
            onOpenTicketConfig={() => openCreateWizard(4)}
            onOpenDistribution={() => handleBottomTabChange('more')}
          />
        )}
        {dashboardView === 'activities' && (
          <OrganizerActivitiesView
            activityItems={activityItems}
            activityKeyword={activityKeyword}
            activityFilter={activityFilter}
            activityTab={activityTab}
            filteredActivities={filteredActivities}
            onChangeKeyword={setActivityKeyword}
            onChangeTab={setActivityTab}
            onCycleFilter={cycleActivityFilter}
            onOpenCreateWizard={() => openCreateWizard(1)}
          />
        )}
        {dashboardView === 'more' && <OrganizerMoreView />}
        {dashboardView === 'account' && <OrganizerAccountView />}
        {dashboardView === 'nonMerchant' && renderNonMerchantView()}
        {dashboardView === 'createWizard' && renderCreateWizard()}
      </View>

      {dashboardView !== 'nonMerchant' ? (
        <View className="dashboard-bottom-nav">
          {BOTTOM_TABS.map((item) => (
            <View
              key={item.key}
              className={`dashboard-bottom-item ${currentBottomTab === item.key ? 'active' : ''}`}
              onClick={() => handleBottomTabChange(item.key)}
            >
              <AtIcon value={item.icon as any} size="21" color={currentBottomTab === item.key ? '#fff' : '#6f6f6f'} />
              <Text>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
