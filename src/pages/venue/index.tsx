import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

interface PartyItem {
  id: string
  title: string
  type: string
  location: string
  distance: string
  price: string
  lat: number
  lng: number
  tags: string[]
  tag: string
  user: string
  userAvatar: string
  fans: string
  isVerified: boolean
  time: string
  dynamicCount: number
  attendees: number
  isFull: boolean
  rank: string
  image: string
  isLiked: boolean
  isAttending: boolean
}

const fallbackAvatar = 'https://cdn.hypercn.cn/note/2026/02/03/2018531527209521152.png'

const gallerySeed = [
  'https://cdn.hypercn.cn/note/2026/02/03/2018529147365625856.jpg',
  'https://cdn.hypercn.cn/note/2026/02/03/2018529148875575296.jpg',
  'https://cdn.hypercn.cn/note/2026/02/03/2018529173219315712.png'
]

const productMock = [
  {
    id: 'p1',
    title: '金汤力酒',
    price: '58',
    original: '',
    sale: '清爽特调',
    cover: 'https://cdn.hypercn.cn/note/2026/02/03/2018529163652108288.png'
  },
  {
    id: 'p2',
    title: '火龙肉桂威士忌',
    price: '298',
    original: '',
    sale: '热卖推荐',
    cover: 'https://cdn.hypercn.cn/note/2026/02/03/2018529173974290432.png'
  },
  {
    id: 'p3',
    title: '[暖冬特惠]百威套装',
    price: '118',
    original: '',
    sale: '百威啤酒（12瓶）288¥ · 薯条（1份）18¥',
    cover: 'https://cdn.hypercn.cn/note/2026/02/03/2018529166915276800.png'
  }
]

export default function VenuePage() {
  const router = useRouter()
  const venueId = router.params?.id || ''
  const [venue, setVenue] = useState<PartyItem | null>(null)
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [currentHero, setCurrentHero] = useState<string>(gallerySeed[0])

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
    const rightPadding = sysInfo.screenWidth - menuInfo.left
    setMenuButtonWidth(rightPadding)
  }, [])

  useEffect(() => {
    const fetchVenue = async () => {
      if (!venueId) return
      try {
        const res = await request({
          url: '/api/v1/party/list',
          method: 'GET'
        })
        const list = res?.data?.data?.list || []
        const target = Array.isArray(list)
          ? list.find((item: PartyItem) => String(item.id) === String(venueId))
          : null
        setVenue(target || null)
      } catch (error) {
        console.error('Venue detail load failed:', error)
      }
    }

    fetchVenue()
  }, [venueId])

  const galleryImages = useMemo(() => {
    if (venue?.image) {
      return [...gallerySeed, venue.image]
    }
    return gallerySeed
  }, [venue?.image])

  useEffect(() => {
    if (galleryImages.length > 0) {
      setCurrentHero(galleryImages[0])
    }
  }, [galleryImages])

  const venueName = venue?.title || 'SWING鸡尾酒吧（大源店）'
  const venueTime = venue?.time && venue.time.includes(':')
    ? `营业中 ${venue.time}`
    : '营业中 19:30-次日02:30'
  const venuePrice = venue?.price ? `¥${venue.price}/人起` : '¥80/人起'
  const venueLocation = venue?.location || '高新区盛园街道保利星荟5栋1楼'
  const venueUser = venue?.user || 'SWING'
  const venueAvatar = venue?.userAvatar || fallbackAvatar
  const venueFans = venue?.fans || '5245'

  return (
    <View className='venue-page'>
      <View
        className='hero'
        style={{
          backgroundImage: currentHero ? `url(${currentHero})` : 'none',
          backgroundColor: '#000'
        }}
      >
        <View
          className='custom-nav'
          style={{ height: `${statusBarHeight + navBarHeight}px` }}
        >
          <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
          <View
            className='nav-content'
            style={{ height: `${navBarHeight}px` }}
          >
            <View
              className='nav-left'
              style={{ width: `${menuButtonWidth}px` }}
              onClick={() => Taro.navigateBack()}
            >
              <AtIcon value='chevron-left' size='24' color='#fff' />
            </View>
            <View className='nav-center'>
              <Image
                className='nav-logo'
                src={require('../../assets/images/hyper-icon.png')}
                mode='aspectFit'
              />
            </View>
            <View className='nav-right' style={{ width: `${menuButtonWidth}px` }} />
          </View>
        </View>

        <View
          className='hero-info'
          style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}
        >
          <Text className='title'>{venueName}</Text>
          <View className='meta-row'>
            <Text className='meta'>{venueTime}</Text>
            <Text className='meta price'>{venuePrice}</Text>
          </View>
          <View className='location-row'>
            <Text className='location'>{venueLocation}</Text>
            <AtIcon value='chevron-right' size='16' color='#fff' />
          </View>
        </View>

        <View className='gallery'>
          {galleryImages.map((img, idx) => (
            <View
              key={`${img}-${idx}`}
              className={`gallery-item ${currentHero === img ? 'active' : ''}`}
              onClick={() => setCurrentHero(img)}
            >
              <Image className='gallery-img' src={img} mode='aspectFill' />
            </View>
          ))}
        </View>
      </View>

      <ScrollView className='content-scroll' scrollY>
        <View className='content-inner'>
          <View className='host-card'>
            <View className='host-left'>
              <Image className='host-avatar' src={venueAvatar} mode='aspectFill' />
              <View className='host-info'>
                <View className='host-name-row'>
                  <Text className='host-name'>{venueUser}</Text>
                  <AtIcon value='check-circle' size='12' color='#2E6BFF' />
                </View>
                <Text className='host-fans'>{venueFans} 粉丝</Text>
              </View>
            </View>
            <View className='follow-btn'>已关注</View>
          </View>

          <View className='tab-row'>
            <Text className='tab active'>商品</Text>
            <Text className='tab'>动态·233</Text>
          </View>

          <View className='product-grid'>
            {productMock.map(item => (
              <View key={item.id} className='product-card'>
                <Image className='product-img' src={item.cover} mode='aspectFill' />
                <Text className='product-title'>{item.title}</Text>
                <View className='product-meta'>
                  <Text className='price'>¥{item.price}</Text>
                  {item.original ? <Text className='original'>¥{item.original}</Text> : null}
                </View>
                <Text className='sale'>{item.sale}</Text>
                <View className='buy-btn'>购买</View>
              </View>
            ))}
          </View>

          <View className='bottom-space' />
        </View>
      </ScrollView>
    </View>
  )
}
