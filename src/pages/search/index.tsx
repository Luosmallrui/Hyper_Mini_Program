import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

interface SubscribeItem {
  id: number
  title: string
  type: string
  cover_image: string
  location_name: string
  address: string
  lat: number
  lng: number
  categories: number
}

interface SubscriptionCard {
  id: number
  name: string
  coverImage: string
  type: string
  lat: number
  lng: number
  locationName: string
}

type SearchType = 3
type HistoryKeyword = string

interface SearchResultApiItem {
  id?: number | string
  merchant_id?: number | string
  party_id?: number | string
  title?: string
  name?: string
  merchant_name?: string
  cover_image?: string
  cover?: string
  image?: string
  type?: string
  type_name?: string
  location_name?: string
  location?: string
  address?: string
}

interface SearchResultCard {
  id: string
  title: string
  coverImage: string
  type: string
  locationName: string
}

const SEARCH_TYPE: SearchType = 3

const normalizeHistoryKeywords = (source: unknown): HistoryKeyword[] => {
  if (!Array.isArray(source)) return []
  const unique = new Set<string>()
  source.forEach((item) => {
    const value = String(item || '').trim()
    if (value) unique.add(value)
  })
  return Array.from(unique)
}

const extractSearchItems = (source: unknown): SearchResultApiItem[] => {
  if (Array.isArray(source)) return source as SearchResultApiItem[]
  if (!source || typeof source !== 'object') return []
  const data = source as {
    parties?: unknown
    list?: unknown
    merchants?: unknown
  }
  if (Array.isArray(data.parties)) return data.parties as SearchResultApiItem[]
  if (Array.isArray(data.list)) return data.list as SearchResultApiItem[]
  if (Array.isArray(data.merchants)) return data.merchants as SearchResultApiItem[]
  return []
}

