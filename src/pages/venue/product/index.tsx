import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import { request } from '@/utils/request'
import './index.scss'

interface MerchantGood {
  id: string
  party_id: number
  product_name: string
  price: number
  original_price: number
  stock: number
  description: string
  cover_image: string
  status: number
  sales_volume: number
  created_at: string
  updated_at: string
}

interface MerchantDetail {
  id: number
  name: string
  avg_price: number
  location_name: string
  images: string[]
  goods: MerchantGood[]
  notes: any[]
  next_cursor: string
  has_more: boolean
  user_name: string
  user_avatar: string
  is_follow: boolean
  business_hours: string
}

const fallbackImages = [
  'https://cdn.hypercn.cn/note/2026/02/03/2018529147365625856.jpg',
  'https://cdn.hypercn.cn/note/2026/02/03/2018529148875575296.jpg',
  'https://cdn.hypercn.cn/note/2026/02/03/2018529173219315712.png'
]

const defaultDetailItems = [
  { label: '限制', value: '每人限购2张' },
  { label: '须知', value: '免预约·部分日期全天可用·购买后90天内有效' },
  { label: '保障', value: '随时可退·过期可退' }
]

export default function VenueProductDetail() {
  const router = useRouter()
  const venueId = router.params?.venueId || router.params?.id || ''
  const productId = router.params?.productId || router.params?.goodsId || ''
  const [venue, setVenue] = useState<MerchantDetail | null>(null)
  const [product, setProduct] = useState<MerchantGood | null>(null)
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)
  const [menuButtonWidth, setMenuButtonWidth] = useState(0)
  const [swiperIndex, setSwiperIndex] = useState(0)

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
    const fetchDetail = async () => {
      if (!venueId) return
      try {
        const res = await request({
          url: `/api/v1/merchant/${venueId}`,
          method: 'GET'
        })
        const detail = res?.data?.data || null
        setVenue(detail)
        if (detail?.goods) {
          const target = detail.goods.find((item: MerchantGood) => String(item.id) === String(productId))
          setProduct(target || detail.goods[0] || null)
        }
      } catch (error) {
        console.error('Product detail load failed:', error)
      }
    }

    fetchDetail()
  }, [venueId, productId])

  const galleryImages = useMemo(() => {
    const images = product?.cover_image
      ? [product.cover_image.trim(), ...(venue?.images || [])]
      : (venue?.images || [])
    return images.length > 0 ? images : fallbackImages
  }, [product?.cover_image, venue?.images])

  const price = product?.price ? Math.round(product.price / 100) : 0
  const originalPrice = product?.original_price ? Math.round(product.original_price / 100) : 0
  const savePrice = originalPrice > price ? originalPrice - price : 0
  const sales = product?.sales_volume || 0

  const packageLines = useMemo(() => {
    if (!product?.description) {
      return [{ name: product?.product_name || '商品', price: price ? `¥${price}` : '' }]
    }
    const parts = product.description
      .split(/\s{2,}|\n/)
      .map((item) => item.trim())
      .filter(Boolean)
    const parsed = parts.map((line) => {
      const priceMatch = line.match(/(¥\s*\d+|\d+\s*¥|￥\s*\d+|\d+\s*￥)/)
      const priceText = priceMatch ? priceMatch[0].replace(/\s/g, '') : ''
      const name = priceMatch ? line.replace(priceMatch[0], '').trim() : line
      const normalizedPrice = priceText
        ? (priceText.startsWith('¥') ? priceText.replace('￥', '¥') : `¥${priceText.replace(/[￥¥]/g, '')}`)
        : ''
      return { name, price: normalizedPrice }
    })
    return parsed.length > 0
      ? parsed
      : [{ name: product.product_name, price: price ? `¥${price}` : '' }]
  }, [product?.description, product?.product_name, price])

  return (
    <View className='product-page'>
      <View className='hero'>
        <Swiper
          className='hero-swiper'
          current={swiperIndex}
          onChange={(e) => setSwiperIndex(e.detail.current)}
        >
          {galleryImages.map((img, index) => (
            <SwiperItem key={`${img}-${index}`}>
              <Image className='hero-bg' src={img} mode='aspectFill' />
            </SwiperItem>
          ))}
        </Swiper>
        <View className='hero-mask' />
        <View className='custom-nav' style={{ height: `${statusBarHeight + navBarHeight}px` }}>
          <View className='status-bar' style={{ height: `${statusBarHeight}px` }} />
          <View className='nav-content' style={{ height: `${navBarHeight}px` }}>
            <View className='nav-left' style={{ width: `${menuButtonWidth}px` }} onClick={() => Taro.navigateBack()}>
              <AtIcon value='chevron-left' size='24' color='#fff' />
            </View>
            <View className='nav-center'>
              <Image
                className='nav-logo'
                src={require('../../../assets/images/hyper-icon.png')}
                mode='aspectFit'
              />
            </View>
            <View className='nav-right' style={{ width: `${menuButtonWidth}px` }} />
          </View>
        </View>
        <View className='hero-dots'>
          {galleryImages.map((_, idx) => (
            <View key={`dot-${idx}`} className={`dot ${idx === swiperIndex ? 'active' : ''}`} />
          ))}
        </View>
      </View>

      <View className='content'>
        <View className='price-row'>
          <Text className='price-label'>优惠后</Text>
          <View className='price-main'>
            <Text className='currency'>¥</Text>
            <Text className='amount'>{price || '--'}</Text>
          </View>
          <Text className='original'>¥{originalPrice || '--'}</Text>
          <Text className='sales'>月售{sales || 0}</Text>
        </View>

        <View className='info-card'>
          <Text className='product-title'>{product?.product_name || '马爹利VSOP 双人套餐'}</Text>
          {defaultDetailItems.map((item) => (
            <View className='info-row' key={item.label}>
              <Text className='info-label'>{item.label}</Text>
              <Text className='info-value'>{item.value}</Text>
            </View>
          ))}
        </View>

        <View className='detail-card'>
          <Text className='detail-title'>商品详情</Text>
          {packageLines.map((line, index) => (
            <View className='detail-row' key={`${line.name}-${index}`}>
              <Text className='detail-name'>{line.name}</Text>
              {line.price ? <Text className='detail-price'>{line.price}</Text> : null}
            </View>
          ))}
        </View>

        <View className='purchase-bar'>
          <View className='total-box'>
            <Text className='total-label'>合计</Text>
            <Text className='total-price'>¥{price || '--'}</Text>
          </View>
          {savePrice > 0 ? <Text className='save'>省{savePrice}</Text> : null}
          <View className='buy-now'>立即购买</View>
        </View>
      </View>
    </View>
  )
}
