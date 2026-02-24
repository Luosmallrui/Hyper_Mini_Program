import { View, Text, Map as TaroMap, Swiper, SwiperItem, Image, ScrollView, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import 'taro-ui/dist/style/components/slider.scss'
import { request } from '@/utils/request'
import CommonHeader from '@/components/CommonHeader'
import { useNavBarMetrics } from '@/hooks/useNavBarMetrics'
import { setTabBarIndex } from '../../store/tabbar'
import mapPinIcon from '../../assets/icons/map-pin.svg'
import mapPinFallbackIcon from '../../assets/icons/map-pin-fallback.png'
import partyMarkerFallbackIcon from '../../assets/icons/marker-party-fallback.png'
import venueMarkerFallbackIcon from '../../assets/icons/marker-venue-fallback.png'
import mapMakerBackground from '../../assets/images/map-maker-background.png'
import certificationIcon from '../../assets/images/certification.png'
import {
  AVATAR_MARKER_CANVAS_ID,
  ICON_ONLY_MARKER_CANVAS_ID,
  TITLE_MARKER_CANVAS_ID,
  USER_AVATAR_MARKER_SIZE,
  clearMarkerCaches,
  buildStrokedTitleMarker,
  buildCircularAvatarMarker,
} from './map-marker'
import './index.less'

const CATEGORIES = ['全部分类', '滑板', '派对', '汽车', '纹身', '体育运动', '活动', '露营', '酒吧/场地', '篮球']
const AREA_LEVEL1 = [{ key: 'dist', name: '距离' }, { key: 'region', name: '行政区/商圈' }]
const MAP_KEY = 'Y7YBZ-3UUEN-Z3KFC-SH4QG-LH5RT-IAB4S'
const USER_LOCATION_MARKER_ID = 99900001
const MARKER_INACTIVE_HEIGHT = 30
const MARKER_ACTIVE_HEIGHT = 65
const MAP_FOCUS_PIXEL_OFFSET = 100
const DEFAULT_MAP_SCALE = 14
const EARTH_METERS_PER_PIXEL_AT_EQUATOR = 156543.03392
const METERS_PER_DEGREE_LAT = 111320
const MARKER_LABEL_ANCHOR_Y_ACTIVE = 7
const MARKER_LABEL_ANCHOR_Y_INACTIVE = 21
const ACTIVE_BACKGROUND_RATIO = 735 / 817
const ACTIVE_FOREGROUND_ICON_HEIGHT = 33
const ACTIVE_FOREGROUND_ICON_ANCHOR_Y = 1.55
const USER_LOCATION_MARKER_DISPLAY_SIZE = Math.max(16, Math.round(USER_AVATAR_MARKER_SIZE * 0.94))
const MORE_TAGS: Array<{ id: number; name: string }> = []

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
  icon?: string
  is_subscribe?: boolean
  is_subscribed?: boolean
  is_follow?: boolean
}

interface PartyItem {
  id: string | number
  title: string
  type: string
  userId: string
  location: string
  lat: number
  lng: number
  user: string
  userAvatar: string
  time: string
  price: string
  attendees: number
  dynamicCount: number
  image: string
  icon?: string
  rank?: string
  fans?: string
  isVerified?: boolean
  isFollowed?: boolean
  isSubscribed?: boolean
}

interface DistrictArea {
  id: number
  district_id: number
  name: string
  sort_order: number
  is_active: boolean
}

interface DistrictNode {
  id: number
  name: string
  sort_order: number
  areas: DistrictArea[]
}

interface MerchantTag {
  id: number
  name: string
}

