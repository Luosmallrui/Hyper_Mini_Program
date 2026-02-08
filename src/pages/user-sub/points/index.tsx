import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon, AtActivityIndicator } from 'taro-ui'
import { request } from '@/utils/request'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/activity-indicator.scss'
import './index.scss'

interface PointRecord {
  id: string | number
  type: string
  amount: number
  description: string
  created_at: string
  order_type?: string
}

interface PointsData {
  balance: number
  pending_count: number
  pending_amount: number
  records: PointRecord[]
  next_cursor: string | number | null
}

export default function PointsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all')
  const [pointsData, setPointsData] = useState<PointsData>({
    balance: 0,
    pending_count: 0,
    pending_amount: 0,
    records: [],
    next_cursor: null
  })
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  
  // 布局适配状态
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(Number.isNaN(nbHeight) ? 44 : nbHeight)
    
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)
  }, [])

  useEffect(() => {
    loadPointsData()
    loadPointsRecords(true)
  }, [])

  useEffect(() => {
    setHasMore(true)
    setPointsData(prev => ({ ...prev, records: [], next_cursor: null }))
    loadPointsRecords(true)
  }, [activeTab])

  const loadPointsData = async () => {
    try {
      const res = await request({ url: '/api/v1/points/balance', method: 'GET' })
      if (res.data && res.data.code === 200) {
        setPointsData(prev => ({
          ...prev,
          balance: res.data.data.balance || 0,
          pending_count: res.data.data.pending_count || 0,
          pending_amount: res.data.data.pending_amount || 0
        }))
      }
    } catch (error) { console.error(error) }
  }

  const loadPointsRecords = async (isRefresh: boolean = false) => {
    if (loading || (!isRefresh && !hasMore)) return
    setLoading(true)
    const currentCursor = isRefresh ? '' : pointsData.next_cursor

    try {
      const res = await request({
        url: '/api/v1/points/records',
        method: 'GET',
        data: { pageSize: 20, cursor: currentCursor, type: activeTab === 'all' ? '' : activeTab }
      })

      if (res.data && res.data.code === 200) {
        const { records: newRecords, next_cursor, has_more } = res.data.data
        setPointsData(prev => ({
          ...prev,
          records: isRefresh ? newRecords : [...prev.records, ...newRecords],
          next_cursor
        }))
        setHasMore(has_more)
      }
    } catch (error) {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}`
  }

  const formatAmount = (amount: number): string => {
    return amount > 0 ? `+${amount}` : `${amount}`
  }

  return (
    <View className='points-page'>
      <View className='top-bg'>
        <Image
          className='top-bg-img'
          src={require('../../../assets/images/backgound.png')}
          mode='scaleToFill'
        />
      </View>

      <View className='custom-navbar' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
        <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
        <View className='nav-content' style={{ height: `${navBarHeight}px` }}>
          <View
            className='nav-left'
            style={{ width: `${menuButtonWidth}px` }}
            onClick={() => Taro.navigateBack()}
          >
            <AtIcon value='chevron-left' size='24' color='#fff' />
          </View>
          <View className='nav-title'>我的积分</View>
          <View className='nav-right' style={{ width: `${menuButtonWidth}px` }}>
            <View className='nav-action'>
              <AtIcon value='more' size='18' color='#fff' />
            </View>
          </View>
        </View>
      </View>

      <View
        className='page-body'
        style={{
          height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`,
          marginTop: `${statusBarHeight + navBarHeight}px`
        }}
      >
        {/* 头部卡片区域 */}
        <View className='hero-section'>
          <Image
            className='coin-decoration'
            src={require('../../../assets/images/coin.png')}
            mode='widthFix'
          />

          <View className='header-card-content'>
            <View className='card-left'>
              <Text className='label'>积分余额</Text>
              <Text className='amount'>{pointsData.balance.toFixed(1)}</Text>

              {pointsData.pending_count > 0 && (
                <View className='pending-tag'>
                  <Text>{pointsData.pending_count}笔订单 共{pointsData.pending_amount}分待入账</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 列表区域 */}
        <View className='records-container'>
          <View className='tabs-header'>
            {[
              { key: 'all', label: '全部' },
              { key: 'income', label: '积分收入' },
              { key: 'expense', label: '积分支出' }
            ].map(tab => (
              <View
                key={tab.key}
                className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <Text>{tab.label}</Text>
                {activeTab === tab.key && <View className='indicator' />}
              </View>
            ))}
          </View>

          <ScrollView
            className='list-scroll'
            scrollY
            onScrollToLower={() => loadPointsRecords(false)}
            lowerThreshold={100}
          >
            <View className='list-content'>
              {pointsData.records.length > 0 ? (
                pointsData.records.map((item, idx) => (
                  <View key={`${item.id}-${idx}`} className='record-item'>
                    <View className='info'>
                      <Text className='desc'>{item.description || (item.amount > 0 ? '消费 (门票)' : '积分使用')}</Text>
                      <Text className='time'>
                        {item.amount > 0 ? '积分发放时间' : '积分使用时间'} {formatDate(item.created_at)}
                      </Text>
                    </View>
                    <Text className={`amount ${item.amount > 0 ? 'plus' : 'minus'}`}>
                      {formatAmount(item.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <View className='empty-state'>
                  <Text>暂无记录</Text>
                </View>
              )}

              {loading && <View className='loading-center'><AtActivityIndicator color='#999' /></View>}
              {!hasMore && pointsData.records.length > 0 && <View className='no-more'>- 没有更多了 -</View>}
            </View>
          </ScrollView>
        </View>

        <View className='safe-area-spacer' />
      </View>
    </View>
  )
}
