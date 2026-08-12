import { useEffect, useState } from 'react'
import { Image, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import { MORE_TABS } from '../constants'
import { organizerActivities } from '../mock'
import { MoreInnerTab } from '../types'

interface MoreToolItem {
  id: string
  title: string
  createdAt: string
}

interface CollectionDraft {
  title: string
  intro: string
  shareTitle: string
  shareImage: string
  shareImageName: string
  activityTitle: string
}

interface LotteryPrize {
  id: string
  name: string
  count: string
  rate: string
}

interface LotteryDraft {
  name: string
  timeRange: string
  method: string
  rule: string
  prizes: LotteryPrize[]
}

const EMPTY_TEXT: Record<MoreInnerTab, string> = {
  collections: '暂无合集',
  lottery: '暂无活动抽奖',
}

const SEARCH_PLACEHOLDER: Record<MoreInnerTab, string> = {
  collections: '搜索合集标题',
  lottery: '搜索抽奖活动',
}

const initialCollectionDraft = (): CollectionDraft => ({
  title: '',
  intro: '',
  shareTitle: '',
  shareImage: '',
  shareImageName: '',
  activityTitle: '',
})

const initialLotteryDraft = (): LotteryDraft => ({
  name: 'PURE LOOP抽奖活动',
  timeRange: '2026-05-14 11:04 ~ 2026-06-14 11:04',
  method: '中奖用户请联系主办方并出示您的中奖凭证记录，包含中奖截图、姓名和联系方式，我们将会根据具体的奖品类型为您安排邮寄或其他方式发放奖品。奖品仅限本人使用，不可进行二次交易。',
  rule: '每人可抽奖1次，本活动权益仅当前页面享受，如发现使用第三方工具作弊、违反活动规则、恶意注册大量账号作弊等其他违规行为，此刻霓虹有权取消您参与活动、领取奖品/赠品的资格。',
  prizes: [{ id: 'prize-1', name: '', count: '1', rate: '1' }],
})

interface OrganizerMoreViewProps {
  onCreateModeChange?: (isCreating: boolean) => void
  closeCreateSignal?: number
  onChooseDateRange?: (currentValue: string, onChoose: (value: string) => void) => void
}

export default function OrganizerMoreView(props: OrganizerMoreViewProps) {
  const { onCreateModeChange, closeCreateSignal, onChooseDateRange } = props
  const [activeTab, setActiveTab] = useState<MoreInnerTab>('collections')
  const [createMode, setCreateMode] = useState<MoreInnerTab | null>(null)
  const [keyword, setKeyword] = useState('')
  const [toolItems, setToolItems] = useState<Record<MoreInnerTab, MoreToolItem[]>>({
    collections: [],
    lottery: [],
  })
  const [collectionDraft, setCollectionDraft] = useState<CollectionDraft>(initialCollectionDraft())
  const [lotteryDraft, setLotteryDraft] = useState<LotteryDraft>(initialLotteryDraft())

  const filteredItems = toolItems[activeTab].filter((item) => item.title.includes(keyword.trim()))

  useEffect(() => {
    onCreateModeChange?.(createMode !== null)
  }, [createMode, onCreateModeChange])

  useEffect(() => {
    if (closeCreateSignal) {
      setCreateMode(null)
    }
  }, [closeCreateSignal])

  const openCreate = () => {
    setCreateMode(activeTab)
    if (activeTab === 'collections') setCollectionDraft(initialCollectionDraft())
    if (activeTab === 'lottery') setLotteryDraft(initialLotteryDraft())
  }

  const chooseActivity = (onChoose: (title: string) => void) => {
    Taro.showActionSheet({
      itemList: organizerActivities.slice(0, 6).map((item) => item.title),
      success: (res) => {
        const activity = organizerActivities[res.tapIndex]
        if (activity) onChoose(activity.title)
      },
    })
  }

  const chooseDateRange = (onChoose: (value: string) => void) => {
    const currentValue = lotteryDraft.timeRange
    if (onChooseDateRange) {
      onChooseDateRange(currentValue, onChoose)
      return
    }

    onChoose('2026-05-14 11:04 ~ 2026-06-14 11:04')
    Taro.showToast({ title: '已选择时间', icon: 'none' })
  }

  const chooseShareImage = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const filePath = res.tempFilePaths[0]
      if (!filePath) return
      setCollectionDraft((prev) => ({
        ...prev,
        shareImage: filePath,
        shareImageName: `share-${Date.now()}.png`,
      }))
    } catch (_) {
      // user cancelled
    }
  }

  const saveCreate = () => {
    if (!createMode) return
    const title = getCreateTitle(createMode)
    if (!title) {
      Taro.showToast({ title: '请填写必填信息', icon: 'none' })
      return
    }
    setToolItems((prev) => ({
      ...prev,
      [createMode]: [{ id: `${createMode}-${Date.now()}`, title, createdAt: '刚刚创建' }, ...prev[createMode]],
    }))
    setCreateMode(null)
    Taro.showToast({ title: '已保存', icon: 'success' })
  }

  const getCreateTitle = (mode: MoreInnerTab) => {
    if (mode === 'collections') return collectionDraft.title.trim()
    return lotteryDraft.name.trim()
  }

  const renderListMode = () => (
    <>
      <View className="segmented-control" style={{ width: 'auto' }}>
        {MORE_TABS.map((item) => (
          <View
            key={item.key}
            className={`segmented-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            <Text className={`segmented-item-text ${activeTab === item.key ? 'active' : ''}`}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="more-toolbar">
        <View className="search-box">
          <AtIcon value="search" size={16} color="#A8AFBD" />
          <Input
            className="search-input"
            placeholder={SEARCH_PLACEHOLDER[activeTab]}
            placeholderClass="search-input-placeholder"
            value={keyword}
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>
      </View>

      <ScrollView className="organizer-scroll" scrollY style={{ paddingTop: 0 }}>
        {filteredItems.length > 0 ? (
          <View className="more-list">
            {filteredItems.map((item) => (
              <View key={item.id} className="more-list-card">
                <View>
                  <Text className="more-list-title">{item.title}</Text>
                  <Text className="more-list-meta">{createdMetaText(activeTab)} · {item.createdAt}</Text>
                </View>
                <AtIcon value="chevron-right" size={18} color="#666" />
              </View>
            ))}
          </View>
        ) : (
          <View className="more-empty">
            <Text className="more-empty-text">{EMPTY_TEXT[activeTab]}</Text>
          </View>
        )}
        <View className="organizer-safe-bottom large" />
      </ScrollView>

      <View className="more-fab" onClick={openCreate}>
        <AtIcon value="add" size={26} color="#fff" />
      </View>
    </>
  )

  const renderCollectionForm = () => (
    <ScrollView className="more-create-scroll" scrollY>
      <View className="more-form-card">
        {renderTextInput('合集标题', collectionDraft.title, 50, (value) => setCollectionDraft((prev) => ({ ...prev, title: value })), true)}
        {renderTextInput('合集简介', collectionDraft.intro, 50, (value) => setCollectionDraft((prev) => ({ ...prev, intro: value })), true)}
        {renderTextInput('分享标题', collectionDraft.shareTitle, 30, (value) => setCollectionDraft((prev) => ({ ...prev, shareTitle: value })), true)}

        <View className="more-form-field">
          <Text className="more-form-label">分享图</Text>
          <View className="more-upload-box" onClick={chooseShareImage}>
            {collectionDraft.shareImage ? (
              <Image className="more-upload-image" src={collectionDraft.shareImage} mode="aspectFill" />
            ) : (
              <>
                <View className="more-upload-button">
                  <Text>上传</Text>
                </View>
                <Text className="more-upload-helper">适用于合集列表及分享展示，比例4:3 文件大小2M以下</Text>
              </>
            )}
          </View>
        </View>

        <View className="more-form-field">
          <Text className="more-form-label required">选择活动</Text>
          <View className="more-picker-shell" onClick={() => chooseActivity((title) => setCollectionDraft((prev) => ({ ...prev, activityTitle: title })))}>
            <Text className={collectionDraft.activityTitle ? 'more-picker-text' : 'more-picker-placeholder'}>
              {collectionDraft.activityTitle || '点击选择活动'}
            </Text>
            <AtIcon value="chevron-right" size={18} color="#A0A0A0" />
          </View>
        </View>

        {renderFormActions('创建合集')}
      </View>
      <View className="organizer-safe-bottom large" />
    </ScrollView>
  )

  const renderLotteryForm = () => (
    <ScrollView className="more-create-scroll" scrollY>
      <View className="more-form-card">
        <Text className="more-form-card-title">基础信息</Text>
        {renderTextInput('抽奖活动名称', lotteryDraft.name, 50, (value) => setLotteryDraft((prev) => ({ ...prev, name: value })), true)}

        <View className="more-form-field">
          <Text className="more-form-label required muted">抽奖时间</Text>
          <View className="more-picker-shell" onClick={() => chooseDateRange((value) => setLotteryDraft((prev) => ({ ...prev, timeRange: value })))}>
            <Text className="more-picker-text">{lotteryDraft.timeRange}</Text>
            <AtIcon value="calendar" size={18} color="#A0A0A0" />
          </View>
        </View>

        {renderTextarea('领券方式', lotteryDraft.method, 300, (value) => setLotteryDraft((prev) => ({ ...prev, method: value })), true)}
        {renderTextarea('抽奖规则', lotteryDraft.rule, 300, (value) => setLotteryDraft((prev) => ({ ...prev, rule: value })), true)}

        <View className="more-prize-header">
          <Text>奖品配置</Text>
          <View className="more-prize-add" onClick={addPrize}>
            <Text>＋</Text>
          </View>
        </View>

        {lotteryDraft.prizes.map((prize, index) => (
          <View key={prize.id} className="more-prize-card">
            <View className="more-prize-title-row">
              <Text className="more-prize-title">奖品 {index + 1}</Text>
              <View className="more-prize-delete" onClick={() => deletePrize(prize.id)}>
                <Text>删除</Text>
              </View>
            </View>
            <View className="more-prize-divider" />
            {renderPrizeInput(prize.id, '奖品名称', 'name', prize.name, '请输入')}
            {renderPrizeInput(prize.id, '奖品数量', 'count', prize.count)}
            {renderPrizeInput(prize.id, '中奖率(%)', 'rate', prize.rate)}
          </View>
        ))}

        {renderFormActions('保存')}
      </View>
      <View className="organizer-safe-bottom large" />
    </ScrollView>
  )

  const addPrize = () => {
    setLotteryDraft((prev) => ({
      ...prev,
      prizes: [...prev.prizes, { id: `prize-${Date.now()}`, name: '', count: '1', rate: '1' }],
    }))
  }

  const deletePrize = (id: string) => {
    setLotteryDraft((prev) => {
      if (prev.prizes.length === 1) return prev
      return { ...prev, prizes: prev.prizes.filter((item) => item.id !== id) }
    })
  }

  const updatePrize = (id: string, key: keyof LotteryPrize, value: string) => {
    setLotteryDraft((prev) => ({
      ...prev,
      prizes: prev.prizes.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }))
  }

  const renderPrizeInput = (id: string, label: string, key: keyof LotteryPrize, value: string, placeholder = '') => (
    <View className="more-form-field compact">
      <Text className="more-sub-label">{label}</Text>
      <View className="more-input-shell">
        <Input
          className="more-form-input"
          type={key === 'name' ? 'text' : 'number'}
          placeholder={placeholder}
          placeholderClass="dark-placeholder"
          value={value}
          onInput={(event) => updatePrize(id, key, event.detail.value)}
        />
      </View>
    </View>
  )

  const renderTextInput = (
    label: string,
    value: string,
    maxLength: number,
    onChange: (value: string) => void,
    required = false,
    placeholder = '请输入',
  ) => (
    <View className="more-form-field">
      <Text className={`more-form-label ${required ? 'required' : ''}`}>{label}</Text>
      <View className="more-input-shell">
        <Input
          className="more-form-input"
          maxlength={maxLength}
          placeholder={placeholder}
          placeholderClass="dark-placeholder"
          value={value}
          onInput={(event) => onChange(event.detail.value)}
        />
        <Text className="more-field-counter">{value.length} / {maxLength}</Text>
      </View>
    </View>
  )

  const renderTextarea = (
    label: string,
    value: string,
    maxLength: number,
    onChange: (value: string) => void,
    required = false,
  ) => (
    <View className="more-form-field">
      <Text className={`more-form-label muted ${required ? 'required' : ''}`}>{label}</Text>
      <View className="more-textarea-shell">
        <Textarea
          className="more-form-textarea"
          maxlength={maxLength}
          value={value}
          onInput={(event) => onChange(event.detail.value)}
        />
        <Text className="more-field-counter textarea">{value.length} / {maxLength}</Text>
      </View>
    </View>
  )

  const renderFormActions = (confirmText: string) => (
    <View className="more-form-actions">
      <View className="more-form-cancel" onClick={() => setCreateMode(null)}>
        <Text>取消</Text>
      </View>
      <View className="more-form-confirm" onClick={saveCreate}>
        <Text>{confirmText}</Text>
      </View>
    </View>
  )

  return (
    <View className="organizer-panel">
      {createMode === null && renderListMode()}
      {createMode === 'collections' && renderCollectionForm()}
      {createMode === 'lottery' && renderLotteryForm()}
      {createMode !== null && (
        <View className="more-preview-fab" onClick={() => Taro.showToast({ title: '预览暂未接入', icon: 'none' })}>
          <Text>预览</Text>
        </View>
      )}
    </View>
  )
}

const createdMetaText = (tab: MoreInnerTab) => {
  if (tab === 'collections') return '活动合集'
  return '活动抽奖'
}