const mapSearchResults = (source: unknown): SearchResultCard[] => {
  const items = extractSearchItems(source)
  return items
    .map((item: SearchResultApiItem, index: number) => {
      const rawId = item?.id ?? item?.merchant_id ?? item?.party_id ?? `search-${index}`
      const title = String(item?.title || item?.name || item?.merchant_name || '').trim()
      const coverImage = String(item?.cover_image || item?.cover || item?.image || '').trim()
      const type = String(item?.type || item?.type_name || '').trim()
      const locationName = String(item?.location_name || item?.location || item?.address || '').trim()
      return {
        id: String(rawId),
        title: title || '未命名',
        coverImage,
        type,
        locationName,
      }
    })
    .filter((item) => Boolean(item.id))
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [subscriptions, setSubscriptions] = useState<SubscriptionCard[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultCard[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [historyKeywords, setHistoryKeywords] = useState<HistoryKeyword[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyEditMode, setHistoryEditMode] = useState(false)
  const deletingKeywordSetRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()

    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)

    const contentHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(contentHeight > 0 ? contentHeight : 44)
  }, [])

  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true)
    setSubscriptionError('')
    try {
      const res = await request({
        url: '/api/v1/subscribe/list',
        method: 'GET',
      })
      const body: any = res?.data
      if (body?.code !== 200) {
        setSubscriptions([])
        setSubscriptionError('加载失败，点击重试')
        return
      }
      const source = Array.isArray(body?.data) ? body.data : []
      const mapped: SubscriptionCard[] = source
        .map((item: SubscribeItem) => ({
          id: Number(item?.id) || 0,
          name: String(item?.title || ''),
          coverImage: String(item?.cover_image || ''),
          type: String(item?.type || ''),
          lat: Number(item?.lat) || 0,
          lng: Number(item?.lng) || 0,
          locationName: String(item?.location_name || ''),
        }))
        .filter((item) => item.id > 0)
      setSubscriptions(mapped)
    } catch (error) {
      setSubscriptions([])
      setSubscriptionError('加载失败，点击重试')
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  const fetchSearchHistory = async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await request({
        url: '/api/v1/search/history',
        method: 'GET',
      })
      const body: any = res?.data
      if (body?.code !== 200) {
        setHistoryKeywords([])
        setHistoryError('历史记录加载失败')
        return
      }
      setHistoryKeywords(normalizeHistoryKeywords(body?.data))
    } catch (error) {
      setHistoryKeywords([])
      setHistoryError('历史记录加载失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSearch = async (keywordText?: string) => {
    const targetKeyword = String(keywordText ?? keyword).trim()
    if (!targetKeyword) {
      setHasSearched(false)
      setSearchResults([])
      setSearchError('')
      return
    }

    setKeyword(targetKeyword)
    setHasSearched(true)
    setIsSearching(true)
    setSearchError('')
    try {
      const res = await request({
        url: `/api/v1/search/?type=${SEARCH_TYPE}&keyword=${encodeURIComponent(targetKeyword)}`,
        method: 'GET',
      })
      const body: any = res?.data
      if (body?.code !== 200) {
        setSearchResults([])
        setSearchError('搜索失败，请重试')
        return
      }
      const mapped = mapSearchResults(body?.data)
      setSearchResults(mapped)
      void fetchSearchHistory()
    } catch (error) {
      setSearchResults([])
      setSearchError('搜索失败，请重试')
    } finally {
      setIsSearching(false)
    }
  }

  const deleteHistoryKeyword = async (historyKeyword: string) => {
    const targetKeyword = String(historyKeyword || '').trim()
    if (!targetKeyword) return
    if (deletingKeywordSetRef.current.has(targetKeyword)) return

    deletingKeywordSetRef.current.add(targetKeyword)
    try {
      const res = await request({
        url: '/api/v1/search/history',
        method: 'DELETE',
        data: { keyword: targetKeyword },
      })
      const body: any = res?.data
      if (body?.code !== 200) {
        Taro.showToast({ title: '删除失败', icon: 'none' })
        return
      }
      setHistoryKeywords((prev) => prev.filter((item) => item !== targetKeyword))
    } catch (error) {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    } finally {
      deletingKeywordSetRef.current.delete(targetKeyword)
    }
  }

  useDidShow(() => {
    void fetchSubscriptions()
    void fetchSearchHistory()
  })

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleKeywordInput = (value: string) => {
    setKeyword(value)
    if (!String(value || '').trim()) {
      setHasSearched(false)
      setSearchResults([])
      setSearchError('')
      setIsSearching(false)
    }
  }

  const handleResultClick = (item: SearchResultCard) => {
    const id = String(item?.id || '').trim()
    if (!id) return
    const type = String(item?.type || '').toLowerCase()
    const isVenue = type.includes('场地') || type.includes('venue') || type.includes('club')
    const path = isVenue
      ? `/pages/venue/index?id=${encodeURIComponent(id)}&tag=${encodeURIComponent(item.type || '')}`
      : `/pages/activity/index?id=${encodeURIComponent(id)}&tag=${encodeURIComponent(item.type || '')}`
    Taro.navigateTo({ url: path })
  }

  return (
    <View className='search-page-dark'>
      <View className='custom-navbar' style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px` }}>
        <View className='nav-left' onClick={handleBack}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>

        <View className='nav-center'>
          <Image src={require('../../assets/images/hyper-icon.png')} mode='heightFix' className='nav-logo' />
        </View>

        <View className='nav-right' />
      </View>

      <View style={{ height: `${statusBarHeight + navBarHeight}px` }} />

      <ScrollView scrollY className='search-content'>
        <View className='search-bar-wrapper'>
          <View className='search-input-box'>
            <View className='search-icon-btn' onClick={() => { void handleSearch() }}>
              <AtIcon value='search' size='18' color='#999' />
            </View>
            <Input
              className='search-input'
              placeholder='搜索商家、俱乐部、活动名称、主办方等'
              placeholderClass='ph-dark'
              value={keyword}
              onInput={(event) => handleKeywordInput(event.detail.value)}
              confirmType='search'
              onConfirm={(event) => { void handleSearch(event.detail.value) }}
            />
          </View>
        </View>

        {!hasSearched && (
          <View className='section-block'>
            <Text className='section-title'>我的订阅</Text>
            <View className='subscription-list'>
              {loadingSubscriptions && <View className='subscription-state-text'>加载中...</View>}

              {!loadingSubscriptions && subscriptionError && (
                <View className='subscription-state-text error' onClick={() => { void fetchSubscriptions() }}>
                  {subscriptionError}
                </View>
              )}

              {!loadingSubscriptions && !subscriptionError && subscriptions.length === 0 && (
                <View className='subscription-state-text'>暂无订阅</View>
              )}

              {!loadingSubscriptions && !subscriptionError && subscriptions.map((sub) => (
                <View key={sub.id} className='sub-item'>
                  <View className='avatar-circle'>
                    {sub.coverImage ? (
                      <Image className='real-avatar' src={sub.coverImage} mode='aspectFill' />
                    ) : (
                      <View className='mock-logo-text'>--</View>
                    )}
                  </View>
                  <Text className='sub-name'>{sub.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!hasSearched && (
          <View className='section-block'>
            <View className='title-row'>
              <Text className='section-title'>历史搜索</Text>
              <View className={`trash-btn ${historyEditMode ? 'active' : ''}`} onClick={() => setHistoryEditMode((prev) => !prev)}>
                <AtIcon value='trash' size='16' color={historyEditMode ? '#ff4d4f' : '#666'} />
              </View>
            </View>

            {historyLoading && <View className='search-state-text'>加载中...</View>}

            {!historyLoading && historyError && (
              <View className='search-state-text error' onClick={() => { void fetchSearchHistory() }}>
                {historyError}
              </View>
            )}

            {!historyLoading && !historyError && historyKeywords.length === 0 && (
              <View className='search-state-text'>暂无历史搜索</View>
            )}

            {!historyLoading && !historyError && historyKeywords.length > 0 && (
              <View className={`history-tags ${historyEditMode ? 'editing' : ''}`}>
                {historyKeywords.map((tag) => (
                  <View
                    key={tag}
                    className='tag-pill'
                    onClick={() => {
                      if (historyEditMode) return
                      void handleSearch(tag)
                    }}
                  >
                    <Text className='tag-pill-text'>{tag}</Text>
                    {historyEditMode && (
                      <View
                        className='history-tag-del-icon'
                        onClick={(event) => {
                          event.stopPropagation()
                          void deleteHistoryKeyword(tag)
                        }}
                      >
                        <Text>x</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {hasSearched && (
          <View className='section-block search-result-section'>
            <Text className='section-title'>搜索结果</Text>

            {isSearching && <View className='search-state-text'>搜索中...</View>}

            {!isSearching && searchError && (
              <View className='search-state-text error' onClick={() => { void handleSearch() }}>
                {searchError}
              </View>
            )}

            {!isSearching && !searchError && searchResults.length === 0 && (
              <View className='search-state-text'>未找到相关结果</View>
            )}

            {!isSearching && !searchError && searchResults.length > 0 && (
              <View className='search-result-list'>
                {searchResults.map((item) => (
                  <View key={item.id} className='search-result-item' onClick={() => handleResultClick(item)}>
                    <View className='result-cover-wrap'>
                      {item.coverImage ? (
                        <Image className='result-cover' src={item.coverImage} mode='aspectFill' />
                      ) : (
                        <View className='result-cover-placeholder'>--</View>
                      )}
                    </View>
                    <View className='result-info'>
                      <Text className='result-title'>{item.title}</Text>
                      <Text className='result-meta'>{item.type || '-'}</Text>
                      <Text className='result-meta'>{item.locationName || '-'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
