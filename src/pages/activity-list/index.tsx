import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import {
  getActivityMarkerDetailUrl,
  getActivityMarkerPageUrl,
  isActivityMarker,
  normalizeActivityMarkerSourceId,
} from '@/utils/activity-marker'
import { chooseUserLocation, getStoredChosenLocation } from '@/utils/user-location'
import { requireLogin } from '@/utils/auth'
import CommonHeader from '@/components/CommonHeader'
import { useNavBarMetrics } from '@/hooks/useNavBarMetrics'
import certificationIcon from '../../assets/images/certification.png'
import './index.less'

interface MerchantItem {
  id: number
  user_id?: string | number
  title: string
  type: string
  location: string
  lat: number
  lng: number
  username: string
  user_avatar: string
  cover_image: string
  created_at: string
  avg_price: number
  current_count: number
  post_count: number
  is_subscribe?: boolean
  is_subscribed?: boolean
  is_follow?: boolean
}

interface PartyItem {
  id: string | number
  source?: 'activity'
  sourceId?: string | number
  detailUrl?: string
  userId: string
  title: string
  type: string
  location: string
  lat: number
  lng: number
  user: string
  userAvatar: string
  fans: string
  isVerified: boolean
  time: string
  dynamicCount: number
  attendees: number
  image: string
  price: string
  isFollowed?: boolean
  /** 内容关注目标（docs/content_follow_api_20260810.md），后端未返回时为空 */
  followTargetType?: string
  followTargetId?: string | number
}

interface CategoryItem {
  id: number
  name: string
}

interface DistrictArea {
  id: number
  district_id: number
  name: string
  sort_order?: number
  is_active?: boolean
}

interface DistrictNode {
  id: number
  name: string
  areas: DistrictArea[]
}

interface MerchantTag {
  id: number
  name: string
}

type SortLabel = '智能推荐' | '距离优先' | '人气优先' | '高分优先'
type UserCoord = { lat: number; lng: number }

const ALL_CATEGORY_ID = 0
const ALL_CATEGORY_NAME = '全部'
const FILTER_SORTS: SortLabel[] = ['智能推荐', '距离优先', '人气优先', '高分优先']
const SORT_PARAM_MAP: Record<SortLabel, '' | 'distance' | 'popularity' | 'rating'> = {
  智能推荐: '',
  距离优先: 'distance',
  人气优先: 'popularity',
  高分优先: 'rating',
}