export default function IndexPage() {
  const [current, setCurrent] = useState(0)
  const [markers, setMarkers] = useState<any[]>([])
  const [userLocationMarker, setUserLocationMarker] = useState<any | null>(null)
  const [partyList, setPartyList] = useState<PartyItem[]>([])
  const [hasToken, setHasToken] = useState(() => Boolean(Taro.getStorageSync('access_token')))
  const isEmpty = partyList.length === 0

  const [filterOpen, setFilterOpen] = useState<'none' | 'all' | 'area' | 'more'>('none')
  const [selectedCategory, setSelectedCategory] = useState('全部分类')
  const [areaL1, setAreaL1] = useState('region')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [draftTagIds, setDraftTagIds] = useState<number[]>([])
  const [merchantTags, setMerchantTags] = useState<MerchantTag[]>(MORE_TAGS)
  const [merchantTagsLoading, setMerchantTagsLoading] = useState(false)
  const [merchantTagsLoaded, setMerchantTagsLoaded] = useState(false)
  const [merchantTagsError, setMerchantTagsError] = useState('')
  const [districtTree, setDistrictTree] = useState<DistrictNode[]>([])
  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtLoaded, setDistrictLoaded] = useState(false)
  const [districtError, setDistrictError] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null)
  const [selectedAreaName, setSelectedAreaName] = useState('')
  const { statusBarHeight, navBarHeight } = useNavBarMetrics()
  const [initialCenter, setInitialCenter] = useState({ lng: 104.066, lat: 30.657 })
  const initialCenterRef = useRef(initialCenter)
  const mapCtx = useRef<any>(null)
  const listLoadingRef = useRef(false)
  const listPendingRef = useRef(false)
  const markerBuildTokenRef = useRef(0)
  const markerRenderVersionRef = useRef(0)
  const markerIndexMapRef = useRef<Map<number, number>>(new Map())
  const partyListRef = useRef<PartyItem[]>([])
  const currentRef = useRef(0)
  const hasTokenRef = useRef(hasToken)
  const mapScaleRef = useRef(DEFAULT_MAP_SCALE)
  const cameraAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cameraAnimTokenRef = useRef(0)
  const districtLoadedRef = useRef(districtLoaded)
  const districtLoadingRef = useRef(districtLoading)
  const subscribePendingRef = useRef<Set<string | number>>(new Set())
  const followPendingRef = useRef<Set<string | number>>(new Set())
  const selectedTagIdsRef = useRef<number[]>(selectedTagIds)
  const selectedDistrictIdRef = useRef<number | null>(selectedDistrictId)
  const selectedAreaIdRef = useRef<number | null>(selectedAreaId)
  const merchantTagsLoadedRef = useRef(merchantTagsLoaded)
  const merchantTagsLoadingRef = useRef(merchantTagsLoading)
  const syncAuthState = () => {
    const next = Boolean(Taro.getStorageSync('access_token'))
    hasTokenRef.current = next
    setHasToken(next)
    return next
  }

  const resetIndexState = () => {
    listLoadingRef.current = false
    listPendingRef.current = false
    markerBuildTokenRef.current += 1
    markerRenderVersionRef.current += 1
    markerIndexMapRef.current = new Map()
    setPartyList([])
    partyListRef.current = []
    setMarkers([])
    setUserLocationMarker(null)
    setCurrent(0)
    currentRef.current = 0
    setDistrictTree([])
    setDistrictLoaded(false)
    setDistrictLoading(false)
    setDistrictError('')
    setSelectedDistrictId(null)
    setSelectedAreaId(null)
    setSelectedAreaName('')
    setSelectedTagIds([])
    setDraftTagIds([])
    setMerchantTags(MORE_TAGS)
    setMerchantTagsLoaded(false)
    setMerchantTagsLoading(false)
    setMerchantTagsError('')
  }

  const getMapContext = () => {
    if (!mapCtx.current) {
      mapCtx.current = Taro.createMapContext('myMap')
    }
    return mapCtx.current
  }

  const pixelOffsetToLatitudeDelta = (latitude: number, scale: number, pixelOffset: number) => {
    const latRad = (latitude * Math.PI) / 180
    const metersPerPixel =
      (EARTH_METERS_PER_PIXEL_AT_EQUATOR * Math.max(Math.cos(latRad), 0.01)) / Math.pow(2, scale)
    return (pixelOffset * metersPerPixel) / METERS_PER_DEGREE_LAT
  }

  const getFocusCenter = (longitude: number, latitude: number, scale: number) => {
    const latDelta = pixelOffsetToLatitudeDelta(latitude, scale, MAP_FOCUS_PIXEL_OFFSET)
    return {
      longitude,
      latitude: latitude - latDelta,
    }
  }

  const getCurrentMapScale = async () => {
    const fallbackScale = Number.isFinite(mapScaleRef.current) ? mapScaleRef.current : DEFAULT_MAP_SCALE
    const ctx = getMapContext()
    if (!ctx || typeof ctx.getScale !== 'function') return fallbackScale

    try {
      const res: any = await new Promise((resolve) => {
        ctx.getScale({
          success: (ret) => resolve(ret),
          fail: () => resolve(null),
        })
      })
      const latestScale = Number(res?.scale)
      if (Number.isFinite(latestScale)) {
        mapScaleRef.current = latestScale
        return latestScale
      }
      return fallbackScale
    } catch (error) {
      return fallbackScale
    }
  }

  const stopCameraAnimation = () => {
    if (cameraAnimTimerRef.current) {
      clearTimeout(cameraAnimTimerRef.current)
      cameraAnimTimerRef.current = null
    }
    cameraAnimTokenRef.current += 1
  }

  const animateMapCenterTo = (targetLng: number, targetLat: number, duration = 360) => {
    stopCameraAnimation()
    const animToken = cameraAnimTokenRef.current
    const start = initialCenterRef.current
    const startAt = Date.now()

    const tick = () => {
      if (animToken !== cameraAnimTokenRef.current) return
      const elapsed = Date.now() - startAt
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextLng = start.lng + (targetLng - start.lng) * eased
      const nextLat = start.lat + (targetLat - start.lat) * eased
      const nextCenter = { lng: nextLng, lat: nextLat }
      initialCenterRef.current = nextCenter
      setInitialCenter(nextCenter)

      if (progress < 1) {
        cameraAnimTimerRef.current = setTimeout(tick, 16)
        return
      }

      cameraAnimTimerRef.current = null
      const ctx = getMapContext()
      ctx?.moveToLocation({ longitude: targetLng, latitude: targetLat })
    }

    tick()
  }

  const moveMapTo = async (longitude: number, latitude: number) => {
    const latestScale = await getCurrentMapScale()
    const focusCenter = getFocusCenter(longitude, latitude, latestScale)
    animateMapCenterTo(focusCenter.longitude, focusCenter.latitude)
  }

  const bySortOrderThenId = <T extends { sort_order?: number; id?: number }>(a: T, b: T) => {
    const sa = Number.isFinite(Number(a?.sort_order)) ? Number(a?.sort_order) : Number.MAX_SAFE_INTEGER
    const sb = Number.isFinite(Number(b?.sort_order)) ? Number(b?.sort_order) : Number.MAX_SAFE_INTEGER
    if (sa !== sb) return sa - sb
    const ia = Number.isFinite(Number(a?.id)) ? Number(a?.id) : Number.MAX_SAFE_INTEGER
    const ib = Number.isFinite(Number(b?.id)) ? Number(b?.id) : Number.MAX_SAFE_INTEGER
    return ia - ib
  }

  const normalizeDistrictTree = (input: any): DistrictNode[] => {
    if (!Array.isArray(input)) return []
    return input
      .map((node: any) => {
        const areas = Array.isArray(node?.areas)
          ? node.areas
              .filter((area: any) => Boolean(area?.is_active))
              .map((area: any) => ({
                id: Number(area?.id) || 0,
                district_id: Number(area?.district_id) || 0,
                name: String(area?.name || ''),
                sort_order: Number(area?.sort_order) || 0,
                is_active: Boolean(area?.is_active),
              }))
              .sort(bySortOrderThenId)
          : []
        return {
          id: Number(node?.id) || 0,
          name: String(node?.name || ''),
          sort_order: Number(node?.sort_order) || 0,
          areas,
        } as DistrictNode
      })
      .filter((node: DistrictNode) => node.id > 0 && Boolean(node.name))
      .sort(bySortOrderThenId)
  }

  const fetchDistrictTree = async () => {
    if (districtLoadingRef.current) return
    districtLoadingRef.current = true
    setDistrictLoading(true)
    setDistrictError('')
    try {
      const res = await request({
        url: '/api/v1/districts/tree',
        method: 'GET',
      })
      const body: any = res?.data
      const source = Array.isArray(body?.data) ? body.data : []
      const normalized = normalizeDistrictTree(source)
      setDistrictTree(normalized)
      setDistrictLoaded(true)

      if (normalized.length === 0) {
        setSelectedDistrictId(null)
        return
      }

      setSelectedDistrictId((prev) => {
        const hasPrev = prev !== null && normalized.some((node) => node.id === prev)
        return hasPrev ? prev : normalized[0].id
      })
    } catch (error) {
      setDistrictLoaded(false)
      setDistrictError('加载失败，点击重试')
    } finally {
      districtLoadingRef.current = false
      setDistrictLoading(false)
    }
  }

  const fetchMerchantTags = async () => {
    if (merchantTagsLoadingRef.current) return
    merchantTagsLoadingRef.current = true
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
        .sort((a, b) => a.id - b.id)

      setMerchantTags(normalized)
      setMerchantTagsLoaded(true)
      setDraftTagIds((prev) => prev.filter((id) => normalized.some((tag) => tag.id === id)))
      setSelectedTagIds((prev) => prev.filter((id) => normalized.some((tag) => tag.id === id)))
    } catch (error) {
      setMerchantTagsLoaded(false)
      setMerchantTagsError('加载失败，点击重试')
    } finally {
      merchantTagsLoadingRef.current = false
      setMerchantTagsLoading(false)
    }
  }

  const handleRegionChange = (e: any) => {
    const detail = e?.detail || {}
    if (detail.type !== 'end') return
    if (typeof detail.scale === 'number' && Number.isFinite(detail.scale)) {
      mapScaleRef.current = detail.scale
    }
  }

  Taro.useDidShow(() => {
    setTabBarIndex(0)
    Taro.eventCenter.trigger('TAB_SWITCH_LOADING', false)
    const authed = syncAuthState()
    if (!authed) {
      resetIndexState()
      return
    }
    clearMarkerCaches()
    Taro.nextTick(() => {
      void syncPartyData()
      void refreshUserLocationMarker()
    })
    if (!districtLoadedRef.current && !districtLoadingRef.current) {
      void fetchDistrictTree()
    }
    if (!merchantTagsLoadedRef.current && !merchantTagsLoadingRef.current) {
      void fetchMerchantTags()
    }
  })

  useEffect(() => {
    if (!hasToken) return
    Taro.nextTick(() => {
      mapCtx.current = Taro.createMapContext('myMap')
    })
  }, [hasToken])

  useEffect(() => {
    partyListRef.current = partyList
  }, [partyList])

  useEffect(() => {
    initialCenterRef.current = initialCenter
  }, [initialCenter])

  useEffect(() => {
    currentRef.current = current
  }, [current])

  useEffect(() => {
    hasTokenRef.current = hasToken
  }, [hasToken])

  useEffect(() => {
    districtLoadedRef.current = districtLoaded
  }, [districtLoaded])

  useEffect(() => {
    districtLoadingRef.current = districtLoading
  }, [districtLoading])

  useEffect(() => {
    selectedTagIdsRef.current = selectedTagIds
  }, [selectedTagIds])

  useEffect(() => {
    selectedDistrictIdRef.current = selectedDistrictId
  }, [selectedDistrictId])

  useEffect(() => {
    selectedAreaIdRef.current = selectedAreaId
  }, [selectedAreaId])

  useEffect(() => {
    merchantTagsLoadedRef.current = merchantTagsLoaded
  }, [merchantTagsLoaded])

  useEffect(() => {
    merchantTagsLoadingRef.current = merchantTagsLoading
  }, [merchantTagsLoading])

  useEffect(() => {
    if (!districtTree.length) {
      if (selectedDistrictId !== null) setSelectedDistrictId(null)
      return
    }
    if (selectedDistrictId !== null && !districtTree.some((item) => item.id === selectedDistrictId)) {
      setSelectedDistrictId(districtTree[0].id)
    }
  }, [districtTree, selectedDistrictId])

  useEffect(() => {
    if (selectedAreaId === null) return
    const district = districtTree.find((item) => item.id === selectedDistrictId)
    const areas = district?.areas || []
    if (!areas.some((item) => item.id === selectedAreaId)) {
      setSelectedAreaId(null)
      setSelectedAreaName('')
    }
  }, [districtTree, selectedDistrictId, selectedAreaId])

  useEffect(() => {
    return () => {
      stopCameraAnimation()
    }
  }, [])

  useEffect(() => {
    const onLoginSuccess = () => {
      const authed = syncAuthState()
      if (!authed) return
      clearMarkerCaches()
      Taro.nextTick(() => {
        void syncPartyData()
        void refreshUserLocationMarker()
      })
      if (!districtLoadedRef.current && !districtLoadingRef.current) {
        void fetchDistrictTree()
      }
      if (!merchantTagsLoadedRef.current && !merchantTagsLoadingRef.current) {
        void fetchMerchantTags()
      }
    }
    const onForceLogout = () => {
      syncAuthState()
      resetIndexState()
    }
    Taro.eventCenter.on('AUTH_LOGIN_SUCCESS', onLoginSuccess)
    Taro.eventCenter.on('FORCE_LOGOUT', onForceLogout)
    return () => {
      Taro.eventCenter.off('AUTH_LOGIN_SUCCESS', onLoginSuccess)
      Taro.eventCenter.off('FORCE_LOGOUT', onForceLogout)
    }
  }, [])

  useEffect(() => {
    const onUserUpdate = () => {
      if (!hasTokenRef.current) return
      void refreshUserLocationMarker()
    }
    Taro.eventCenter.on('USER_INFO_UPDATED', onUserUpdate)
    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', onUserUpdate)
    }
  }, [])

  useEffect(() => {
    if (!hasToken) return
    void refreshUserLocationMarker()
  }, [hasToken])

  const syncPartyData = async (options?: {
    tagIds?: number[]
    districtId?: number | null
  }) => {
    if (!hasTokenRef.current) return

    if (listLoadingRef.current) {
      listPendingRef.current = true
      return
    }

    listLoadingRef.current = true
    try {
      const activeTagIds = Array.isArray(options?.tagIds) ? options?.tagIds : selectedTagIdsRef.current
      const hasAreaSelected = selectedAreaIdRef.current !== null
      const activeDistrictId = options && 'districtId' in options
        ? options.districtId
        : (hasAreaSelected ? selectedDistrictIdRef.current : null)
      const queryParts: string[] = []
      if (activeTagIds.length > 0) {
        queryParts.push(`tags=${activeTagIds.map((id) => encodeURIComponent(String(id))).join(',')}`)
      }
      if (activeDistrictId !== null && activeDistrictId !== undefined) {
        queryParts.push(`district_id=${encodeURIComponent(String(activeDistrictId))}`)
      }
      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
      const res = await request({
        url: `/api/v1/merchant/list${query}`,
        method: 'GET',
      })
      if (!hasTokenRef.current) return
      const body: any = res?.data
      const rawList = Array.isArray(body?.data?.list)
        ? body.data.list
        : (Array.isArray(body?.list) ? body.list : null)
      if (!rawList) {
        console.warn('[index] merchant list response invalid', body)
        return
      }

      const mappedList: PartyItem[] = rawList.map((item: MerchantItem) => {
        const createdAt = item.created_at ? new Date(item.created_at) : null
        const formattedTime = createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt.toISOString().slice(0, 10)
          : item.created_at || ''
        return {
          id: item.id,
          userId: String((item as any)?.user_id ?? ''),
          title: item.title,
          type: item.type,
          location: item.location,
          lat: item.lat,
          lng: item.lng,
          user: item.username,
          userAvatar: item.user_avatar,
          image: item.cover_image,
          icon: item.icon,
          time: formattedTime,
          price: typeof item.avg_price === 'number' ? (item.avg_price / 100).toFixed(0) : '0',
          attendees: item.current_count,
          dynamicCount: item.post_count,
          fans: String(item.current_count ?? ''),
          isVerified: false,
          isFollowed: Boolean((item as any)?.is_follow ?? (item as any)?.isFollowed),
          rank: '',
          isSubscribed: Boolean((item as any)?.is_subscribe ?? (item as any)?.is_subscribed),
        }
      })

      const nextIndex = mappedList.length > 0 ? Math.min(currentRef.current, mappedList.length - 1) : 0
      console.log('[index] party list loaded', { count: mappedList.length, nextIndex })

      // Cards can render as soon as list is ready.
      setPartyList(mappedList)
      partyListRef.current = mappedList
      setCurrent(nextIndex)
      currentRef.current = nextIndex

      if (mappedList[nextIndex]) {
        const focusCenter = getFocusCenter(
          mappedList[nextIndex].lng,
          mappedList[nextIndex].lat,
          Number.isFinite(mapScaleRef.current) ? mapScaleRef.current : DEFAULT_MAP_SCALE,
        )
        setInitialCenter({ lng: focusCenter.longitude, lat: focusCenter.latitude })
      }

      await updateMarkers(mappedList, nextIndex)
    } catch (error) {
      console.error('Party list load failed:', error)
    } finally {
      listLoadingRef.current = false
      if (listPendingRef.current && hasTokenRef.current) {
        listPendingRef.current = false
        void syncPartyData()
      } else {
        listPendingRef.current = false
      }
    }
  }

  const resolveMarkerFallback = (item: PartyItem) => {
    if (item.type === '场地') return venueMarkerFallbackIcon
    if (item.type === '派对') return partyMarkerFallbackIcon
    return mapPinFallbackIcon
  }

  const resolveMarkerIconPath = (item: PartyItem) => {
    const iconUrl = (item.icon || '').trim()
    if (!iconUrl) return resolveMarkerFallback(item)
    return iconUrl
  }

  const resolveDisplayMarkerIconPath = (item: PartyItem) => {
    const raw = resolveMarkerIconPath(item)
    if (/^data:image\/svg\+xml[,;]/i.test(raw) || /\.svg([?#].*)?$/i.test(raw)) {
      return resolveMarkerFallback(item)
    }
    return raw
  }

  const formatMarkerTitle = (title: string) => {
    const safe = (title || '').trim()
    if (!safe) return ''
    if (safe.length <= 18) return safe
    return `${safe.slice(0, 18)}...`
  }

  const updateMarkers = async (list: PartyItem[], activeIndex: number) => {
    const buildToken = ++markerBuildTokenRef.current
    const renderVersion = ++markerRenderVersionRef.current
    if (list.length === 0) {
      markerIndexMapRef.current = new Map()
      if (buildToken !== markerBuildTokenRef.current) return
      setMarkers([])
      return
    }

    const markerIndexMap = new Map<number, number>()
    const markerGroups = await Promise.all(list.map(async (item, index) => {
      const markerBaseId = index + 1
      const isActive = index === activeIndex
      const fallbackPath = resolveMarkerFallback(item)
      const rawIconPath = resolveDisplayMarkerIconPath(item) || fallbackPath
      const markerTitle = formatMarkerTitle(item.title)
      const latitude = Number(item.lat)
      const longitude = Number(item.lng)
      const safeLatitude = Number.isFinite(latitude) ? latitude : initialCenter.lat
      const safeLongitude = Number.isFinite(longitude) ? longitude : initialCenter.lng
      const ratioHint = item.type === '派对' ? 44 / 54 : 1

      if (isActive) {
        const bgMarkerId = renderVersion * 10000 + markerBaseId * 10 + 1
        const fgMarkerId = renderVersion * 10000 + markerBaseId * 10 + 2
        const titleMarkerId = renderVersion * 10000 + markerBaseId * 10 + 3
        const bgWidth = Math.max(26, Math.round(MARKER_ACTIVE_HEIGHT * ACTIVE_BACKGROUND_RATIO))
        const fgHeight = ACTIVE_FOREGROUND_ICON_HEIGHT
        const fgWidth = Math.max(20, Math.round(fgHeight * ratioHint))

        markerIndexMap.set(bgMarkerId, index)
        markerIndexMap.set(fgMarkerId, index)

        const bgMarker: any = {
          id: bgMarkerId,
          latitude: safeLatitude,
          longitude: safeLongitude,
          iconPath: mapMakerBackground,
          width: bgWidth,
          height: MARKER_ACTIVE_HEIGHT,
          zIndex: 9998,
          anchor: { x: 0.5, y: 1 },
        }

        const fgMarker: any = {
          id: fgMarkerId,
          latitude: safeLatitude,
          longitude: safeLongitude,
          iconPath: rawIconPath,
          width: fgWidth,
          height: fgHeight,
          zIndex: 9999,
          anchor: { x: 0.5, y: ACTIVE_FOREGROUND_ICON_ANCHOR_Y },
        }

        const markersForItem: any[] = [bgMarker, fgMarker]
        if (markerTitle) {
          const titleAsset = await buildStrokedTitleMarker(markerTitle, {
            fontSize: 11,
            lineHeight: 15,
            fontWeight: 500,
            fontFamily: 'PingFangSC, PingFang SC',
            fontStyle: 'normal',
            strokeWidth: 1,
            strokeColor: '#DBDBDB',
            fillColor: '#000000',
            textAlign: 'left',
            topOffset: MARKER_LABEL_ANCHOR_Y_ACTIVE,
            paddingX: 1,
            paddingY: 1,
          })
          if (titleAsset.iconPath && titleAsset.width > 0 && titleAsset.height > 0) {
            markerIndexMap.set(titleMarkerId, index)
            markersForItem.push({
              id: titleMarkerId,
              latitude: safeLatitude,
              longitude: safeLongitude,
              iconPath: titleAsset.iconPath,
              width: titleAsset.width,
              height: titleAsset.height,
              zIndex: 10000,
              anchor: { x: 0.5, y: 0 },
            })
          } else {
            fgMarker.label = {
              content: ` ${markerTitle} `, // 增加前后空格增加呼吸感
              color: '#000000',
              fontSize: 12,
              anchorX: 0,
              anchorY: MARKER_LABEL_ANCHOR_Y_ACTIVE,
              borderWidth: 1,
              borderColor: '#DBDBDB',
              borderRadius: 6,      // 圆角胶囊
              bgColor: '#FFFFFF',   // 使用白色实体背景替代透明
              padding: 4,
              textAlign: 'center',
            }
          }
        }

        return markersForItem
      }

      const markerId = renderVersion * 10000 + markerBaseId * 10 + 1
      const titleMarkerId = renderVersion * 10000 + markerBaseId * 10 + 2
      const width = Math.max(18, Math.round(MARKER_INACTIVE_HEIGHT * ratioHint))
      markerIndexMap.set(markerId, index)
      const markerItem: any = {
        id: markerId,
        latitude: safeLatitude,
        longitude: safeLongitude,
        iconPath: rawIconPath,
        width,
        height: MARKER_INACTIVE_HEIGHT,
        zIndex: 200,
        anchor: { x: 0.5, y: 0.5 },
      }
      const markersForItem: any[] = [markerItem]
      if (markerTitle) {
        const titleAsset = await buildStrokedTitleMarker(markerTitle, {
          fontSize: 11,
          lineHeight: 15,
          fontWeight: 500,
          fontFamily: 'PingFangSC, PingFang SC',
          fontStyle: 'normal',
          strokeWidth: 1,
          strokeColor: '#DBDBDB',
          fillColor: '#000000',
          textAlign: 'left',
          topOffset: MARKER_LABEL_ANCHOR_Y_INACTIVE,
          paddingX: 1,
          paddingY: 1,
        })
        if (titleAsset.iconPath && titleAsset.width > 0 && titleAsset.height > 0) {
          markerIndexMap.set(titleMarkerId, index)
          markersForItem.push({
            id: titleMarkerId,
            latitude: safeLatitude,
            longitude: safeLongitude,
            iconPath: titleAsset.iconPath,
            width: titleAsset.width,
            height: titleAsset.height,
            zIndex: 201,
            anchor: { x: 0.5, y: 0 },
          })
        } else {
          markerItem.label = {
            content: ` ${markerTitle} `,
            color: '#000000',
            fontSize: 12,
            anchorX: 0,
            anchorY: MARKER_LABEL_ANCHOR_Y_INACTIVE,
            borderWidth: 1,
            borderColor: '#DBDBDB',
            borderRadius: 6,
            bgColor: '#FFFFFF',
            padding: 4,
            textAlign: 'center',
          }
        }
      }
      return markersForItem
    }))
    const markerAssets = (markerGroups.flat().filter(Boolean) as any[])
      .sort((a, b) => {
        const za = Number(a?.zIndex) || 0
        const zb = Number(b?.zIndex) || 0
        return za - zb
      })

    if (buildToken !== markerBuildTokenRef.current) return
    markerIndexMapRef.current = markerIndexMap
    console.log('[index] markers rebuilt', {
      inputCount: list.length,
      outputCount: markerAssets.length,
      activeIndex,
    })
    setMarkers(markerAssets)
  }

  const getCachedUserAvatar = () => {
    const cachedUser = Taro.getStorageSync('userInfo')
    if (!cachedUser || typeof cachedUser !== 'object') return ''
    return cachedUser.avatar_url || cachedUser.avatar || cachedUser.headimgurl || cachedUser.head_img || ''
  }

  const refreshUserLocationMarker = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!hasTokenRef.current) {
      setUserLocationMarker(null)
      return null
    }

    let avatarUrl = getCachedUserAvatar()
    if (!avatarUrl) {
      const accessToken = Taro.getStorageSync('access_token')
      if (accessToken) {
        try {
          const res = await request({ url: '/api/v1/user/info', method: 'GET' })
          const latestUser = res?.data?.data?.user
          if (latestUser) {
            const normalizedUser = {
              ...latestUser,
              avatar_url: latestUser.avatar_url || latestUser.avatar || latestUser.headimgurl || latestUser.head_img || '',
            }
            Taro.setStorageSync('userInfo', normalizedUser)
            avatarUrl = normalizedUser.avatar_url
          }
        } catch (error) {
          console.warn('load latest user info for marker failed:', error)
        }
      }
    }

    try {
      const location = await Taro.getLocation({ type: 'gcj02' })
      const avatarIconPath = await buildCircularAvatarMarker(avatarUrl, mapPinFallbackIcon)
      let safeAvatarIconPath = avatarIconPath || mapPinFallbackIcon
      try {
        await Taro.getImageInfo({ src: safeAvatarIconPath })
      } catch (error) {
        console.warn('[index] user marker icon invalid, use fallback', safeAvatarIconPath)
        safeAvatarIconPath = mapPinFallbackIcon
      }
      setUserLocationMarker({
        id: USER_LOCATION_MARKER_ID,
        latitude: location.latitude,
        longitude: location.longitude,
        width: USER_LOCATION_MARKER_DISPLAY_SIZE,
        height: USER_LOCATION_MARKER_DISPLAY_SIZE,
        iconPath: safeAvatarIconPath,
        zIndex: 4000,
        anchor: { x: 0.5, y: 0.5 },
      })
      return {
        latitude: location.latitude,
        longitude: location.longitude,
      }
    } catch (error) {
      console.warn('refresh user location marker failed:', error)
      return null
    }
  }

  const handleSwiperChange = (e: any) => {
    if (e.detail.source === 'touch' || e.detail.source === '') {
      const nextIndex = e.detail.current
      setCurrent(nextIndex)
      currentRef.current = nextIndex
      void updateMarkers(partyListRef.current, nextIndex)
    }
  }

  const handleSwiperAnimationFinish = (e: any) => {
    const index = e.detail.current
    const target = partyList[index]
    if (!target) return
    moveMapTo(target.lng, target.lat)
    void updateMarkers(partyList, index)
  }

  const handleLocate = async () => {
    if (!hasTokenRef.current) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none',
      })
      return
    }

    const location = await refreshUserLocationMarker()
    if (!location) {
      Taro.showToast({
        title: '定位失败，请开启定位权限',
        icon: 'none',
      })
      return
    }
    moveMapTo(location.longitude, location.latitude)
  }

  const handleMarkerTap = (e: any) => {
    const markerId = Number(e?.detail?.markerId)
    if (markerId === USER_LOCATION_MARKER_ID) return
    const targetIndex = markerIndexMapRef.current.get(markerId)
    if (typeof targetIndex !== 'number') return

    setCurrent(targetIndex)
    currentRef.current = targetIndex
    const target = partyList[targetIndex]
    if (!target) return
    moveMapTo(target.lng, target.lat)
    void updateMarkers(partyList, targetIndex)
  }

  const toggleSubscribe = (id: string | number) => {
    const target = partyListRef.current.find((item) => item.id === id)
    if (!target || target.type !== '派对') return
    if (subscribePendingRef.current.has(id)) return

    const nextSubscribed = !Boolean(target.isSubscribed)
    subscribePendingRef.current.add(id)
    setPartyList((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, isSubscribed: nextSubscribed } : item))
      partyListRef.current = next
      return next
    })

    const endpoint = nextSubscribed ? '/api/v1/merchant/subscribe' : '/api/v1/merchant/unsubscribe'
    request({
      url: endpoint,
      method: 'POST',
      data: { party_id: String(id) },
    })
      .then((res: any) => {
        const code = Number(res?.data?.code)
        if (code !== 200) {
          setPartyList((prev) => {
            const next = prev.map((item) => (item.id === id ? { ...item, isSubscribed: !nextSubscribed } : item))
            partyListRef.current = next
            return next
          })
          Taro.showToast({ title: nextSubscribed ? '订阅失败' : '取消订阅失败', icon: 'none' })
          return
        }
        Taro.showToast({ title: nextSubscribed ? '订阅成功' : '已取消订阅', icon: 'none' })
      })
      .catch(() => {
        setPartyList((prev) => {
          const next = prev.map((item) => (item.id === id ? { ...item, isSubscribed: !nextSubscribed } : item))
          partyListRef.current = next
          return next
        })
        Taro.showToast({ title: nextSubscribed ? '订阅失败' : '取消订阅失败', icon: 'none' })
      })
      .finally(() => {
        subscribePendingRef.current.delete(id)
      })
  }

  const toggleFollow = (id: string | number) => {
    const target = partyListRef.current.find((item) => item.id === id)
    if (!target) return
    if (!target.userId) {
      Taro.showToast({ title: '用户信息缺失', icon: 'none' })
      return
    }
    if (followPendingRef.current.has(id)) return

    const nextFollowed = !Boolean(target.isFollowed)
    const action = nextFollowed ? 'follow' : 'unfollow'
    followPendingRef.current.add(id)
    setPartyList((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, isFollowed: nextFollowed } : item))
      partyListRef.current = next
      return next
    })

    request({
      url: `/api/v1/follow/${action}`,
      method: 'POST',
      data: { user_id: String(target.userId) },
    })
      .then((res: any) => {
        const code = Number(res?.data?.code)
        if (code !== 200) {
          throw new Error(res?.data?.msg || '操作失败')
        }
        Taro.showToast({ title: nextFollowed ? '已关注' : '已取消关注', icon: 'success' })
      })
      .catch(() => {
        setPartyList((prev) => {
          const next = prev.map((item) => (item.id === id ? { ...item, isFollowed: !nextFollowed } : item))
          partyListRef.current = next
          return next
        })
        Taro.showToast({ title: '操作失败', icon: 'none' })
      })
      .finally(() => {
        followPendingRef.current.delete(id)
      })
  }

  const navigateTo = (path: string) => Taro.navigateTo({ url: path })
  const getDetailPath = (item: PartyItem) => {
    const itemType = String(item?.type || '').trim()
    if (itemType === '场地') {
      return `/pages/venue/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}`
    }
    return `/pages/activity/index?id=${item.id}&tag=${encodeURIComponent(item.type || '')}`
  }

  const topHeaderStyle = { top: `${statusBarHeight}px`, height: `${navBarHeight}px` }
  const topHeaderFadeStyle = { height: `${statusBarHeight + navBarHeight}px` }
  const filterContainerStyle = { top: `${statusBarHeight + navBarHeight + 10}px` }
  const currentDistrict = districtTree.find((item) => item.id === selectedDistrictId) || districtTree[0]
  const currentDistrictAreas = currentDistrict?.areas || []

  const toggleFilter = (type: 'all' | 'area' | 'more') => {
    const next = filterOpen === type ? 'none' : type
    setFilterOpen(next)
    if (next === 'area' && !districtLoadedRef.current && !districtLoadingRef.current) {
      void fetchDistrictTree()
    }
    if (next === 'more') {
      setDraftTagIds(selectedTagIdsRef.current)
      if (!merchantTagsLoadedRef.current && !merchantTagsLoadingRef.current) {
        void fetchMerchantTags()
      }
    }
  }

  const isHighlight = (type: string) => {
    if (type === 'all') return selectedCategory !== '全部分类'
    if (type === 'area') return selectedAreaId !== null
    if (type === 'more') return selectedTagIds.length > 0
    return false
  }

  const renderDropdownContent = () => {
    if (filterOpen === 'none') return null

    return (
      <View className='dropdown-content'>
        {filterOpen === 'all' && (
          <ScrollView scrollY className='list-scroll'>
            {CATEGORIES.map(cat => (
              <View
                key={cat}
                className={`list-item ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat); setFilterOpen('none') }}
              >
                <Text>{cat}</Text>
                {selectedCategory === cat && <AtIcon value='check' size='16' color='#FF2E4D' />}
              </View>
            ))}
          </ScrollView>
        )}

        {filterOpen === 'area' && (
          <View className='split-view'>
            <ScrollView scrollY className='col col-1'>
              {AREA_LEVEL1.map(item => (
                <View
                  key={item.key}
                  className={`item ${areaL1 === item.key ? 'active' : ''}`}
                  onClick={() => setAreaL1(item.key)}
                >
                  {item.name}
                </View>
              ))}
            </ScrollView>
            {areaL1 === 'dist' ? (
              <>
                <View className='col col-2'>
                  <View className='item active'>暂未开放</View>
                </View>
                <View className='col col-3'>
                  <View className='item'>请选择“行政区/商圈”</View>
                </View>
              </>
            ) : (
              <>
                <ScrollView scrollY className='col col-2'>
                  {districtLoading && (
                    <View className='item'>加载中...</View>
                  )}
                  {!districtLoading && districtError && (
                    <View className='item active' onClick={() => { void fetchDistrictTree() }}>
                      {districtError}
                    </View>
                  )}
                  {!districtLoading && !districtError && districtTree.length === 0 && (
                    <View className='item'>暂无可选区域</View>
                  )}
                  {!districtLoading && !districtError && (
                    <View
                      className={`item ${selectedDistrictId === null && selectedAreaId === null ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDistrictId(null)
                        setSelectedAreaId(null)
                        setSelectedAreaName('')
                        selectedDistrictIdRef.current = null
                        selectedAreaIdRef.current = null
                        setFilterOpen('none')
                        void syncPartyData({ districtId: null })
                      }}
                    >
                      不限
                    </View>
                  )}
                  {!districtLoading && !districtError && districtTree.map((item) => (
                    <View
                      key={item.id}
                      className={`item ${currentDistrict?.id === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDistrictId(item.id)
                        setSelectedAreaId(null)
                        setSelectedAreaName('')
                        selectedDistrictIdRef.current = item.id
                        selectedAreaIdRef.current = null
                      }}
                    >
                      {item.name}
                    </View>
                  ))}
                </ScrollView>
                <ScrollView scrollY className='col col-3'>
                  {!districtLoading && !districtError && currentDistrictAreas.length === 0 && (
                    <View className='item'>暂无可选商圈</View>
                  )}
                  {!districtLoading && !districtError && currentDistrictAreas.map((item) => (
                    <View
                      key={item.id}
                      className={`item ${selectedAreaId === item.id ? 'active' : ''}`}
                      onClick={() => {
                        const nextAreaId = selectedAreaId === item.id ? null : item.id
                        setSelectedAreaId(nextAreaId)
                        setSelectedAreaName(nextAreaId === null ? '' : item.name)
                        selectedAreaIdRef.current = nextAreaId
                        setFilterOpen('none')
                        void syncPartyData({
                          districtId: nextAreaId === null ? null : (currentDistrict?.id ?? item.district_id),
                        })
                      }}
                    >
                      {item.name}
                      {selectedAreaId === item.id && <AtIcon value='check' size='14' color='#FF2E4D' />}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}

        {filterOpen === 'more' && (
          <View className='more-view'>
            <Text className='label'>优惠标签</Text>
            <View className='tags'>
              {merchantTagsLoading && <View className='tag'>加载中...</View>}
              {!merchantTagsLoading && merchantTagsError && (
                <View
                  className='tag'
                  onClick={() => {
                    void fetchMerchantTags()
                  }}
                >
                  {merchantTagsError}
                </View>
              )}
              {!merchantTagsLoading && !merchantTagsError && merchantTags.map((tag) => {
                const selected = draftTagIds.includes(tag.id)
                return (
                  <View
                    key={tag.id}
                    className='tag'
                    style={selected ? { background: 'rgba(255,46,77,0.28)', color: '#fff' } : undefined}
                    onClick={() => {
                      setDraftTagIds((prev) => (
                        prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                      ))
                    }}
                  >
                    {tag.name}
                  </View>
                )
              })}
              {!merchantTagsLoading && !merchantTagsError && merchantTags.length === 0 && (
                <View className='tag'>暂无可选标签</View>
              )}
            </View>
            <View className='btn-row'>
              <View
                className='btn reset'
                onClick={() => {
                  setSelectedDistrictId(null)
                  setSelectedAreaId(null)
                  setSelectedAreaName('')
                  selectedDistrictIdRef.current = null
                  selectedAreaIdRef.current = null
                  setSelectedTagIds([])
                  selectedTagIdsRef.current = []
                  setDraftTagIds([])
                  void syncPartyData({ tagIds: [], districtId: null })
                }}
              >
                重置
              </View>
              <View
                className='btn confirm'
                onClick={() => {
                  const applied = [...draftTagIds].sort((a, b) => a - b)
                  setSelectedTagIds(applied)
                  selectedTagIdsRef.current = applied
                  setFilterOpen('none')
                  void syncPartyData({ tagIds: applied })
                }}
              >
                确定
              </View>
            </View>
          </View>
        )}
      </View>
    )
  }

  if (!hasToken) return null

  return (
    <View className='index-page-map'>
      <TaroMap
        id='myMap'
        className='map-bg'
        longitude={initialCenter.lng}
        latitude={initialCenter.lat}
        scale={DEFAULT_MAP_SCALE}
        markers={userLocationMarker ? [...markers, userLocationMarker] : markers}
        subkey={MAP_KEY}
        setting={{ enableSatellite: false, enableTraffic: false }}
        onMarkerTap={handleMarkerTap}
        onRegionChange={handleRegionChange}
        onError={(e) => {
          console.error('Map error:', e)
        }}
      />
      <Canvas canvasId={ICON_ONLY_MARKER_CANVAS_ID} className='icon-marker-canvas' />
      <Canvas canvasId={AVATAR_MARKER_CANVAS_ID} className='avatar-marker-canvas' />
      <Canvas canvasId={TITLE_MARKER_CANVAS_ID} className='title-marker-canvas' />

      <View className='top-header-fade' style={topHeaderFadeStyle} />

      {filterOpen !== 'none' && (
        <View className='mask-layer' onClick={() => setFilterOpen('none')} />
      )}

      <CommonHeader style={topHeaderStyle} onSearchClick={() => navigateTo('/pages/search/index')} />

      <View
        className={`filter-container-wrapper ${filterOpen !== 'none' ? 'is-open' : ''}`}
        style={filterContainerStyle}
      >
        <View className='filter-bar-header'>
          <View
            className={`capsule-item ${isHighlight('all') || filterOpen === 'all' ? 'highlight-bg' : ''}`}
            onClick={() => toggleFilter('all')}
          >
            <Text className={isHighlight('all') || filterOpen === 'all' ? 'highlight-text' : ''}>
              {selectedCategory === '全部分类' ? '全部' : selectedCategory}
            </Text>
            <View
              className={`triangle-icon ${isHighlight('all') || filterOpen === 'all' ? 'active' : ''} ${filterOpen === 'all' ? 'up' : 'down'}`}
            />
          </View>

          <View
            className={`capsule-item ${filterOpen === 'area' ? 'highlight-bg' : ''}`}
            onClick={() => toggleFilter('area')}
          >
            <Text className={isHighlight('area') || filterOpen === 'area' ? 'highlight-text' : ''}>
              {selectedAreaName || '区域'}
            </Text>
            <View
              className={`triangle-icon ${isHighlight('area') || filterOpen === 'area' ? 'active' : ''} ${filterOpen === 'area' ? 'up' : 'down'}`}
            />
          </View>

          <View
            className={`capsule-item ${filterOpen === 'more' ? 'highlight-bg' : ''}`}
            onClick={() => toggleFilter('more')}
          >
            <Text className={isHighlight('more') || filterOpen === 'more' ? 'highlight-text' : ''}>更多筛选</Text>
            <View
              className={`triangle-icon ${isHighlight('more') || filterOpen === 'more' ? 'active' : ''} ${filterOpen === 'more' ? 'up' : 'down'}`}
            />
          </View>
        </View>

        {renderDropdownContent()}
      </View>

      <View className={`floating-group${isEmpty ? ' empty' : ''}`}>
        <View className='circle-btn locate-btn' onClick={handleLocate}>
          <Image className='map-pin' src={mapPinIcon} mode='aspectFit' />
        </View>
        <View className='capsule-btn list-btn' onClick={() => navigateTo('/pages/activity-list/index')}>
          <AtIcon value='list' size='16' color='#fff' className='list-icon' />
          <Text className='txt'>查看列表</Text>
        </View>
      </View>

      {partyList.length === 0 && (
        <View className='empty-result'>
          <View className='empty-icon'>!</View>
          <Text className='empty-text'>没有找到相关结果</Text>
        </View>
      )}

      {partyList.length > 0 && (
        <View className='bottom-card-container'>
          <Swiper
            className='card-swiper'
            current={current}
            onChange={handleSwiperChange}
            onAnimationFinish={handleSwiperAnimationFinish}
            previousMargin='20px'
            nextMargin='20px'
            circular={false}
          >
            {partyList.map((item) => (
              <SwiperItem key={item.id} className='card-item-wrapper'>
                <View
                  className='party-card-pro'
                  onClick={() => navigateTo(getDetailPath(item))}
                >
                  <View className='fake-glass-layer' />
                  <View
                    className='card-header-bg'
                    style={item.image ? {
                      backgroundImage: `url(${item.image})`,
                    } : undefined}
                  >
                    {item.rank && (
                      <View className='rank-badge'>
                        <AtIcon value='fire' size='12' color='#fff' />
                        <Text className='txt'>{item.rank}</Text>
                      </View>
                    )}
                    <View className='attendees-capsule'>
                      <Image
                        className='run-icon'
                        src={require('../../assets/icons/run.svg')}
                        mode='aspectFit'
                      />
                      <Text className='num-italic'>{item.attendees || 0}</Text>
                    </View>
                  </View>

                  <View className='card-body'>
                    <View className='title-row'>
                      <Text className='title'>{item.title}</Text>
                      <Text className='type-tag'>{item.type}</Text>
                    </View>
                    <View className='info-row'>
                      <AtIcon value='clock' size='14' color='#999' />
                      <Text className='info-txt info-first'>{item.time}</Text>
                      <Text className='info-txt'>{item.dynamicCount}条动态</Text>
                      <Text className='info-txt price'>¥{item.price}/人</Text>
                    </View>
                    <View className='card-footer'>
                      <View className='user-info'>
                        <View className='avatar'>
                          {item.userAvatar && (
                            <Image
                              src={item.userAvatar}
                              className='avatar-img'
                              mode='aspectFill'
                            />
                          )}
                        </View>
                        <View className='meta'>
                          <View className='name-row'>
                            <Text className='name'>{item.user}</Text>
                            <Image className='certification-icon' src={certificationIcon} mode='aspectFit' />
                          </View>
                          <Text className='fans'>{item.fans} 粉丝</Text>
                        </View>
                      </View>
                      <View className='action-btns'>
                        <View
                          className={`card-action-btn follow-btn ${(item.isFollowed || followPendingRef.current.has(item.id)) ? 'disabled' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFollow(item.id)
                          }}
                        >
                          {item.isFollowed ? '已关注' : '关注'}
                        </View>
                        {item.type === '派对' && (
                          <View
                            className='card-action-btn subscribe-btn'
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSubscribe(item.id)
                            }}
                          >
                            {item.isSubscribed ? '取消订阅' : '订阅活动'}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
      )}
    </View>
  )
}