const getSelectedTagLabel = (selectedIds: number[], tags: MerchantTag[]) => {
  if (selectedIds.length === 0) return '更多'
  const tagNames = selectedIds
    .map((id) => tags.find((tag) => tag.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  if (tagNames.length === 0) return `标签${selectedIds.length}`
  if (tagNames.length === 1) return tagNames[0]
  return `${tagNames[0]}+${selectedIds.length - 1}`
}

export default function ActivityListPage() {
  const [list, setList] = useState<PartyItem[]>([])
  const isFetchingRef = useRef(false)
  const followPendingRef = useRef<Set<string | number>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterOpen, setFilterOpen] = useState<'none' | 'cat' | 'sort' | 'area' | 'more'>('none')
  const [selectedCat, setSelectedCat] = useState(ALL_CATEGORY_NAME)
  const [selectedCatId, setSelectedCatId] = useState<number>(ALL_CATEGORY_ID)
  const [categoryOptions, setCategoryOptions] = useState<CategoryItem[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [selectedSort, setSelectedSort] = useState<SortLabel>('智能推荐')
  const [districtTree, setDistrictTree] = useState<DistrictNode[]>([])
  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtError, setDistrictError] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null)
  const [selectedAreaName, setSelectedAreaName] = useState('')
  const [merchantTags, setMerchantTags] = useState<MerchantTag[]>([])
  const [merchantTagsLoading, setMerchantTagsLoading] = useState(false)
  const [merchantTagsError, setMerchantTagsError] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [draftTagIds, setDraftTagIds] = useState<number[]>([])
  const refreshStartRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInitRef = useRef(false)
  const [userCoord, setUserCoord] = useState<UserCoord | null>(null)
  const userCoordRef = useRef<UserCoord | null>(null)

  const { statusBarHeight, navBarHeight } = useNavBarMetrics()
  const filterBarGap = 14
  const filterBarHeight = 40
  const listTopGap = 0
  const headerStyle = useMemo(
    () => ({ top: `${statusBarHeight}px`, height: `${navBarHeight}px`, zIndex: 100 }),
    [navBarHeight, statusBarHeight],
  )
  const filterBarTop = statusBarHeight + navBarHeight + filterBarGap
  const listTop = filterBarTop + filterBarHeight + listTopGap
  const handleSearchClick = useCallback(() => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }, [])

  const applyUserCoord = useCallback((coord: UserCoord) => {
    userCoordRef.current = coord
    setUserCoord(coord)
    return coord
  }, [])

  // 只读取用户选点缓存，不主动调起定位授权；选点入口在“距离优先”排序里
  const ensureUserCoord = useCallback(() => {
    if (userCoordRef.current) return userCoordRef.current
    const stored = getStoredChosenLocation()
    if (!stored) return null
    return applyUserCoord({ lat: stored.latitude, lng: stored.longitude })
  }, [applyUserCoord])

  const fetchCategoryOptions = useCallback(async () => {
    if (categoryLoading) return
    setCategoryLoading(true)
    setCategoryError('')
    try {
      const res = await request({
        url: '/api/v1/category/list',
        method: 'GET',
      })
      const body: any = res?.data
      const source = Array.isArray(body?.data) ? body.data : []
      const normalized: CategoryItem[] = source
        .map((item: any) => ({
          id: Number(item?.id) || 0,
          name: String(item?.name || ''),
        }))
        .filter((item: CategoryItem) => item.id > 0 && Boolean(item.name))
        .sort((a, b) => a.id - b.id)
      setCategoryOptions(normalized)
      if (selectedCatId !== ALL_CATEGORY_ID && !normalized.some((item) => item.id === selectedCatId)) {
        setSelectedCat(ALL_CATEGORY_NAME)
        setSelectedCatId(ALL_CATEGORY_ID)
      }
      return normalized
    } catch (error) {
      setCategoryError('加载失败，点击重试')
      return null
    } finally {
      setCategoryLoading(false)
    }
  }, [categoryLoading, selectedCatId])

  const fetchDistrictTree = useCallback(async () => {
    if (districtLoading) return
    setDistrictLoading(true)
    setDistrictError('')
    try {
      const res = await request({
        url: '/api/v1/districts/tree',
        method: 'GET',
      })
      const body: any = res?.data
      const source = Array.isArray(body?.data) ? body.data : []
      const normalized: DistrictNode[] = source
        .map((item: any) => ({
          id: Number(item?.id) || 0,
          name: String(item?.name || ''),
          areas: Array.isArray(item?.areas)
            ? item.areas
                .filter((area: any) => typeof area?.is_active === 'undefined' || Boolean(area?.is_active))
                .map((area: any) => ({
                  id: Number(area?.id) || 0,
                  district_id: Number(area?.district_id || item?.id) || 0,
                  name: String(area?.name || ''),
                  sort_order: Number(area?.sort_order) || 0,
                  is_active: Boolean(area?.is_active ?? true),
                }))
                .filter((area: DistrictArea) => area.id > 0 && Boolean(area.name))
            : [],
        }))
        .filter((item: DistrictNode) => item.id > 0 && Boolean(item.name))
      setDistrictTree(normalized)
      if (selectedDistrictId !== null && !normalized.some((item) => item.id === selectedDistrictId)) {
        setSelectedDistrictId(null)
        setSelectedAreaId(null)
        setSelectedAreaName('')
      }
      return normalized
    } catch (error) {
      setDistrictError('加载失败，点击重试')
      return null
    } finally {
      setDistrictLoading(false)
    }
  }, [districtLoading, selectedDistrictId])

  const fetchMerchantTags = useCallback(async () => {
    if (merchantTagsLoading) return
    setMerchantTagsLoading(true)
    setMerchantTagsError('')
    try {
      const res = await request({
        url: '/api/v1/merchant/tags',
        method: 'GET',
      })
      const body: any = res?.data
      const source = Array.isArray(body?.data) ? body.data : []
      const normalized: MerchantTag[] = source
        .map((item: any) => ({
          id: Number(item?.id) || 0,
          name: String(item?.name || ''),
        }))
        .filter((item: MerchantTag) => item.id > 0 && Boolean(item.name))
      setMerchantTags(normalized)
      setSelectedTagIds((prev) => prev.filter((id) => normalized.some((item) => item.id === id)))
      setDraftTagIds((prev) => prev.filter((id) => normalized.some((item) => item.id === id)))
      return normalized
    } catch (error) {
      setMerchantTagsError('加载失败，点击重试')
      return null
    } finally {
      setMerchantTagsLoading(false)
    }
  }, [merchantTagsLoading])

  const buildActivityListQueryParams = useCallback((filters: {
    categoryId: number
    sortLabel: SortLabel
    districtId: number | null
    areaId: number | null
    tagIds: number[]
    coord: UserCoord | null
  }) => {
    const queryParts: string[] = ['source=all', 'limit=200']
    if (filters.categoryId !== ALL_CATEGORY_ID) {
      queryParts.push(`category_id=${encodeURIComponent(String(filters.categoryId))}`)
    }
    const sortParam = SORT_PARAM_MAP[filters.sortLabel]
    if (sortParam) {
      queryParts.push(`sort=${encodeURIComponent(sortParam)}`)
    }
    const currentDistrictName = districtTree.find((item) => item.id === filters.districtId)?.name || ''
    const currentAreaName = districtTree
      .reduce<DistrictArea[]>((areas, item) => [...areas, ...item.areas], [])
      .find((item) => item.id === filters.areaId)?.name || ''
    if (filters.districtId) {
      queryParts.push(`district=${encodeURIComponent(currentDistrictName || String(filters.districtId))}`)
    }
    // Keep area/business-area filtering client-side. The map marker endpoint has
    // returned SQL errors for area_id in current backend builds.
    void currentAreaName
    if (filters.tagIds.length > 0) {
      queryParts.push(`tag_ids=${encodeURIComponent(filters.tagIds.join(','))}`)
    }
    if (filters.coord) {
      queryParts.push(`lat=${encodeURIComponent(String(filters.coord.lat))}`)
      queryParts.push(`lng=${encodeURIComponent(String(filters.coord.lng))}`)
    }
    return `?${queryParts.join('&')}`
  }, [districtTree])

  const readListFilterField = (item: any, keys: string[]) => {
    for (const key of keys) {
      if (typeof item?.[key] !== 'undefined') return item[key]
      if (typeof item?.activity?.[key] !== 'undefined') return item.activity[key]
      if (typeof item?.merchant?.[key] !== 'undefined') return item.merchant[key]
    }
    return undefined
  }

  const normalizeListFilterNumbers = (value: any): number[] => {
    if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite)
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter(Number.isFinite)
    }
    const num = Number(value)
    return Number.isFinite(num) ? [num] : []
  }

  const matchesListFilterNumber = (item: any, keys: string[], expected?: number | null) => {
    if (!expected) return true
    const value = readListFilterField(item, keys)
    if (typeof value === 'undefined' || value === null || value === '') return true
    return normalizeListFilterNumbers(value).includes(expected)
  }

  const filterActivityListBySelectedFilters = (source: any[], filters: {
    categoryId: number
    districtId: number | null
    areaId: number | null
    tagIds: number[]
  }) => {
    const requestedTags = filters.tagIds.filter((id) => Number(id) > 0)
    return source.filter((item) => {
      const categoryOk = filters.categoryId === ALL_CATEGORY_ID || matchesListFilterNumber(item, ['category_id', 'categoryId', 'category', 'category_ids', 'categoryIds'], filters.categoryId)
      const districtOk = matchesListFilterNumber(item, ['district_id', 'districtId'], filters.districtId)
      const areaOk = matchesListFilterNumber(item, ['area_id', 'areaId', 'business_area_id', 'businessAreaId'], filters.areaId)
      const tagValue = readListFilterField(item, ['tag_ids', 'tagIds', 'tags', 'merchant_tag_ids', 'merchantTagIds'])
      const tagOk = requestedTags.length === 0 || typeof tagValue === 'undefined' || requestedTags.every((id) => normalizeListFilterNumbers(tagValue).includes(id))
      return categoryOk && districtOk && areaOk && tagOk
    })
  }

  const fetchList = useCallback(async (options?: {
    isRefresh?: boolean
    silentError?: boolean
    categoryId?: number
    sortLabel?: SortLabel
    districtId?: number | null
    areaId?: number | null
    tagIds?: number[]
  }) => {
    const { isRefresh = false, silentError = false } = options || {}
    if (isFetchingRef.current) return false
    isFetchingRef.current = true
    try {
      const activeCategoryId = typeof options?.categoryId === 'number' ? options.categoryId : selectedCatId
      const activeSortLabel = options?.sortLabel || selectedSort
      const coord = userCoordRef.current || ensureUserCoord()
      const activeDistrictId = typeof options?.districtId !== 'undefined' ? options.districtId : selectedDistrictId
      const activeAreaId = typeof options?.areaId !== 'undefined' ? options.areaId : selectedAreaId
      const activeTagIds = Array.isArray(options?.tagIds) ? options.tagIds : selectedTagIds
      const query = buildActivityListQueryParams({
        categoryId: activeCategoryId,
        sortLabel: activeSortLabel,
        districtId: activeDistrictId,
        areaId: activeAreaId,
        tagIds: activeTagIds,
        coord,
      })
      const res = await request({
        url: `/api/v1/map/markers${query}`,
        method: 'GET',
      })
      const dataList = Array.isArray(res?.data?.data?.list)
        ? res.data.data.list
        : (Array.isArray(res?.data?.list) ? res.data.list : [])
      const filteredDataList = Array.isArray(dataList)
        ? filterActivityListBySelectedFilters(dataList, {
            categoryId: activeCategoryId,
            districtId: activeDistrictId,
            areaId: activeAreaId,
            tagIds: activeTagIds,
          }).filter((item: any) => isActivityMarker(item))
        : []
      const mapped: PartyItem[] = filteredDataList
        ? filteredDataList.map((item: MerchantItem | any) => {
            const sourceId = normalizeActivityMarkerSourceId(item)
            const createdAt = item.start_time || item.created_at ? new Date(item.start_time || item.created_at) : null
            const formattedTime =
              createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString().slice(0, 10) : item.start_time || item.created_at || ''
            return {
              id: sourceId,
              source: 'activity',
              sourceId,
              detailUrl: getActivityMarkerDetailUrl(item),
              userId: String((item as any)?.user_id ?? ''),
              title: item.title || item.name || '',
              type: '活动',
              location: item.location,
              lat: item.lat,
              lng: item.lng,
              user: item.username || item.user || '--',
              userAvatar: item.user_avatar || item.userAvatar || '',
              image: item.cover_image || item.poster_list || '',
              time: formattedTime,
              price: typeof item.avg_price === 'number' && item.avg_price > 0 ? (item.avg_price / 100).toFixed(0) : '--',
              attendees: item.current_count || 0,
              dynamicCount: item.post_count || 0,
              fans: String(item.follow_count ?? item.current_count ?? '--'),
              isVerified: false,
              isFollowed: Boolean((item as any)?.is_follow ?? (item as any)?.isFollowed),
              followTargetType: (item as any)?.follow_target_type ?? (item as any)?.followTargetType,
              followTargetId: (item as any)?.follow_target_id ?? (item as any)?.followTargetId,
            }
          })
        : []

      setList(mapped)
      return true
    } catch (error) {
      console.error('Activity list load failed:', error)
      if (isRefresh || !silentError) {
        Taro.showToast({ title: '刷新失败', icon: 'none' })
      }
      return false
    } finally {
      isFetchingRef.current = false
    }
  }, [selectedCatId, selectedSort, selectedDistrictId, selectedAreaId, selectedTagIds, ensureUserCoord, buildActivityListQueryParams])

  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) return

    refreshStartRef.current = Date.now()
    setIsRefreshing(true)

    const succeeded = await fetchList({ isRefresh: true })
    const elapsed = Date.now() - refreshStartRef.current
    const remain = Math.max(600 - elapsed, 0)

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    const finish = () => {
      setIsRefreshing(false)
      if (succeeded) {
        Taro.showToast({ title: '刷新成功', icon: 'success' })
      }
    }

    if (remain > 0) {
      refreshTimerRef.current = setTimeout(() => {
        finish()
        refreshTimerRef.current = null
      }, remain)
    } else {
      finish()
    }
  }, [fetchList])

  useEffect(() => {
    if (hasInitRef.current) return
    hasInitRef.current = true
    void (async () => {
      await fetchCategoryOptions()
      await fetchList({ silentError: true, categoryId: selectedCatId })
    })()
  }, [fetchCategoryOptions, fetchList, selectedCatId])

  useEffect(() => () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    userCoordRef.current = userCoord
  }, [userCoord])

  const toggleFollow = (id: string | number) => {
    if (!requireLogin()) return
    const target = list.find((item) => item.id === id)
    if (!target) return
    const followTarget = target.followTargetType && target.followTargetId
      ? { target_type: target.followTargetType, target_id: target.followTargetId }
      : null
    if (!target.userId && !followTarget) {
      Taro.showToast({ title: '用户信息缺失', icon: 'none' })
      return
    }
    if (followPendingRef.current.has(id)) return

    const nextFollowed = !Boolean(target.isFollowed)
    const action = nextFollowed ? 'follow' : 'unfollow'

    followPendingRef.current.add(id)
    setList((prev) => prev.map((item) => (item.id === id ? { ...item, isFollowed: nextFollowed } : item)))

    request({
      url: `/api/v1/follow/${action}`,
      method: 'POST',
      // 内容关注：保留 user_id 兼容字段，有 follow_target_* 时按对象关注（docs/content_follow_api_20260810.md）
      data: { user_id: String(target.userId), ...(followTarget || {}) },
    })
      .then((res: any) => {
        const code = Number(res?.data?.code)
        if (code !== 200) {
          throw new Error(res?.data?.msg || '操作失败')
        }
        Taro.showToast({ title: nextFollowed ? '已关注' : '已取消关注', icon: 'success' })
      })
      .catch(() => {
        setList((prev) => prev.map((item) => (item.id === id ? { ...item, isFollowed: !nextFollowed } : item)))
        Taro.showToast({ title: '操作失败', icon: 'none' })
      })
      .finally(() => {
        followPendingRef.current.delete(id)
      })
  }

  const handleFilterClick = (type: 'cat' | 'sort' | 'area' | 'more') => {
    if (type === 'cat' && !categoryLoading && categoryOptions.length === 0 && !categoryError) {
      void fetchCategoryOptions()
    }
    if (type === 'area' && !districtLoading && districtTree.length === 0 && !districtError) {
      void fetchDistrictTree()
    }
    if (type === 'more') {
      setDraftTagIds(selectedTagIds)
      if (!merchantTagsLoading && merchantTags.length === 0 && !merchantTagsError) {
        void fetchMerchantTags()
      }
    }
    setFilterOpen(filterOpen === type ? 'none' : type)
  }

  const handleBackToMap = async () => {
    const pageStack = Taro.getCurrentPages()
    if (pageStack.length > 1) {
      try {
        await Taro.navigateBack({ delta: 1 })
        return
      } catch (error) {
        console.warn('navigateBack failed, fallback to switchTab:', error)
      }
    }
    Taro.switchTab({ url: '/pages/index/index' })
  }

  const handleGoDetail = (item: PartyItem) => {
    const extParams = `&lat=${encodeURIComponent(String(item.lat ?? ''))}&lng=${encodeURIComponent(String(item.lng ?? ''))}&location=${encodeURIComponent(item.location || '')}`
    Taro.navigateTo({ url: getActivityMarkerPageUrl(item, extParams) })
  }

  const currentDistrict = districtTree.find((item) => item.id === selectedDistrictId) || districtTree[0]
  const currentDistrictAreas = currentDistrict?.areas || []
  const selectedTagLabel = getSelectedTagLabel(selectedTagIds, merchantTags)

  const toggleDraftTag = (id: number) => {
    setDraftTagIds((prev) => (
      prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]
    ))
  }

  const applyTagFilter = () => {
    setSelectedTagIds(draftTagIds)
    setFilterOpen('none')
    void fetchList({ tagIds: draftTagIds })
  }

  return (
    <View className='activity-list-page'>
      <CommonHeader
        className='activity-list-header'
        positionMode='fixed'
        style={headerStyle}
        onSearchClick={handleSearchClick}
      />

      <View className='filter-bar' style={{ top: `${filterBarTop}px` }}>
        <View className='filter-actions'>
          <View className={`filter-item ${filterOpen === 'cat' ? 'active' : ''}`} onClick={() => handleFilterClick('cat')}>
            <Text className='txt'>{selectedCat === ALL_CATEGORY_NAME ? '全部' : selectedCat}</Text>
            <AtIcon value={filterOpen === 'cat' ? 'chevron-up' : 'chevron-down'} size='10' color={filterOpen === 'cat' ? '#FF2E4D' : '#999'} />
          </View>
          <View className={`filter-item ${filterOpen === 'sort' ? 'active' : ''}`} onClick={() => handleFilterClick('sort')}>
            <Text className='txt'>{selectedSort}</Text>
            <AtIcon value={filterOpen === 'sort' ? 'chevron-up' : 'chevron-down'} size='10' color={filterOpen === 'sort' ? '#FF2E4D' : '#999'} />
          </View>
          <View className={`filter-item ${filterOpen === 'area' || selectedAreaId ? 'active' : ''}`} onClick={() => handleFilterClick('area')}>
            <Text className='txt'>{selectedAreaName || '区域'}</Text>
            <AtIcon value={filterOpen === 'area' ? 'chevron-up' : 'chevron-down'} size='10' color={filterOpen === 'area' || selectedAreaId ? '#FF2E4D' : '#999'} />
          </View>
          <View className={`filter-item ${filterOpen === 'more' || selectedTagIds.length > 0 ? 'active' : ''}`} onClick={() => handleFilterClick('more')}>
            <Text className='txt'>{selectedTagLabel}</Text>
            <AtIcon value={filterOpen === 'more' ? 'chevron-up' : 'chevron-down'} size='10' color={filterOpen === 'more' || selectedTagIds.length > 0 ? '#FF2E4D' : '#999'} />
          </View>
        </View>

        <View className='back-map-btn' onClick={handleBackToMap}>
          <Image className='back-map-icon' src={require('../../assets/icons/back-to-map.svg')} mode='aspectFit' />
        </View>
      </View>

      {filterOpen !== 'none' && (
        <View className='filter-dropdown-overlay' style={{ top: `${filterBarTop + filterBarHeight}px` }}>
          <View className='mask' onClick={() => setFilterOpen('none')} />
          <View className='dropdown-content'>
            {filterOpen === 'cat' &&
              (
                <>
                  {categoryLoading && (
                    <View className='dd-item'>加载中...</View>
                  )}
                  {!categoryLoading && categoryError && (
                    <View className='dd-item selected' onClick={() => { void fetchCategoryOptions() }}>
                      {categoryError}
                    </View>
                  )}
                  {!categoryLoading && !categoryError &&
                    [{ id: ALL_CATEGORY_ID, name: ALL_CATEGORY_NAME }, ...categoryOptions].map((cat) => (
                      <View
                        key={cat.id}
                        className={`dd-item ${selectedCatId === cat.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedCat(cat.name)
                          setSelectedCatId(cat.id)
                          setFilterOpen('none')
                          void fetchList({ categoryId: cat.id })
                        }}
                      >
                        {cat.name}
                      </View>
                    ))}
                </>
              )}
            {filterOpen === 'sort' &&
              FILTER_SORTS.map((sort) => (
                <View
                  key={sort}
                  className={`dd-item ${selectedSort === sort ? 'selected' : ''}`}
                  onClick={() => {
                    void (async () => {
                      if (sort === '距离优先' && !userCoordRef.current) {
                        // 距离排序需要参考坐标，统一走微信原生选点（chooseLocation）
                        const chosen = await chooseUserLocation()
                        if (chosen) {
                          applyUserCoord({ lat: chosen.latitude, lng: chosen.longitude })
                        } else {
                          Taro.showToast({ title: '未选择位置，距离排序可能不准', icon: 'none' })
                        }
                      }
                      setSelectedSort(sort)
                      setFilterOpen('none')
                      void fetchList({ sortLabel: sort, isRefresh: false })
                    })()
                  }}
                >
                  {sort}
                </View>
              ))}
            {filterOpen === 'area' && (
              <>
                {districtLoading && <View className='dd-item'>加载中...</View>}
                {!districtLoading && districtError && (
                  <View className='dd-item selected' onClick={() => { void fetchDistrictTree() }}>
                    {districtError}
                  </View>
                )}
                {!districtLoading && !districtError && (
                  <View
                    className={`dd-item ${selectedDistrictId === null && selectedAreaId === null ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDistrictId(null)
                      setSelectedAreaId(null)
                      setSelectedAreaName('')
                      setFilterOpen('none')
                      void fetchList({ districtId: null, areaId: null })
                    }}
                  >
                    不限
                  </View>
                )}
                {!districtLoading && !districtError && districtTree.map((district) => (
                  <View
                    key={district.id}
                    className={`dd-item ${selectedDistrictId === district.id && selectedAreaId === null ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDistrictId(district.id)
                      setSelectedAreaId(null)
                      setSelectedAreaName(district.name)
                      setFilterOpen('none')
                      void fetchList({ districtId: district.id, areaId: null })
                    }}
                  >
                    {district.name}
                  </View>
                ))}
                {!districtLoading && !districtError && currentDistrictAreas.map((area) => (
                  <View
                    key={area.id}
                    className={`dd-item dd-sub-item ${selectedAreaId === area.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDistrictId(currentDistrict?.id || area.district_id)
                      setSelectedAreaId(area.id)
                      setSelectedAreaName(area.name)
                      setFilterOpen('none')
                      void fetchList({ districtId: currentDistrict?.id || area.district_id, areaId: area.id })
                    }}
                  >
                    {area.name}
                  </View>
                ))}
              </>
            )}
            {filterOpen === 'more' && (
              <View className='dd-more-panel'>
                <Text className='dd-section-title'>优惠标签</Text>
                {merchantTagsLoading && <View className='dd-item'>加载中...</View>}
                {!merchantTagsLoading && merchantTagsError && (
                  <View className='dd-item selected' onClick={() => { void fetchMerchantTags() }}>
                    {merchantTagsError}
                  </View>
                )}
                {!merchantTagsLoading && !merchantTagsError && merchantTags.length === 0 && (
                  <View className='dd-item'>暂无可选标签</View>
                )}
                {!merchantTagsLoading && !merchantTagsError && merchantTags.length > 0 && (
                  <View className='dd-chip-row'>
                    {merchantTags.map((tag) => (
                      <View
                        key={tag.id}
                        className={`dd-chip ${draftTagIds.includes(tag.id) ? 'selected' : ''}`}
                        onClick={() => toggleDraftTag(tag.id)}
                      >
                        {tag.name}
                      </View>
                    ))}
                  </View>
                )}
                <View className='dd-actions'>
                  <View
                    className='dd-action-btn'
                    onClick={() => {
                      setDraftTagIds([])
                      setSelectedTagIds([])
                      setFilterOpen('none')
                      void fetchList({ tagIds: [] })
                    }}
                  >
                    重置
                  </View>
                  <View className='dd-action-btn primary' onClick={applyTagFilter}>
                    确定
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      <ScrollView
        scrollY
        refresherEnabled
        refresherTriggered={isRefreshing}
        onRefresherRefresh={handleRefresh}
        onRefresherRestore={() => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
            refreshTimerRef.current = null
          }
          setIsRefreshing(false)
        }}
        onRefresherAbort={() => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
            refreshTimerRef.current = null
          }
          setIsRefreshing(false)
        }}
        refresherBackground='#000000'
        refresherDefaultStyle='white'
        showScrollbar={false}
        className='list-scroll'
        style={{ top: `${listTop}px`, height: `calc(100vh - ${listTop}px)` }}
      >
        <View className='list-content'>
          {list.map((item) => (
            <View key={item.id} className='activity-card' onClick={() => handleGoDetail(item)}>
              <View className='poster-area'>
                {item.image ? <Image src={item.image} mode='aspectFill' className='cover-img' /> : <View className='cover-placeholder' />}
                <View className='attendees-capsule'>
                  <Image className='run-icon' src={require('../../assets/icons/run.svg')} mode='aspectFit' />
                  <Text className='num-italic'>{item.attendees || 0}</Text>
                </View>
              </View>

              <View className='info-area'>
                <View className='title-row'>
                  <Text className='title'>{item.title}</Text>
                  <Text className='tag'>{item.type}</Text>
                </View>

                <View className='meta-row'>
                  <View className='meta-left'>
                    <Image className='time-icon' src={require('../../assets/icons/time.svg')} mode='aspectFit' />
                    <Text className='txt txt-first'>{item.time}</Text>
                    <Text className='txt'>{item.dynamicCount}条动态</Text>
                    <Text className='txt price'>¥{item.price}/人</Text>
                  </View>
                  <Text className='location'>{item.location}</Text>
                </View>

                <View className='action-row'>
                  <View className='user-box'>
                    <View className='avatar'>
                      {item.userAvatar && <Image src={item.userAvatar} mode='aspectFill' className='avatar-img' />}
                    </View>
                    <View className='user-text'>
                      <View className='name-line'>
                        <Text className='name'>{item.user}</Text>
                        <Image className='certification-icon' src={certificationIcon} mode='aspectFit' />
                      </View>
                      <Text className='fans'>{item.fans} 粉丝</Text>
                    </View>
                  </View>

                  <View className='btn-group'>
                    <View
                      className={`btn outline ${(item.isFollowed || followPendingRef.current.has(item.id)) ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFollow(item.id)
                      }}
                    >
                      {item.isFollowed ? '已关注' : '关注'}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: '40px' }} />
        </View>
      </ScrollView>
    </View>
  )
}
